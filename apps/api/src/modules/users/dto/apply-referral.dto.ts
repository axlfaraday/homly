import { IsString, MinLength } from "class-validator";

export class ApplyReferralDto {
  @IsString()
  @MinLength(4)
  referralCode!: string;
}
