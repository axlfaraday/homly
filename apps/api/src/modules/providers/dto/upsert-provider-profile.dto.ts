import { Transform } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength
} from "class-validator";

export class UpsertProviderProfileDto {
  @IsString()
  userId!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsString()
  @MinLength(20)
  bio!: string;

  @IsString()
  city!: string;

  @IsArray()
  @ArrayMinSize(1)
  @Transform(({ value }: { value: unknown }) => (Array.isArray(value) ? value : []))
  coverage!: string[];

  @IsOptional()
  @IsIn(["pending", "approved", "rejected"])
  verificationStatus?: "pending" | "approved" | "rejected";

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  teamSize?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  travelBufferMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  serviceRadiusKm?: number;
}
