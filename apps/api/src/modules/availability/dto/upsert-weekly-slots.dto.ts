import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsInt, IsString, Matches, Max, Min, ValidateNested } from "class-validator";

const TIME_24H_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

class SlotDto {
  @IsInt()
  @Min(0)
  @Max(6)
  weekday!: number;

  @IsString()
  @Matches(TIME_24H_REGEX)
  startTime!: string;

  @IsString()
  @Matches(TIME_24H_REGEX)
  endTime!: string;
}

export class UpsertWeeklySlotsDto {
  @IsString()
  providerId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SlotDto)
  slots!: SlotDto[];
}
