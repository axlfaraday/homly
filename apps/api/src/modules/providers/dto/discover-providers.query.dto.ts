import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from "class-validator";

export class DiscoverProvidersQueryDto {
  @IsOptional()
  city?: string;

  @IsOptional()
  service?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === "true" || value === true)
  @IsBoolean()
  verifiedOnly?: boolean;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(5)
  minRating?: number;

  @IsOptional()
  @IsIn(["newest", "top-rated"])
  sortBy?: "newest" | "top-rated";

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === "true" || value === true)
  @IsBoolean()
  featuredFirst?: boolean;
}
