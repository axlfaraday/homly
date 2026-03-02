import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type { BookingStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type { AuthUser } from "../auth/interfaces/auth-user.interface";
import { NotificationsService } from "../notifications/notifications.service";
import { AddEvidenceDto } from "./dto/add-evidence.dto";
import { CreateBookingDto } from "./dto/create-booking.dto";
import { CreateBookingPlanDto } from "./dto/create-booking-plan.dto";
import { UpdateBookingStatusDto } from "./dto/update-booking-status.dto";

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  async create(payload: CreateBookingDto, user: AuthUser) {
    const service = await this.prisma.marketplaceService.findUnique({
      where: { id: payload.serviceId },
      include: { provider: true }
    });
    if (!service || !service.active) {
      throw new NotFoundException("service_not_found_or_inactive");
    }

    const customerId = this.resolveCustomerIdForCreate(user, payload.customerId);
    const scheduledAt = new Date(payload.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException("invalid_scheduled_at");
    }

    const booking = await this.prisma.booking.create({
      data: {
        customerId,
        providerId: service.providerId,
        serviceId: service.id,
        scheduledAt,
        notes: payload.notes,
        cancelWindowHours: 12,
        cancellationFeePct: 20
      }
    });

    await this.pushNotificationSafe(
      service.provider.userId,
      "booking_created",
      `Nueva reserva ${booking.id.slice(0, 8)} para ${scheduledAt.toLocaleString()}.`,
      {
        bookingId: booking.id,
        status: booking.status,
        serviceId: booking.serviceId
      }
    );

    return booking;
  }

  async listMine(user: AuthUser) {
    if (user.role === "customer") {
      return this.prisma.booking.findMany({
        where: { customerId: user.userId },
        include: {
          service: {
            select: {
              id: true,
              title: true,
              slug: true,
              basePrice: true,
              durationMinutes: true
            }
          },
          provider: {
            select: {
              id: true,
              fullName: true,
              city: true,
              verificationStatus: true,
              responseRate: true,
              punctualityRate: true,
              completionRate: true
            }
          }
        },
        orderBy: { createdAt: "desc" }
      });
    }

    if (user.role === "provider") {
      const ownProfile = await this.prisma.providerProfile.findUnique({
        where: { userId: user.userId },
        select: { id: true }
      });
      if (!ownProfile) {
        throw new ForbiddenException("provider_profile_required");
      }

      return this.prisma.booking.findMany({
        where: { providerId: ownProfile.id },
        include: {
          service: {
            select: {
              id: true,
              title: true,
              slug: true,
              basePrice: true,
              durationMinutes: true
            }
          },
          customer: {
            select: {
              id: true,
              email: true
            }
          }
        },
        orderBy: { scheduledAt: "asc" }
      });
    }

    return this.prisma.booking.findMany({
      include: {
        service: {
          select: {
            id: true,
            title: true,
            slug: true,
            basePrice: true,
            durationMinutes: true
          }
        },
        provider: {
          select: {
            id: true,
            fullName: true,
            city: true,
            verificationStatus: true
          }
        },
        customer: {
          select: {
            id: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 200
    });
  }

  async updateStatus(bookingId: string, payload: UpdateBookingStatusDto, user: AuthUser) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { provider: { select: { userId: true } } }
    });
    if (!booking) {
      throw new NotFoundException("booking_not_found");
    }

    this.assertCanUpdateStatus(user, booking.customerId, booking.provider.userId, payload.status);
    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: payload.status }
    });

    if (payload.status === "completed") {
      await this.prisma.referral.updateMany({
        where: { refereeId: booking.customerId, status: "signed_up" },
        data: { status: "qualified", rewardCents: 1000 }
      });

      const completionRate = await this.computeCompletionRate(booking.providerId);
      await this.prisma.providerProfile.update({
        where: { id: booking.providerId },
        data: { completionRate }
      });

      await this.prisma.lifecycleNudge.createMany({
        data: [
          {
            userId: booking.customerId,
            kind: "review_request",
            channel: "in_app",
            payload: {
              bookingId: booking.id,
              message: "Tu reserva fue completada. Déjanos una reseña para cerrar el ciclo."
            },
            scheduledAt: new Date(Date.now() + 10 * 60 * 1000)
          },
          {
            userId: booking.customerId,
            kind: "recurrence_offer",
            channel: "email",
            payload: {
              bookingId: booking.id,
              message: "¿Quieres repetir este servicio? Te ayudamos a programarlo."
            },
            scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
          }
        ]
      });
    }

    if (user.role === "provider" || user.role === "admin") {
      await this.pushNotificationSafe(
        booking.customerId,
        "booking_status_updated",
        `Tu reserva ${booking.id.slice(0, 8)} cambió a ${payload.status}.`,
        {
          bookingId: booking.id,
          status: payload.status
        }
      );
    }

    if (user.role === "customer" || user.role === "admin") {
      await this.pushNotificationSafe(
        booking.provider.userId,
        "booking_status_updated",
        `La reserva ${booking.id.slice(0, 8)} cambió a ${payload.status}.`,
        {
          bookingId: booking.id,
          status: payload.status
        }
      );
    }

    return updated;
  }

  async markCheckIn(bookingId: string, user: AuthUser) {
    const booking = await this.getBookingForProviderAction(bookingId, user);
    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: { checkInAt: new Date() }
    });

    await this.pushNotificationSafe(
      booking.customerId,
      "booking_check_in",
      `El proveedor registró check-in para tu reserva ${booking.id.slice(0, 8)}.`,
      {
        bookingId: booking.id
      }
    );

    return updated;
  }

  async markCheckOut(bookingId: string, user: AuthUser) {
    const booking = await this.getBookingForProviderAction(bookingId, user);
    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: { checkOutAt: new Date(), status: "completed" }
    });

    await this.pushNotificationSafe(
      booking.customerId,
      "booking_check_out",
      `El servicio de la reserva ${booking.id.slice(0, 8)} fue marcado como finalizado.`,
      {
        bookingId: booking.id,
        status: "completed"
      }
    );

    return updated;
  }

  async addEvidence(bookingId: string, payload: AddEvidenceDto, user: AuthUser) {
    const booking = await this.getBookingForProviderAction(bookingId, user);
    const current = (booking.completionEvidence as Record<string, unknown> | null) ?? {};
    const next = {
      ...current,
      photoUrls: payload.photoUrls ?? current.photoUrls ?? [],
      note: payload.note ?? current.note ?? null,
      geo: payload.geo ?? current.geo ?? null,
      updatedAt: new Date().toISOString()
    };

    return this.prisma.booking.update({
      where: { id: booking.id },
      data: { completionEvidence: next }
    });
  }

  async createPlan(payload: CreateBookingPlanDto, user: AuthUser) {
    if (user.role !== "customer" && user.role !== "admin") {
      throw new ForbiddenException("only_customer_or_admin");
    }

    const service = await this.prisma.marketplaceService.findUnique({
      where: { id: payload.serviceId }
    });
    if (!service) {
      throw new NotFoundException("service_not_found");
    }

    return this.prisma.bookingPlan.create({
      data: {
        customerId: user.userId,
        providerId: service.providerId,
        serviceId: service.id,
        frequency: payload.frequency,
        intervalWeeks: payload.frequency === "weekly" ? 1 : payload.frequency === "biweekly" ? 2 : 4,
        weekday: payload.weekday,
        startTime: payload.startTime,
        nextRunAt: this.computeNextRun(payload.weekday),
        active: true
      }
    });
  }

  async listMyPlans(user: AuthUser) {
    if (user.role === "admin") {
      return this.prisma.bookingPlan.findMany({
        include: {
          service: {
            select: {
              id: true,
              title: true,
              slug: true,
              basePrice: true,
              durationMinutes: true
            }
          },
          provider: {
            select: {
              id: true,
              fullName: true,
              city: true,
              verificationStatus: true
            }
          },
          customer: {
            select: {
              id: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 200
      });
    }

    if (user.role === "provider") {
      const profile = await this.prisma.providerProfile.findUnique({
        where: { userId: user.userId },
        select: { id: true }
      });
      if (!profile) {
        throw new ForbiddenException("provider_profile_required");
      }

      return this.prisma.bookingPlan.findMany({
        where: { providerId: profile.id },
        include: {
          service: {
            select: {
              id: true,
              title: true,
              slug: true,
              basePrice: true,
              durationMinutes: true
            }
          },
          customer: {
            select: {
              id: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: "desc" }
      });
    }

    return this.prisma.bookingPlan.findMany({
      where: { customerId: user.userId },
      include: {
        service: {
          select: {
            id: true,
            title: true,
            slug: true,
            basePrice: true,
            durationMinutes: true
          }
        },
        provider: {
          select: {
            id: true,
            fullName: true,
            city: true,
            verificationStatus: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async runPlan(planId: string, user: AuthUser) {
    const plan = await this.prisma.bookingPlan.findUnique({ where: { id: planId } });
    if (!plan || !plan.active) {
      throw new NotFoundException("booking_plan_not_found_or_inactive");
    }

    if (user.role !== "admin" && plan.customerId !== user.userId) {
      throw new ForbiddenException("can_only_run_own_plan");
    }

    const booking = await this.prisma.booking.create({
      data: {
        customerId: plan.customerId,
        providerId: plan.providerId,
        serviceId: plan.serviceId,
        scheduledAt: plan.nextRunAt,
        status: "pending",
        recurrencePlanId: plan.id,
        notes: "Generated from recurring plan"
      }
    });

    const days = Math.max(7, plan.intervalWeeks * 7);
    await this.prisma.bookingPlan.update({
      where: { id: plan.id },
      data: {
        totalRuns: { increment: 1 },
        nextRunAt: new Date(plan.nextRunAt.getTime() + days * 24 * 60 * 60 * 1000)
      }
    });

    return booking;
  }

  async getBookingRisk(bookingId: string, user: AuthUser) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        provider: {
          select: {
            userId: true,
            responseRate: true,
            punctualityRate: true,
            completionRate: true,
            noShowRate: true
          }
        }
      }
    });
    if (!booking) {
      throw new NotFoundException("booking_not_found");
    }

    this.assertCanViewBooking(user, booking.customerId, booking.provider.userId);
    const riskScore =
      (1 - booking.provider.responseRate) * 0.25 +
      (1 - booking.provider.punctualityRate) * 0.25 +
      (1 - booking.provider.completionRate) * 0.35 +
      booking.provider.noShowRate * 0.15;

    return {
      bookingId: booking.id,
      riskScore,
      level: riskScore > 0.5 ? "high" : riskScore > 0.25 ? "medium" : "low"
    };
  }

  private resolveCustomerIdForCreate(user: AuthUser, requestedCustomerId?: string) {
    if (user.role === "admin") {
      if (!requestedCustomerId) {
        throw new BadRequestException("customer_id_required_for_admin");
      }
      return requestedCustomerId;
    }

    if (user.role !== "customer") {
      throw new ForbiddenException("only_customer_can_create_booking");
    }

    return user.userId;
  }

  private assertCanUpdateStatus(
    user: AuthUser,
    customerId: string,
    providerUserId: string,
    nextStatus: BookingStatus
  ) {
    if (user.role === "admin") {
      return;
    }

    if (user.role === "provider") {
      if (providerUserId !== user.userId) {
        throw new ForbiddenException("provider_can_only_manage_own_bookings");
      }
      return;
    }

    if (user.role === "customer") {
      if (customerId !== user.userId) {
        throw new ForbiddenException("customer_can_only_manage_own_bookings");
      }
      if (nextStatus !== "cancelled") {
        throw new ForbiddenException("customer_can_only_cancel_booking");
      }
      return;
    }

    throw new ForbiddenException("insufficient_role");
  }

  private assertCanViewBooking(user: AuthUser, customerId: string, providerUserId: string) {
    if (user.role === "admin") {
      return;
    }

    if (user.role === "customer" && customerId === user.userId) {
      return;
    }

    if (user.role === "provider" && providerUserId === user.userId) {
      return;
    }

    throw new ForbiddenException("booking_access_forbidden");
  }

  private async getBookingForProviderAction(bookingId: string, user: AuthUser) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        provider: { select: { userId: true } }
      }
    });
    if (!booking) {
      throw new NotFoundException("booking_not_found");
    }

    if (user.role !== "admin" && booking.provider.userId !== user.userId) {
      throw new ForbiddenException("provider_can_only_manage_own_bookings");
    }

    return booking;
  }

  private computeNextRun(weekday: number) {
    const now = new Date();
    const current = now.getUTCDay();
    const delta = (weekday - current + 7) % 7 || 7;
    const next = new Date(now);
    next.setUTCDate(now.getUTCDate() + delta);
    return next;
  }

  private async computeCompletionRate(providerId: string) {
    const total = await this.prisma.booking.count({ where: { providerId } });
    if (total === 0) {
      return 1;
    }

    const completed = await this.prisma.booking.count({
      where: { providerId, status: "completed" }
    });
    return completed / total;
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
