import { IsArray, IsOptional, IsString } from "class-validator";

export class AddEvidenceDto {
  @IsOptional()
  @IsArray()
  photoUrls?: string[];

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  geo?: string;
}
