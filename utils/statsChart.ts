import sharp from 'sharp';
import { Buffer } from 'node:buffer';

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
        <rect width="${WIDTH}" height="${HEIGHT}" fill="#111318"/>
        <rect x="24" y="24" width="1152" height="627" rx="16" fill="#181b22" stroke="#2b303b"/>
        <text x="64" y="78" fill="#f5f7fb" font-family="Arial, sans-serif" font-size="32" font-weight="700">${escapeXml(title)}</text>
        <text x="64" y="110" fill="#9da6b7" font-family="Arial, sans-serif" font-size="17">${escapeXml(subtitle)}</text>
        ${content}
    </svg>`;
}

async function renderCached(cacheKey: string, svg: string): Promise<Buffer> {
    const cached = chartCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.buffer;

    const pending = pendingRenders.get(cacheKey);
    if (pending) return pending;

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
        return buffer;
    } finally {
        pendingRenders.delete(cacheKey);
    }
}

export async function renderBarChart(
    title: string,
    subtitle: string,
    data: ChartDatum[],
    color = '#5865f2'
): Promise<Buffer> {
    const items = data.slice(0, 15);
    const maxValue = Math.max(...items.map(item => item.value), 1);
    const chartX = 300;
    const chartWidth = 810;
    const chartTop = 145;
    const rowHeight = Math.min(48, 450 / Math.max(items.length, 1));
    const barHeight = Math.max(14, rowHeight - 14);

    const rows = items.map((item, index) => {
        const y = chartTop + index * rowHeight;
        const width = Math.max(item.value > 0 ? 4 : 0, (item.value / maxValue) * chartWidth);
        return `
            <text x="275" y="${y + barHeight - 2}" text-anchor="end" fill="#d9deea" font-family="Arial, sans-serif" font-size="16">${escapeXml(item.label.slice(0, 24))}</text>
            <rect x="${chartX}" y="${y}" width="${chartWidth}" height="${barHeight}" rx="5" fill="#242936"/>
            <rect x="${chartX}" y="${y}" width="${width}" height="${barHeight}" rx="5" fill="${color}"/>
            <text x="${Math.min(chartX + width + 10, 1125)}" y="${y + barHeight - 2}" fill="#f5f7fb" font-family="Arial, sans-serif" font-size="15" font-weight="700">${escapeXml(formatNumber(item.value))}</text>`;
    }).join('');

    const empty = items.length === 0
        ? '<text x="600" y="340" text-anchor="middle" fill="#9da6b7" font-family="Arial, sans-serif" font-size="22">Aucune donnée disponible</text>'
        : '';
    const svg = baseSvg(title, subtitle, rows + empty);
    return renderCached(JSON.stringify(['bar', title, subtitle, items, color]), svg);
}

export async function renderLineChart(
    title: string,
    subtitle: string,
    labels: string[],
    series: ChartSeries[]
): Promise<Buffer> {
    const plot = { x: 95, y: 155, width: 1040, height: 410 };
    const allValues = series.flatMap(item => item.values);
    const maxValue = Math.max(...allValues, 1);
    const pointCount = Math.max(labels.length, ...series.map(item => item.values.length), 1);
    const xFor = (index: number) => plot.x + (index / Math.max(pointCount - 1, 1)) * plot.width;
    const yFor = (value: number) => plot.y + plot.height - (value / maxValue) * plot.height;

    const grid = Array.from({ length: 5 }, (_, index) => {
        const ratio = index / 4;
        const y = plot.y + ratio * plot.height;
        const value = Math.round(maxValue * (1 - ratio));
        return `<line x1="${plot.x}" y1="${y}" x2="${plot.x + plot.width}" y2="${y}" stroke="#303642" stroke-width="1"/>
            <text x="80" y="${y + 5}" text-anchor="end" fill="#8d96a7" font-family="Arial, sans-serif" font-size="14">${escapeXml(formatNumber(value))}</text>`;
    }).join('');

    const lines = series.map(item => {
        const points = item.values.map((value, index) => `${xFor(index)},${yFor(value)}`).join(' ');
        const dots = item.values.map((value, index) => `<circle cx="${xFor(index)}" cy="${yFor(value)}" r="3" fill="${item.color}"/>`).join('');
        return `<polyline points="${points}" fill="none" stroke="${item.color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${dots}`;
    }).join('');

    const labelStep = Math.max(1, Math.ceil(labels.length / 8));
    const xLabels = labels.map((label, index) => index % labelStep === 0 || index === labels.length - 1
        ? `<text x="${xFor(index)}" y="595" text-anchor="middle" fill="#8d96a7" font-family="Arial, sans-serif" font-size="14">${escapeXml(label)}</text>`
        : '').join('');
    const legend = series.map((item, index) => `<rect x="${95 + index * 210}" y="620" width="18" height="5" rx="2" fill="${item.color}"/>
        <text x="${122 + index * 210}" y="627" fill="#cbd1dc" font-family="Arial, sans-serif" font-size="15">${escapeXml(item.label)}</text>`).join('');

    const svg = baseSvg(title, subtitle, grid + lines + xLabels + legend);
    return renderCached(JSON.stringify(['line', title, subtitle, labels, series]), svg);
}
