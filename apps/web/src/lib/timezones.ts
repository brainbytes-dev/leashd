// Worldwide IANA timezone list. Uses the runtime's full Intl tz database, with
// a comprehensive fixed fallback so a reduced-ICU runtime still renders real
// worldwide coverage (and stays identical across server/client for hydration).

const FALLBACK_TZ = [
  "UTC",
  "America/Anchorage", "America/Los_Angeles", "America/Denver", "America/Chicago",
  "America/New_York", "America/Toronto", "America/Mexico_City", "America/Bogota",
  "America/Lima", "America/Sao_Paulo", "America/Argentina/Buenos_Aires",
  "Atlantic/Reykjavik", "Europe/London", "Europe/Lisbon", "Europe/Madrid",
  "Europe/Paris", "Europe/Berlin", "Europe/Zurich", "Europe/Rome",
  "Europe/Amsterdam", "Europe/Stockholm", "Europe/Warsaw", "Europe/Athens",
  "Europe/Helsinki", "Europe/Kyiv", "Europe/Istanbul", "Europe/Moscow",
  "Africa/Casablanca", "Africa/Lagos", "Africa/Johannesburg", "Africa/Nairobi",
  "Africa/Cairo", "Asia/Jerusalem", "Asia/Riyadh", "Asia/Dubai",
  "Asia/Tehran", "Asia/Karachi", "Asia/Kolkata", "Asia/Dhaka",
  "Asia/Bangkok", "Asia/Jakarta", "Asia/Shanghai", "Asia/Hong_Kong",
  "Asia/Singapore", "Asia/Taipei", "Asia/Tokyo", "Asia/Seoul",
  "Australia/Perth", "Australia/Sydney", "Pacific/Auckland", "Pacific/Honolulu",
];

function compute(): string[] {
  let list: string[] = FALLBACK_TZ;
  try {
    const fn = (Intl as { supportedValuesOf?: (k: string) => string[] })
      .supportedValuesOf;
    const runtime = fn ? fn("timeZone") : [];
    if (runtime.length > FALLBACK_TZ.length) list = runtime;
  } catch {
    /* fall through */
  }
  // supportedValuesOf exposes "Etc/UTC", not plain "UTC". Guarantee "UTC" is
  // always present and first so it stays selectable after any other pick.
  return ["UTC", ...list.filter((z) => z !== "UTC")];
}

export const TIMEZONES = compute();

/** Current UTC offset for a zone, e.g. "UTC+01:00". DST-aware (at render time). */
function offsetLabel(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "longOffset",
    }).formatToParts(new Date());
    const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
    return name.replace("GMT", "UTC");
  } catch {
    return "";
  }
}

/** Option label: zone id plus its current offset, e.g. "Europe/Zurich (UTC+01:00)". */
export function tzLabel(tz: string): string {
  if (tz === "UTC") return "UTC";
  const o = offsetLabel(tz);
  return o && o !== tz ? `${tz} (${o})` : tz;
}

/** Precomputed once (offset formatting is not free); render these directly. */
export const TZ_OPTIONS: { value: string; label: string }[] = TIMEZONES.map(
  (tz) => ({ value: tz, label: tzLabel(tz) })
);

export function browserTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function isValidTz(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
