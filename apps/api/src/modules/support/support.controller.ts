import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthGuard } from "../auth/guards/auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import type { AuthUser } from "../auth/interfaces/auth-user.interface";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { UpdateTicketStatusDto } from "./dto/update-ticket-status.dto";
import { SupportService } from "./support.service";

@Controller("support")
@UseGuards(AuthGuard, RolesGuard)
export class SupportController {
  constructor(private readonly service: SupportService) {}

  @Post("tickets")
  @Roles("customer", "admin")
  createTicket(@Body() payload: CreateTicketDto, @CurrentUser() user: AuthUser) {
    return this.service.createTicket(payload, user);
  }

  @Get("tickets/mine")
  @Roles("customer", "provider", "admin")
  listMine(@CurrentUser() user: AuthUser) {
    return this.service.listMine(user);
  }

  @Patch("tickets/:ticketId/status")
  @Roles("provider", "admin")
  updateStatus(
    @Param("ticketId") ticketId: string,
    @Body() payload: UpdateTicketStatusDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.service.updateStatus(ticketId, payload, user);
  }
}
