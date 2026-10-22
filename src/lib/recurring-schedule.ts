/** Coaching schedules use Belgian wall-clock time, independently of server TZ. */
const zone = "Europe/Brussels";
export type RecurringScheduleMode = "weekly" | "biweekly" | "monthly" | "custom";
export type RecurringSchedule = {
  scheduleMode?: RecurringScheduleMode;
  dayOfWeek?: number;
  startTime: string;
  startDate: Date;
  endDate: Date;
  customDates?: Date[];
};
function dateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
export function brusselsDateTime(date: string, time = "00:00"): Date {
  const desired = Date.parse(`${date}T${time}:00Z`);
  let value = desired;
  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value));
    const get = (key: string) => parts.find(p => p.type === key)!.value;
    const represented = Date.parse(`${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}Z`);
    value += desired - represented;
  }
  return new Date(value);
}
export function getRecurringStarts(input: RecurringSchedule): Date[] {
  const start = new Date(`${dateKey(input.startDate)}T00:00:00Z`);
  const end = new Date(`${dateKey(input.endDate)}T00:00:00Z`);
  const dates: Date[] = [];
  const mode = input.scheduleMode ?? "weekly";
  if (mode === "custom") {
    for (const key of Array.from(new Set((input.customDates ?? []).map(dateKey))).sort()) {
      const date = new Date(`${key}T00:00:00Z`);
      if (date >= start && date <= end) dates.push(date);
    }
  } else if (mode === "monthly") {
    for (let offset = 0; ; offset++) {
      const month = start.getUTCMonth() + offset;
      const lastDay = new Date(Date.UTC(start.getUTCFullYear(), month + 1, 0)).getUTCDate();
      const date = new Date(Date.UTC(start.getUTCFullYear(), month, Math.min(start.getUTCDate(), lastDay)));
      if (date > end) break;
      dates.push(date);
    }
  } else {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + ((input.dayOfWeek ?? date.getUTCDay()) - date.getUTCDay() + 7) % 7);
    for (; date <= end; date.setUTCDate(date.getUTCDate() + (mode === "biweekly" ? 14 : 7))) dates.push(new Date(date));
  }
  return dates.map(date => brusselsDateTime(date.toISOString().slice(0, 10), input.startTime));
}
