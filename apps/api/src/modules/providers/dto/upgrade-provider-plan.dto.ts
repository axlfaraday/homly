import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";
import type { ProviderPlan } from "@prisma/client";

export class UpgradeProviderPlanDto {
  @IsIn(["free", "pro", "elite"])
  plan!: ProviderPlan;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  featuredDays?: number;
}
