import { describe, expect, it } from "vitest";
import { formatIST, formatISTDate, istDay, istDayRange, istHour } from "@/src/lib/ist";

describe("IST helpers", () => {
  // 20:26 UTC on 23 Oct = 01:56 IST on 24 Oct
  const lateNightUtc = new Date("2026-10-23T20:26:00.000Z");

  it("puts a moment on its IST calendar day", () => {
    expect(istDay(lateNightUtc)).toBe("2026-10-24");
    expect(istDay(new Date("2026-10-23T18:29:59.999Z"))).toBe("2026-10-23");
    expect(istDay(new Date("2026-10-23T18:30:00.000Z"))).toBe("2026-10-24");
  });

  it("builds a range from IST midnight to IST midnight", () => {
    const range = istDayRange("2026-10-24");
    expect(range.gte.toISOString()).toBe("2026-10-23T18:30:00.000Z");
    expect(range.lt.toISOString()).toBe("2026-10-24T18:30:00.000Z");
    expect(lateNightUtc >= range.gte && lateNightUtc < range.lt).toBe(true);
  });

  it("covers several days inclusive", () => {
    const range = istDayRange("2026-10-01", "2026-10-31");
    expect(range.gte.toISOString()).toBe("2026-09-30T18:30:00.000Z");
    expect(range.lt.toISOString()).toBe("2026-10-31T18:30:00.000Z");
  });

  it("formats in IST whatever the machine's timezone", () => {
    expect(formatISTDate(lateNightUtc)).toBe("24/10/2026");
    expect(formatIST(lateNightUtc)).toMatch(/^24\/10\/2026, 01:56 am$/i);
    expect(istHour(lateNightUtc)).toBe(1);
  });
});
