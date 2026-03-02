import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { AuthUser } from "../auth/interfaces/auth-user.interface";
import { SendMessageDto } from "./dto/send-message.dto";

@Injectable()
export class MessagingService {
  constructor(private readonly prisma: PrismaService) {}

  async sendMessage(bookingId: string, payload: SendMessageDto, user: AuthUser) {
    await this.assertBookingAccess(bookingId, user);

    return this.prisma.message.create({
      data: {
        bookingId,
        senderId: user.userId,
        body: payload.body
      }
    });
  }

  async listMessages(bookingId: string, user: AuthUser) {
    await this.assertBookingAccess(bookingId, user);

    return this.prisma.message.findMany({
      where: { bookingId },
      include: {
        sender: {
          select: { id: true, email: true, role: true }
        }
      },
      orderBy: { createdAt: "asc" }
    });
  }

  private async assertBookingAccess(bookingId: string, user: AuthUser) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        provider: {
          select: { userId: true }
        }
      }
    });

    if (!booking) {
      throw new NotFoundException("booking_not_found");
    }

    if (user.role === "admin") {
      return;
    }

    if (user.role === "customer" && booking.customerId === user.userId) {
      return;
    }

    if (user.role === "provider" && booking.provider.userId === user.userId) {
      return;
    }

    throw new ForbiddenException("booking_access_forbidden");
  }
}
