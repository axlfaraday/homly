import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type { SupportTicketStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type { AuthUser } from "../auth/interfaces/auth-user.interface";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { UpdateTicketStatusDto } from "./dto/update-ticket-status.dto";

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async createTicket(payload: CreateTicketDto, user: AuthUser) {
    if (user.role !== "customer" && user.role !== "admin") {
      throw new ForbiddenException("only_customer_or_admin_can_create_ticket");
    }

    let providerId: string | null = null;
    let customerId = user.userId;

    if (payload.bookingId) {
      const booking = await this.prisma.booking.findUnique({
        where: { id: payload.bookingId }
      });
      if (!booking) {
        throw new NotFoundException("booking_not_found");
      }

      if (user.role === "customer" && booking.customerId !== user.userId) {
        throw new ForbiddenException("customer_can_only_open_ticket_for_own_booking");
      }

      customerId = booking.customerId;
      providerId = booking.providerId;
    } else if (user.role === "customer") {
      const latestBooking = await this.prisma.booking.findFirst({
        where: { customerId: user.userId },
        orderBy: { createdAt: "desc" },
        select: { providerId: true }
      });
      providerId = latestBooking?.providerId ?? null;
    }

    return this.prisma.supportTicket.create({
      data: {
        bookingId: payload.bookingId,
        customerId,
        providerId,
        subject: payload.subject,
        description: payload.description
      }
    });
  }

  async listMine(user: AuthUser) {
    if (user.role === "admin") {
      return this.prisma.supportTicket.findMany({
        orderBy: { createdAt: "desc" },
        take: 200
      });
    }

    if (user.role === "provider") {
      const providerProfile = await this.prisma.providerProfile.findUnique({
        where: { userId: user.userId },
        select: { id: true }
      });
      if (!providerProfile) {
        throw new ForbiddenException("provider_profile_required");
      }

      return this.prisma.supportTicket.findMany({
        where: { providerId: providerProfile.id },
        orderBy: { createdAt: "desc" }
      });
    }

    return this.prisma.supportTicket.findMany({
      where: { customerId: user.userId },
      orderBy: { createdAt: "desc" }
    });
  }

  async updateStatus(ticketId: string, payload: UpdateTicketStatusDto, user: AuthUser) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { provider: { select: { userId: true } } }
    });
    if (!ticket) {
      throw new NotFoundException("support_ticket_not_found");
    }

    this.assertCanUpdateStatus(user, ticket.provider?.userId, payload.status);
    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: payload.status,
        resolutionNote:
          payload.status === "resolved"
            ? payload.resolutionNote ?? ticket.resolutionNote
            : ticket.resolutionNote
      }
    });
  }

  private assertCanUpdateStatus(
    user: AuthUser,
    providerUserId: string | undefined,
    nextStatus: SupportTicketStatus
  ) {
    if (user.role === "admin") {
      return;
    }

    if (user.role !== "provider") {
      throw new ForbiddenException("only_provider_or_admin_can_update_ticket_status");
    }

    if (!providerUserId || providerUserId !== user.userId) {
      throw new ForbiddenException("provider_can_only_manage_own_tickets");
    }

    if (nextStatus === "open") {
      throw new BadRequestException("provider_cannot_reopen_ticket");
    }
  }
}
