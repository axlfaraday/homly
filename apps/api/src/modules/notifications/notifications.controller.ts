import { Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthGuard } from "../auth/guards/auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import type { AuthUser } from "../auth/interfaces/auth-user.interface";
import { ListNotificationsQueryDto } from "./dto/list-notifications.query.dto";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
@UseGuards(AuthGuard, RolesGuard)
@Roles("customer", "provider", "admin")
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get("mine")
  listMine(@CurrentUser() user: AuthUser, @Query() query: ListNotificationsQueryDto) {
    return this.service.listMine(user, query);
  }

  @Get("unread-count")
  unreadCount(@CurrentUser() user: AuthUser) {
    return this.service.unreadCount(user);
  }

  @Patch("read-all")
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.service.markAllRead(user);
  }

  @Patch(":notificationId/read")
  markRead(@Param("notificationId") notificationId: string, @CurrentUser() user: AuthUser) {
    return this.service.markRead(notificationId, user);
  }
}
