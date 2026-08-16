// Calendar-date → working-day conversion for the manpower efficiency module.
// Scenario 3's original calculator (src/lib/planning.ts) works in calendar
// days off a day count and is untouched; this module works off a date range
// and must convert to working days before any arithmetic runs.

import { addDays, differenceInCalendarDays, isSameDay } from "date-fns";

export type WorkingDayConfig = {
  weeklyOff: string[]; // day names, e.g. ["Sunday"]
  holidays: Date[];
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function isWorkingDay(date: Date, config: WorkingDayConfig): boolean {
  const dayName = DAY_NAMES[date.getDay()];
  if (config.weeklyOff.includes(dayName)) return false;
  if (config.holidays.some((h) => isSameDay(h, date))) return false;
  return true;
}

export function calendarDaysBetween(start: Date, end: Date): number {
  return differenceInCalendarDays(end, start) + 1;
}

// Working days in [start, end], inclusive of both ends.
export function workingDaysBetween(start: Date, end: Date, config: WorkingDayConfig): number {
  let count = 0;
  let date = new Date(start);
  while (date <= end) {
    if (isWorkingDay(date, config)) count++;
    date = addDays(date, 1);
  }
  return count;
}

// The date that is `days` working days after `start` (start itself not counted).
export function addWorkingDays(start: Date, days: number, config: WorkingDayConfig): Date {
  let date = new Date(start);
  let counted = 0;
  while (counted < days) {
    date = addDays(date, 1);
    if (isWorkingDay(date, config)) counted++;
  }
  return date;
}
