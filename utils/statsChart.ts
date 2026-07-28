import sharp from 'sharp';
import { Buffer } from 'node:buffer';
import { logger } from './logger.ts';
import { KEPLER_CHART_COLORS, KEPLER_HEX } from './theme.ts';

export interface ChartDatum {
    label: string;
    value: number;
}

export interface ChartSeries {
    label: string;
    color: string;
    values: number[];
}

interface CacheEntry {
    buffer: Buffer;
    expiresAt: number;
}

const WIDTH = 1200;
const HEIGHT = 675;
const CACHE_TTL = 60_000;
const CACHE_LIMIT = 24;
const chartCache = new Map<string, CacheEntry>();
const pendingRenders = new Map<string, Promise<Buffer>>();
const XML_ENTITIES: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&apos;"
};

function escapeXml(value: string): string {
    return value.replace(/[&<>"']/g, character => XML_ENTITIES[character]);
}

function formatNumber(value: number): string {
    return new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function baseSvg(title: string, subtitle: string, content: string): string {
    return `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="kepler-bg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="${KEPLER_HEX.graphite}"/>
                <stop offset="1" stop-color="#0C1117"/>
            </linearGradient>
            <linearGradient id="kepler-panel" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="${KEPLER_HEX.panelRaised}"/>
                <stop offset="1" stop-color="${KEPLER_HEX.panel}"/>
            </linearGradient>
        </defs>
        <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#kepler-bg)"/>
        <circle cx="1055" cy="-10" r="170" fill="none" stroke="${KEPLER_HEX.border}" stroke-width="1" opacity="0.7"/>
        <ellipse cx="1055" cy="-10" rx="245" ry="92" fill="none" stroke="${KEPLER_HEX.deepBlue}" stroke-width="1" opacity="0.55" transform="rotate(-18 1055 -10)"/>
        <circle cx="1120" cy="67" r="6" fill="${KEPLER_HEX.success}"/>
        <circle cx="76" cy="38" r="2" fill="${KEPLER_HEX.signalBlue}" opacity="0.8"/>
        <circle cx="420" cy="52" r="1.5" fill="#ffffff" opacity="0.35"/>
        <circle cx="780" cy="32" r="2" fill="${KEPLER_HEX.orbitalBlue}" opacity="0.45"/>
        <rect x="24" y="24" width="1152" height="627" rx="18" fill="url(#kepler-panel)" stroke="${KEPLER_HEX.border}"/>
        <rect x="24" y="24" width="6" height="627" rx="3" fill="${KEPLER_HEX.orbitalBlue}"/>
        <text x="64" y="57" fill="${KEPLER_HEX.orbitalBlue}" font-family="DejaVu Sans, sans-serif" font-size="13" font-weight="700" letter-spacing="2">KEPLER • CENTRE DE CONTRÔLE</text>
        <text x="64" y="91" fill="${KEPLER_HEX.lunarWhite}" font-family="DejaVu Sans, sans-serif" font-size="30" font-weight="700">${escapeXml(title)}</text>
        <text x="64" y="119" fill="${KEPLER_HEX.silver}" font-family="DejaVu Sans, sans-serif" font-size="16">${escapeXml(subtitle)}</text>
        <g transform="translate(1100 74)">
            <circle r="23" fill="none" stroke="${KEPLER_HEX.deepBlue}" stroke-width="1.5"/>
            <ellipse rx="34" ry="12" fill="none" stroke="${KEPLER_HEX.orbitalBlue}" stroke-width="1.5" transform="rotate(-20)"/>
            <circle cx="29" cy="-8" r="4" fill="${KEPLER_HEX.success}"/>
            <circle r="5" fill="${KEPLER_HEX.lunarWhite}"/>
        </g>
        ${content}
    </svg>`;
}

async function renderCached(cacheKey: string, svg: string, chartName: string): Promise<Buffer> {
    const startedAt = performance.now();
    const cached = chartCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        logger.info(`Graphique "${chartName}" servi depuis le cache en ${(performance.now() - startedAt).toFixed(1)} ms`, undefined, 'StatsChart');
        return cached.buffer;
    }

    const pending = pendingRenders.get(cacheKey);
    if (pending) {
        const buffer = await pending;
        logger.info(`Graphique "${chartName}" partagé après ${(performance.now() - startedAt).toFixed(1)} ms`, undefined, 'StatsChart');
        return buffer;
    }

    const rendering = sharp(Buffer.from(svg))
        .webp({ quality: 88, effort: 3 })
        .toBuffer();
    pendingRenders.set(cacheKey, rendering);

    try {
        const buffer = await rendering;
        chartCache.set(cacheKey, { buffer, expiresAt: Date.now() + CACHE_TTL });
        while (chartCache.size > CACHE_LIMIT) {
            const oldestKey = chartCache.keys().next().value;
            if (!oldestKey) break;
            chartCache.delete(oldestKey);
        }
        logger.info(
            `Graphique "${chartName}" généré en ${(performance.now() - startedAt).toFixed(1)} ms (${(buffer.length / 1024).toFixed(1)} Ko)`,
            undefined,
            'StatsChart'
        );
        return buffer;
    } finally {
        pendingRenders.delete(cacheKey);
    }
}

export async function renderBarChart(
    title: string,
    subtitle: string,
    data: ChartDatum[],
    color = KEPLER_CHART_COLORS.messages
): Promise<Buffer> {
    const items = data.slice(0, 15);
    const maxValue = Math.max(...items.map(item => item.value), 1);
    const chartX = 300;
    const chartWidth = 750;
    const chartTop = 158;
    const rowHeight = Math.min(48, 450 / Math.max(items.length, 1));
    const barHeight = Math.max(14, rowHeight - 14);

    const rows = items.map((item, index) => {
        const y = chartTop + index * rowHeight;
        const width = Math.max(item.value > 0 ? 4 : 0, (item.value / maxValue) * chartWidth);
        return `
            <text x="66" y="${y + barHeight - 2}" fill="${KEPLER_HEX.muted}" font-family="DejaVu Sans, sans-serif" font-size="13" font-weight="700">${String(index + 1).padStart(2, '0')}</text>
            <text x="275" y="${y + barHeight - 2}" text-anchor="end" fill="${KEPLER_HEX.lunarWhite}" font-family="DejaVu Sans, sans-serif" font-size="16" font-weight="600">${escapeXml(item.label.slice(0, 24))}</text>
            <rect x="${chartX}" y="${y}" width="${chartWidth}" height="${barHeight}" rx="6" fill="${KEPLER_HEX.panelRaised}"/>
            <rect x="${chartX}" y="${y}" width="${width}" height="${barHeight}" rx="6" fill="${color}"/>
            <circle cx="${chartX + width}" cy="${y + barHeight / 2}" r="4" fill="${KEPLER_HEX.lunarWhite}"/>
            <text x="1125" y="${y + barHeight - 2}" text-anchor="end" fill="${KEPLER_HEX.lunarWhite}" font-family="DejaVu Sans, sans-serif" font-size="15" font-weight="700">${escapeXml(formatNumber(item.value))}</text>`;
    }).join('');

    const empty = items.length === 0
        ? `<text x="600" y="340" text-anchor="middle" fill="${KEPLER_HEX.silver}" font-family="DejaVu Sans, sans-serif" font-size="22">Aucune donnée disponible</text>`
        : '';
    const svg = baseSvg(title, subtitle, rows + empty);
    return renderCached(JSON.stringify(['bar', title, subtitle, items, color]), svg, title);
}

function sampleLineData(labels: string[], series: ChartSeries[], maxPoints = 120): { labels: string[]; series: ChartSeries[] } {
    if (labels.length <= maxPoints) return { labels, series };

    const indexes = Array.from({ length: maxPoints }, (_, index) =>
        Math.round(index * (labels.length - 1) / (maxPoints - 1))
    );
    return {
        labels: indexes.map(index => labels[index]),
        series: series.map(item => ({
            ...item,
            values: indexes.map(index => item.values[index] ?? 0)
        }))
    };
}

export async function renderLineChart(
    title: string,
    subtitle: string,
    labels: string[],
    series: ChartSeries[]
): Promise<Buffer> {
    const sampled = sampleLineData(labels, series);
    labels = sampled.labels;
    series = sampled.series;

    const plot = { x: 95, y: 160, width: 1040, height: 390 };

    const allValues = series.flatMap(item => item.values);
    const maxValue = Math.max(...allValues, 1);
    const pointCount = Math.max(labels.length, ...series.map(item => item.values.length), 1);
    const xFor = (index: number) => plot.x + (index / Math.max(pointCount - 1, 1)) * plot.width;
    const yFor = (value: number) => plot.y + plot.height - (value / maxValue) * plot.height;

    const grid = Array.from({ length: 5 }, (_, index) => {
        const ratio = index / 4;
        const y = plot.y + ratio * plot.height;
        const value = Math.round(maxValue * (1 - ratio));
        return `<line x1="${plot.x}" y1="${y}" x2="${plot.x + plot.width}" y2="${y}" stroke="${KEPLER_HEX.border}" stroke-dasharray="4 8" stroke-width="1"/>
            <text x="80" y="${y + 5}" text-anchor="end" fill="${KEPLER_HEX.muted}" font-family="DejaVu Sans, sans-serif" font-size="14">${escapeXml(formatNumber(value))}</text>`;
    }).join('');

    const lines = series.map(item => {
        const points = item.values.map((value, index) => `${xFor(index)},${yFor(value)}`).join(' ');
        const areaPoints = `${plot.x},${plot.y + plot.height} ${points} ${xFor(Math.max(item.values.length - 1, 0))},${plot.y + plot.height}`;
        const dots = item.values.map((value, index) => `<circle cx="${xFor(index)}" cy="${yFor(value)}" r="4" fill="${KEPLER_HEX.panel}" stroke="${item.color}" stroke-width="3"/>`).join('');
        return `<polygon points="${areaPoints}" fill="${item.color}" opacity="0.08"/>
            <polyline points="${points}" fill="none" stroke="${item.color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${dots}`;
    }).join('');

    const labelStep = Math.max(1, Math.ceil(labels.length / 8));
    const xLabels = labels.map((label, index) => index % labelStep === 0 || index === labels.length - 1
        ? `<text x="${xFor(index)}" y="595" text-anchor="middle" fill="${KEPLER_HEX.muted}" font-family="DejaVu Sans, sans-serif" font-size="14">${escapeXml(label)}</text>`
        : '').join('');
    const legend = series.map((item, index) => `<rect x="${95 + index * 210}" y="620" width="18" height="5" rx="2" fill="${item.color}"/>
        <text x="${122 + index * 210}" y="627" fill="${KEPLER_HEX.silver}" font-family="DejaVu Sans, sans-serif" font-size="15">${escapeXml(item.label)}</text>`).join('');

    const svg = baseSvg(title, subtitle, grid + lines + xLabels + legend);
    return renderCached(JSON.stringify(['line', title, subtitle, labels, series]), svg, title);
}
