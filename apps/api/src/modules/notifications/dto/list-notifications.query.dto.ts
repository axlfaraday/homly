import { Transform } from "class-transformer";
import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";

export class ListNotificationsQueryDto {
  @IsOptional()
  @IsIn(["all", "unread", "read"])
  status?: "all" | "unread" | "read";

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
