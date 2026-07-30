export const DEFAULT_TIMEZONE = 'Europe/Paris';

export const COMMON_TIMEZONES = [
    'Europe/Paris',
    'Europe/Brussels',
    'Europe/London',
    'Europe/Lisbon',
    'America/Montreal',
    'America/Toronto',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Indian/Reunion',
    'Pacific/Noumea'
] as const;

export interface ZonedDateParts {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
}

export function isValidTimezone(timezone: string): boolean {
    try {
        new Intl.DateTimeFormat('fr-FR', { timeZone: timezone }).format();
        return true;
    } catch {
        return false;
    }
}

export function getDatePartsInZone(date: Date, timezone: string): ZonedDateParts {
    const values = new Intl.DateTimeFormat('fr-FR', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
    }).formatToParts(date);
    const part = (type: string) =>
        Number(values.find(value => value.type === type)?.value);
    return {
        year: part('year'),
        month: part('month'),
        day: part('day'),
        hour: part('hour'),
        minute: part('minute')
    };
}

export function parseDateTimeInZone(value: string, timezone: string): Date | null {
    if (!isValidTimezone(timezone)) return null;
    const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
    if (!match) return null;

    const target: ZonedDateParts = {
        day: Number(match[1]),
        month: Number(match[2]),
        year: Number(match[3]),
        hour: Number(match[4]),
        minute: Number(match[5])
    };
    if (
        target.year < 2020 || target.year > 2100 ||
        target.month < 1 || target.month > 12 ||
        target.day < 1 || target.day > 31 ||
        target.hour > 23 || target.minute > 59
    ) return null;

    const targetAsUtc = Date.UTC(
        target.year,
        target.month - 1,
        target.day,
        target.hour,
        target.minute
    );
    let timestamp = targetAsUtc;
    for (let index = 0; index < 3; index++) {
        const displayed = getDatePartsInZone(new Date(timestamp), timezone);
        const displayedAsUtc = Date.UTC(
            displayed.year,
            displayed.month - 1,
            displayed.day,
            displayed.hour,
            displayed.minute
        );
        timestamp += targetAsUtc - displayedAsUtc;
    }

    const result = new Date(timestamp);
    const verified = getDatePartsInZone(result, timezone);
    return Object.keys(target).every(key =>
        verified[key as keyof ZonedDateParts] === target[key as keyof ZonedDateParts]
    ) ? result : null;
}

export function formatDateTimeInZone(value: string | Date, timezone: string): string {
    const parts = getDatePartsInZone(
        typeof value === 'string' ? new Date(value) : value,
        timezone
    );
    return [
        String(parts.day).padStart(2, '0'),
        String(parts.month).padStart(2, '0'),
        parts.year
    ].join('/') + ` ${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`;
}

export function dateKeyInZone(date: Date, timezone: string): string {
    const parts = getDatePartsInZone(date, timezone);
    return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}
