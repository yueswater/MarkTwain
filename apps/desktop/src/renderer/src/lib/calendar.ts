/** A calendar day without a time zone, month counts from 1. */
export type Day = { year: number; month: number; day: number };

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** The day of a YYYY-MM-DD text, null when it is not a real day. */
export function parseIso(text: string): Day | null {
  const match = ISO.exec(text.trim());
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? { year, month, day } : null;
}

export function formatIso({ year, month, day }: Day): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function addDays({ year, month, day }: Day, delta: number): Day {
  const date = new Date(Date.UTC(year, month - 1, day + delta));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

/** Moves by months and keeps the day inside the target month, so 31 Jan plus a month is 28 or 29 Feb. */
export function addMonths({ year, month, day }: Day, delta: number): Day {
  const index = year * 12 + (month - 1) + delta;
  const target = { year: Math.floor(index / 12), month: (index % 12 + 12) % 12 + 1 };
  return { ...target, day: Math.min(day, daysIn(target.year, target.month)) };
}

export function daysIn(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function sameDay(a: Day | null, b: Day | null): boolean {
  return a !== null && b !== null && a.year === b.year && a.month === b.month && a.day === b.day;
}

/** Today in the local time zone. */
export function today(now: Date = new Date()): Day {
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

/** The weeks of a month as rows of seven days, the first week starts with the weekday given, 0 for Sunday. */
export function monthGrid(year: number, month: number, firstWeekday = 0): { day: Day; inMonth: boolean }[][] {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const lead = (first - firstWeekday + 7) % 7;
  const weeks = Math.ceil((lead + daysIn(year, month)) / 7);
  const start = addDays({ year, month, day: 1 }, -lead);
  return Array.from({ length: weeks }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const day = addDays(start, week * 7 + weekday);
      return { day, inMonth: day.year === year && day.month === month };
    }),
  );
}
