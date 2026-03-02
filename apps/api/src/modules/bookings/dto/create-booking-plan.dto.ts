import { IsIn, IsInt, IsString, Max, Min } from "class-validator";

export class CreateBookingPlanDto {
  @IsString()
  serviceId!: string;

  @IsIn(["weekly", "biweekly", "monthly"])
  frequency!: "weekly" | "biweekly" | "monthly";

  @IsInt()
  @Min(0)
  @Max(6)
  weekday!: number;

  @IsString()
  startTime!: string;
}
