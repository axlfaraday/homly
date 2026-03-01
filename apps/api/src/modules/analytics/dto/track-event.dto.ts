import { IsObject, IsOptional, IsString } from "class-validator";

export class TrackEventDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, string | number | boolean | null>;
}
