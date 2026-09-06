// Events store `time` as a 24-hour "HH:MM" string (from an <input type="time">),
// which is what makes a precise countdown possible. Older events may still have
// a free-text time (e.g. "4:00 PM"). Those are parsed when possible so the
// Overview countdown remains precise without requiring old events to be edited.

const HHMM = /^([01]?\d|2[0-3]):([0-5]\d)$/;
const TWELVE_HOUR = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;

/** True if `time` is in the strict 24-hour "HH:MM" format this app now saves. */
export const isStructuredTime = (time: string | undefined | null): boolean => {
    return Boolean(time && HHMM.test(time.trim()));
};

/**
 * Parses both the current HH:MM format and common legacy 12-hour display times.
 * Returns [hours, minutes] in 24-hour form, or null when the value is unusable.
 */
const parseEventTime = (time: string | undefined | null): [number, number] | null => {
    if (!time) return null;

    const trimmed = time.trim();

    if (isStructuredTime(trimmed)) {
        const [hoursStr, minutesStr] = trimmed.split(':');
        return [Number(hoursStr), Number(minutesStr)];
    }

    const legacyMatch = trimmed.match(TWELVE_HOUR);
    if (!legacyMatch) return null;

    let hours = Number(legacyMatch[1]);
    const minutes = Number(legacyMatch[2]);
    const period = legacyMatch[3].toUpperCase();

    if (hours < 1 || hours > 12 || minutes > 59) return null;

    if (period === 'AM') {
        if (hours === 12) hours = 0;
    } else if (hours !== 12) {
        hours += 12;
    }

    return [hours, minutes];
};

/**
 * Combines an event's `date` (YYYY-MM-DD) and `time` into one local Date.
 * Returns null if either piece is missing/unparseable, so callers can fall
 * back to a date-only comparison for legacy events with unusable time text.
 */
export const combineEventDateTime = (date: string, time: string | undefined | null): Date | null => {
    if (!date) return null;

    const dateParts = date.trim().split('-').map(Number);
    if (
        dateParts.length !== 3 ||
        dateParts.some(part => !Number.isFinite(part))
    ) {
        return null;
    }

    const [year, month, day] = dateParts;
    const parsedTime = parseEventTime(time);
    if (!parsedTime) return null;

    const [hours, minutes] = parsedTime;
    const combined = new Date(year, month - 1, day, hours, minutes, 0, 0);

    return Number.isNaN(combined.getTime()) ? null : combined;
};

/** Formats a 24-hour "HH:MM" string as "4:00 PM" for display. Leaves legacy free-text times untouched. */
export const formatEventTime = (time: string | undefined | null): string => {
    if (!time) return '';
    if (!isStructuredTime(time)) return time;

    const [hoursStr, minutesStr] = time.trim().split(':');
    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 === 0 ? 12 : hours % 12;
    return `${displayHour}:${minutesStr.padStart(2, '0')} ${period}`;
};
