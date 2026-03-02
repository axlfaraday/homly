import { IsIn } from "class-validator";
import type { BookingStatus } from "@prisma/client";

export class UpdateBookingStatusDto {
  @IsIn(["pending", "confirmed", "completed", "cancelled"])
  status!: BookingStatus;
}
