import { describe, expect, it } from "vitest";
import { buildBookingPlanPayload } from "@/lib/retention-utils";

describe("retention utils", () => {
  it("builds a booking plan payload from a valid booking schedule", () => {
    expect(buildBookingPlanPayload("service_1", "2026-03-01T15:30:00.000Z", "weekly")).toEqual({
      serviceId: "service_1",
      frequency: "weekly",
      weekday: 0,
      startTime: "15:30"
    });
  });

  it("returns null for invalid schedule values", () => {
    expect(buildBookingPlanPayload("service_1", "not-a-date", "monthly")).toBeNull();
  });
});
