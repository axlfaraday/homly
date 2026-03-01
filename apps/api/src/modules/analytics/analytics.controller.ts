import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthGuard } from "../auth/guards/auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
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
}
