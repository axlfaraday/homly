import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateTicketDto {
  @IsOptional()
  @IsString()
  bookingId?: string;

  @IsString()
  @MinLength(5)
  @MaxLength(120)
  subject!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description!: string;
}
