/**
 * All safety-window times are anchored to Eastern Time, regardless of what
 * timezone the server runs in (Vercel defaults to UTC) or what timezone an
 * admin's/player's device is set to — the game is played in Princeton.
 * `America/New_York` handles the EST/EDT switch automatically.
 */
export const TIME_ZONE = "America/New_York";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: TIME_ZONE,
});
const timeFmt = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

function easternDateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** e.g. "Safety in effect Sat, Sep 13 · 12:00 PM – 2:00 PM ET" */
export function formatWindow(start: Date, end: Date): string {
  const sameDay = easternDateKey(start) === easternDateKey(end);
  return sameDay
    ? `${dateFmt.format(start)} · ${timeFmt.format(start)} – ${timeFmt.format(end)} ET`
    : `${dateFmt.format(start)} ${timeFmt.format(start)} – ${dateFmt.format(end)} ${timeFmt.format(end)} ET`;
}

export function formatDateTime(d: Date): string {
  return `${dateFmt.format(d)} · ${timeFmt.format(d)} ET`;
}

/** Value for a `datetime-local` input, expressed as Eastern Time wall-clock. */
export function toEasternInputValue(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/**
 * Inverse of `toEasternInputValue`: takes a `datetime-local` string that
 * represents a wall-clock time *in Eastern Time* and returns the absolute
 * instant (Date) it refers to — regardless of what timezone this code
 * happens to be running in (browser or server).
 *
 * Trick: read the naive string as if it were UTC (an arbitrary but valid
 * anchor instant), see what that instant reads as when formatted in Eastern
 * Time, and shift by the difference between the two. The Eastern reading is
 * turned back into a timestamp with `Date.UTC` (never `new Date(string)`),
 * so nothing here depends on the runtime's own local timezone.
 */
export function easternInputValueToDate(value: string): Date | null {
  if (!value) return null;
  const utcGuess = new Date(`${value}Z`);
  if (Number.isNaN(utcGuess.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(utcGuess);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");

  const easternReadingAsUtc = Date.UTC(
    get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"),
  );
  const diff = utcGuess.getTime() - easternReadingAsUtc;
  return new Date(utcGuess.getTime() + diff);
}
