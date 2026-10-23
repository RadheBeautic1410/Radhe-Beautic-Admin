// India time helpers. Times are stored as real UTC (`new Date()`); everything shown to
// users or grouped by day goes through these, so the result is IST on every device and
// on the server (Vercel runs in UTC even in the Mumbai region).
// Note: records saved before this change may hold "now + 5:30" and will read 5:30 late.

export const IST_TIME_ZONE = "Asia/Kolkata";
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

type DateInput = Date | string | number;

/** Date + time in IST, e.g. "23/10/2026, 08:26 pm" */
export const formatIST = (d: DateInput, opts: Intl.DateTimeFormatOptions = {}) =>
  new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    ...opts,
    timeZone: IST_TIME_ZONE,
  });

/** Date only in IST, e.g. "23/10/2026" */
export const formatISTDate = (d: DateInput, opts: Intl.DateTimeFormatOptions = {}) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...opts,
    timeZone: IST_TIME_ZONE,
  });

/** Time only in IST, e.g. "08:26 pm" */
export const formatISTTime = (d: DateInput, opts: Intl.DateTimeFormatOptions = {}) =>
  new Date(d).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    ...opts,
    timeZone: IST_TIME_ZONE,
  });

/** The IST calendar day of a moment, as "YYYY-MM-DD" */
export const istDay = (d: DateInput = new Date()) =>
  new Date(new Date(d).getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);

/** Today's IST calendar day, as "YYYY-MM-DD" */
export const istToday = () => istDay();

/** Real UTC instant of IST midnight at the start of `day` ("YYYY-MM-DD") */
export const istDayStart = (day: string) =>
  new Date(Date.parse(`${day}T00:00:00.000Z`) - IST_OFFSET_MS);

/** Prisma range covering IST days `from`..`to` (inclusive, "YYYY-MM-DD") */
export const istDayRange = (from: string, to: string = from) => ({
  gte: istDayStart(from),
  lt: new Date(istDayStart(to).getTime() + DAY_MS),
});

/** Hour of the day (0-23) in IST */
export const istHour = (d: DateInput = new Date()) =>
  new Date(new Date(d).getTime() + IST_OFFSET_MS).getUTCHours();
