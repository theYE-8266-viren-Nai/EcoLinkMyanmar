import type { PickupSchedule } from "@/features/recycling-routes/types";

const SCHEDULE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Yangon",
});

export function formatPickupSchedule(schedule: Pick<PickupSchedule, "startsAt" | "endsAt">) {
  const start = SCHEDULE_FORMATTER.format(new Date(schedule.startsAt));
  const endTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Yangon",
  }).format(new Date(schedule.endsAt));
  return `${start}–${endTime}`;
}

export function isSaturdayYangonSchedule(schedule: Pick<PickupSchedule, "startsAt" | "endsAt">) {
  const startParts = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    timeZone: "Asia/Yangon",
  }).formatToParts(new Date(schedule.startsAt));
  const endParts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    timeZone: "Asia/Yangon",
  }).formatToParts(new Date(schedule.endsAt));
  const part = (parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value;
  return part(startParts, "weekday") === "Sat"
    && part(startParts, "hour") === "08"
    && part(startParts, "minute") === "00"
    && part(endParts, "hour") === "11"
    && part(endParts, "minute") === "00";
}
