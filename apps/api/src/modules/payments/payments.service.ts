import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { AuthUser } from "../auth/interfaces/auth-user.interface";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateCheckoutDto } from "./dto/create-checkout.dto";
import { RefundPaymentDto } from "./dto/refund-payment.dto";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  async createCheckout(payload: CreateCheckoutDto, user: AuthUser) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: payload.bookingId },
      include: {
        service: true,
        provider: { select: { userId: true } }
      }
    });
    if (!booking) {
      throw new NotFoundException("booking_not_found");
    }

    this.assertCanAccessPayment(user, booking.customerId, booking.provider.userId);
    const amount = payload.amountOverride ?? booking.service.basePrice;
    const platformFeeAmount = Math.round(amount * 0.15);
    const providerPayoutAmount = amount - platformFeeAmount;

    return this.prisma.payment.upsert({
      where: { bookingId: booking.id },
      update: {
        amount,
        platformFeeAmount,
        providerPayoutAmount,
        status: "requires_confirmation",
        mockReference: `mock_${booking.id.slice(0, 8)}_${Date.now()}`
      },
      create: {
        bookingId: booking.id,
        amount,
        platformFeeAmount,
        providerPayoutAmount,
        status: "requires_confirmation",
        mockReference: `mock_${booking.id.slice(0, 8)}_${Date.now()}`
      }
    });
  }

  async confirmPayment(bookingId: string, user: AuthUser) {
    const payment = await this.prisma.payment.findUnique({
      where: { bookingId },
      include: {
        booking: { include: { provider: { select: { userId: true } } } }
      }
    });
    if (!payment) {
      throw new NotFoundException("payment_not_found");
    }

    this.assertCanAccessPayment(user, payment.booking.customerId, payment.booking.provider.userId);
    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "held_in_escrow",
        paidAt: new Date()
      }
    });

    await this.pushNotificationSafe(
      payment.booking.provider.userId,
      "payment_confirmed",
      `El pago de la reserva ${bookingId.slice(0, 8)} fue confirmado y quedó en escrow.`,
      {
        bookingId,
        status: updated.status
      }
    );

    return updated;
  }

  async releasePayout(bookingId: string, user: AuthUser) {
    const payment = await this.prisma.payment.findUnique({
      where: { bookingId },
      include: {
        booking: { include: { provider: { select: { userId: true } } } }
      }
    });
    if (!payment) {
      throw new NotFoundException("payment_not_found");
    }

    if (user.role !== "admin" && payment.booking.provider.userId !== user.userId) {
      throw new ForbiddenException("only_provider_or_admin_can_release_payout");
    }

    if (payment.status !== "held_in_escrow") {
      throw new BadRequestException("payment_not_in_escrow");
    }

    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "released",
        releasedAt: new Date()
      }
    });

    await this.pushNotificationSafe(
      payment.booking.customerId,
      "payment_released",
      `El pago de la reserva ${bookingId.slice(0, 8)} fue liberado al proveedor.`,
      {
        bookingId,
        status: updated.status
      }
    );

    return updated;
  }

  async refund(bookingId: string, payload: RefundPaymentDto, user: AuthUser) {
    const payment = await this.prisma.payment.findUnique({
      where: { bookingId },
      include: {
        booking: { include: { provider: { select: { userId: true } } } }
      }
    });
    if (!payment) {
      throw new NotFoundException("payment_not_found");
    }

    this.assertCanAccessPayment(user, payment.booking.customerId, payment.booking.provider.userId);

    const amount = payload.amount ?? payment.amount;
    if (amount > payment.amount) {
      throw new BadRequestException("refund_amount_exceeds_payment");
    }

    const refund = await this.prisma.refund.create({
      data: {
        paymentId: payment.id,
        amount,
        reason: payload.reason,
        status: "processed",
        processedAt: new Date()
      }
    });

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: "refunded" }
    });

    await this.pushNotificationSafe(
      payment.booking.customerId,
      "payment_refunded",
      `Se procesó un reembolso para la reserva ${bookingId.slice(0, 8)}.`,
      {
        bookingId,
        amount
      }
    );

    await this.pushNotificationSafe(
      payment.booking.provider.userId,
      "payment_refunded",
      `Se procesó un reembolso para la reserva ${bookingId.slice(0, 8)}.`,
      {
        bookingId,
        amount
      }
    );

    return refund;
  }

  async getByBooking(bookingId: string, user: AuthUser) {
    const payment = await this.prisma.payment.findUnique({
      where: { bookingId },
      include: {
        refunds: true,
        booking: { include: { provider: { select: { userId: true } } } }
      }
    });
    if (!payment) {
      throw new NotFoundException("payment_not_found");
    }

    this.assertCanAccessPayment(user, payment.booking.customerId, payment.booking.provider.userId);
    return payment;
  }

  private assertCanAccessPayment(user: AuthUser, customerId: string, providerUserId: string) {
    if (user.role === "admin") {
      return;
    }

    if (user.role === "customer" && customerId === user.userId) {
      return;
    }

    if (user.role === "provider" && providerUserId === user.userId) {
      return;
    }

    throw new ForbiddenException("payment_access_forbidden");
  }

  private async pushNotificationSafe(
    userId: string,
    kind: string,
    message: string,
    payload: Record<string, string | number | boolean | null>
  ) {
    try {
      await this.notifications.notifyInApp(userId, kind, {
        message,
        ...payload
      });
    } catch {
      // Non-blocking notification publishing.
    }
  }
}
