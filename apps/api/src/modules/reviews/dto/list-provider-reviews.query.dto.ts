import { Transform } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export class ListProviderReviewsQueryDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
