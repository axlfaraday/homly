import { Transform } from "class-transformer";
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  providerId?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(600)
  durationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  basePrice?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @Transform(({ value }: { value: unknown }) => (Array.isArray(value) ? value : []))
  extras?: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
