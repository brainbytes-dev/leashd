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
  try {
    const fn = (Intl as { supportedValuesOf?: (k: string) => string[] })
      .supportedValuesOf;
    const list = fn ? fn("timeZone") : [];
    if (list.length > FALLBACK_TZ.length) return list;
  } catch {
    /* fall through */
  }
  return FALLBACK_TZ;
}

export const TIMEZONES = compute();

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
