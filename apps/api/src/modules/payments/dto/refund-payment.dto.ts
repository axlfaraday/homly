import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class RefundPaymentDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;

  @IsString()
  reason!: string;
}
