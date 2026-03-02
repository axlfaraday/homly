import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthGuard } from "../auth/guards/auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import type { AuthUser } from "../auth/interfaces/auth-user.interface";
import { AnalyticsService } from "./analytics.service";
import { TrackEventDto } from "./dto/track-event.dto";

@Controller("analytics/events")
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @UseGuards(AuthGuard)
  @Post()
  track(@Body() payload: TrackEventDto) {
    return this.service.track(payload.name, payload.payload);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Get()
  list(@Query("limit") limit?: string) {
    const parsed = Number(limit ?? "50");
    return this.service.list(Number.isNaN(parsed) ? 50 : parsed);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("provider", "admin")
  @Get("mine")
  listMine(@CurrentUser() user: AuthUser, @Query("limit") limit?: string) {
    const parsed = Number(limit ?? "500");
    return this.service.listMine(user, Number.isNaN(parsed) ? 500 : parsed);
  }
}
