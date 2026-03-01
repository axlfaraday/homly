import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsInt, IsString, Max, Min, ValidateNested } from "class-validator";

class SlotDto {
  @IsInt()
  @Min(0)
  @Max(6)
  weekday!: number;

  @IsString()
  startTime!: string;

  @IsString()
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
