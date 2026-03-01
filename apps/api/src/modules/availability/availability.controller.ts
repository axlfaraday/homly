import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthGuard } from "../auth/guards/auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import type { AuthUser } from "../auth/interfaces/auth-user.interface";
import { UpsertWeeklySlotsDto } from "./dto/upsert-weekly-slots.dto";
import { AvailabilityService } from "./availability.service";

@Controller("availability")
export class AvailabilityController {
  constructor(private readonly service: AvailabilityService) {}

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("provider", "admin")
  @Post("weekly")
  upsertWeekly(@Body() payload: UpsertWeeklySlotsDto, @CurrentUser() user: AuthUser) {
    return this.service.upsertWeeklySlots(payload, user);
  }

  @Get("provider/:providerId")
  listByProvider(@Param("providerId") providerId: string) {
    return this.service.listByProvider(providerId);
  }
}
