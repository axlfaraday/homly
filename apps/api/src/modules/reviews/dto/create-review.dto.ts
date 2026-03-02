import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

export class CreateReviewDto {
  @IsString()
  bookingId!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  comment?: string;
}
