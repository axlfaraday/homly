import { Controller, Get, UseGuards } from "@nestjs/common";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthGuard } from "../auth/guards/auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AdminService } from "./admin.service";

@Controller("admin")
@UseGuards(AuthGuard, RolesGuard)
@Roles("admin")
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get("dashboard")
  dashboard() {
    return this.service.getDashboard();
  }

  @Get("alerts")
  alerts() {
    return this.service.listAlerts();
  }

  @Get("alerts/refresh")
  refreshAlerts() {
    return this.service.refreshAlerts();
  }

  @Get("nudges/dispatch")
  dispatchNudges() {
    return this.service.dispatchNudges();
  }
}
