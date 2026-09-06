// Events store `time` as a 24-hour "HH:MM" string (from an <input type="time">),
// which is what makes a precise countdown possible. Older events saved before
// this existed may still have a free-text time (e.g. "4:00 PM") — these helpers
// fall back gracefully to a date-only countdown for those instead of throwing.

const HHMM = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/** True if `time` is in the strict 24-hour "HH:MM" format this app now saves. */
export const isStructuredTime = (time: string | undefined | null): boolean => {
  return Boolean(time && HHMM.test(time.trim()));
};

/**
 * Combines an event's `date` (YYYY-MM-DD) and `time` (HH:MM) into one Date.
 * Returns null if either piece is missing/unparseable, so callers can fall
 * back to a date-only comparison for legacy events.
 */
export const combineEventDateTime = (date: string, time: string | undefined | null): Date | null => {
  if (!date) return null;
  const datePart = new Date(date);
  if (Number.isNaN(datePart.getTime())) return null;

  if (!isStructuredTime(time)) return null;

  const [hoursStr, minutesStr] = time!.trim().split(':');
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);

  const combined = new Date(datePart.getFullYear(), datePart.getMonth(), datePart.getDate(), hours, minutes, 0, 0);
  return combined;
};

/** Formats a 24-hour "HH:MM" string as "4:00 PM" for display. Leaves legacy free-text times untouched. */
export const formatEventTime = (time: string | undefined | null): string => {
  if (!time) return '';
  if (!isStructuredTime(time)) return time; // legacy free-text value, show as-is

  const [hoursStr, minutesStr] = time.trim().split(':');
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHour}:${minutesStr.padStart(2, '0')} ${period}`;
};
