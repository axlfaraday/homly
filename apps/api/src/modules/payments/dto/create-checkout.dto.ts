import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateCheckoutDto {
  @IsString()
  bookingId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  amountOverride?: number;
}
