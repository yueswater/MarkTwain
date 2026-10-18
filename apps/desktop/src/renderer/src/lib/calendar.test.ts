import { describe, expect, it } from "@jest/globals";
import { addDays, addMonths, daysIn, formatIso, monthGrid, parseIso, sameDay, today } from "./calendar";

describe("calendar", () => {
  it("reads only real days in YYYY-MM-DD", () => {
    expect(parseIso("2026-06-15")).toEqual({ year: 2026, month: 6, day: 15 });
    expect(parseIso(" 2024-02-29 ")).toEqual({ year: 2024, month: 2, day: 29 });
    for (const bad of ["", "2026-6-15", "2026-02-30", "2025-02-29", "2026-13-01", "abc"]) expect(parseIso(bad)).toBeNull();
  });

  it("writes a day with zeros in front", () => {
    expect(formatIso({ year: 2026, month: 6, day: 5 })).toBe("2026-06-05");
  });

  it("moves across the end of a month and a year", () => {
    expect(addDays({ year: 2026, month: 12, day: 31 }, 1)).toEqual({ year: 2027, month: 1, day: 1 });
    expect(addDays({ year: 2026, month: 3, day: 1 }, -1)).toEqual({ year: 2026, month: 2, day: 28 });
  });

  it("keeps the day inside a shorter month when it moves by months", () => {
    expect(addMonths({ year: 2026, month: 1, day: 31 }, 1)).toEqual({ year: 2026, month: 2, day: 28 });
    expect(addMonths({ year: 2024, month: 1, day: 31 }, 1)).toEqual({ year: 2024, month: 2, day: 29 });
    expect(addMonths({ year: 2026, month: 1, day: 15 }, -1)).toEqual({ year: 2025, month: 12, day: 15 });
    expect(addMonths({ year: 2026, month: 12, day: 15 }, 13)).toEqual({ year: 2028, month: 1, day: 15 });
  });

  it("counts the days of a month", () => {
    expect(daysIn(2026, 2)).toBe(28);
    expect(daysIn(2024, 2)).toBe(29);
    expect(daysIn(2026, 12)).toBe(31);
  });

  it("lays a month out in whole weeks that start with the chosen weekday", () => {
    // June 2026 starts on a Monday
    const sunday = monthGrid(2026, 6, 0);
    expect(sunday[0]?.[0]?.day).toEqual({ year: 2026, month: 5, day: 31 });
    expect(sunday[0]?.[1]?.day).toEqual({ year: 2026, month: 6, day: 1 });
    expect(sunday.every((week) => week.length === 7)).toBe(true);
    const monday = monthGrid(2026, 6, 1);
    expect(monday[0]?.[0]?.day).toEqual({ year: 2026, month: 6, day: 1 });
    expect(monday.flat().filter((cell) => cell.inMonth)).toHaveLength(30);
  });

  it("compares days and finds today", () => {
    expect(sameDay({ year: 2026, month: 6, day: 1 }, { year: 2026, month: 6, day: 1 })).toBe(true);
    expect(sameDay(null, null)).toBe(false);
    expect(today(new Date(2026, 5, 15))).toEqual({ year: 2026, month: 6, day: 15 });
  });
});
