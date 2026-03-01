import { IsEmail, IsIn, IsString, MinLength } from "class-validator";
import type { UserRole } from "@prisma/client";

export class SignupDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsIn(["customer", "provider", "admin"])
  role!: UserRole;
}
