import { Transform } from "class-transformer";
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateServiceDto {
  @IsString()
  providerId!: string;

  @IsString()
  slug!: string;

  @IsString()
  title!: string;

  @IsInt()
  @Min(30)
  @Max(600)
  durationMinutes!: number;

  @IsInt()
  @Min(0)
  basePrice!: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @Transform(({ value }: { value: unknown }) => (Array.isArray(value) ? value : []))
  extras?: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
