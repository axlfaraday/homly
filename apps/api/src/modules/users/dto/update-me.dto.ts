import { IsEmail, IsOptional } from "class-validator";

export class UpdateMeDto {
  @IsOptional()
  @IsEmail()
  email?: string;
}
