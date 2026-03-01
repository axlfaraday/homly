import { Transform } from "class-transformer";
import { ArrayMinSize, IsArray, IsIn, IsOptional, IsString, MinLength } from "class-validator";

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
}
