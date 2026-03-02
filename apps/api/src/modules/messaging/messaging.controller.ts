import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthGuard } from "../auth/guards/auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import type { AuthUser } from "../auth/interfaces/auth-user.interface";
import { SendMessageDto } from "./dto/send-message.dto";
import { MessagingService } from "./messaging.service";

@Controller("messaging")
@UseGuards(AuthGuard, RolesGuard)
@Roles("customer", "provider", "admin")
export class MessagingController {
  constructor(private readonly service: MessagingService) {}

  @Get("bookings/:bookingId/messages")
  listMessages(@Param("bookingId") bookingId: string, @CurrentUser() user: AuthUser) {
    return this.service.listMessages(bookingId, user);
  }

  @Post("bookings/:bookingId/messages")
  sendMessage(
    @Param("bookingId") bookingId: string,
    @Body() payload: SendMessageDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.service.sendMessage(bookingId, payload, user);
  }
}
