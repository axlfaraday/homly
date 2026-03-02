import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import type { SupportTicketStatus } from "@prisma/client";

export class UpdateTicketStatusDto {
  @IsIn(["open", "in_progress", "resolved"])
  status!: SupportTicketStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  resolutionNote?: string;
}
