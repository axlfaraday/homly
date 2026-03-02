import { IsString, MaxLength, MinLength } from "class-validator";

export class ReplyReviewDto {
  @IsString()
  @MinLength(3)
  @MaxLength(600)
  reply!: string;
}
