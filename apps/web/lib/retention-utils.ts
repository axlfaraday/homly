export type BookingPlanFrequency = "weekly" | "biweekly" | "monthly";

export interface BookingPlanPayload {
  serviceId: string;
  frequency: BookingPlanFrequency;
  weekday: number;
  startTime: string;
}

function toTwoDigits(value: number) {
  return value.toString().padStart(2, "0");
}

export function buildBookingPlanPayload(
  serviceId: string,
  scheduledAt: string,
  frequency: BookingPlanFrequency
): BookingPlanPayload | null {
  const parsedDate = new Date(scheduledAt);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return {
    serviceId,
    frequency,
    weekday: parsedDate.getUTCDay(),
    startTime: `${toTwoDigits(parsedDate.getUTCHours())}:${toTwoDigits(parsedDate.getUTCMinutes())}`
  };
}
