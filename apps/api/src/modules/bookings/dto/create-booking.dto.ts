import { IsDateString, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateBookingDto {
  @IsString()
  serviceId!: string;

  @IsDateString()
  scheduledAt!: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
