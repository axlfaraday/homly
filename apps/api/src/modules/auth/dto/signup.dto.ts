import { IsEmail, IsIn, IsOptional, IsString, MinLength } from "class-validator";
import type { UserRole } from "@prisma/client";

export class SignupDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsIn(["customer", "provider"])
  role!: UserRole;

  @IsOptional()
  @IsString()
  referralCode?: string;
}
