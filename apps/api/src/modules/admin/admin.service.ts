import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const [
      usersTotal,
      providersTotal,
      servicesTotal,
      bookingsTotal,
      bookingsByStatus,
      reviewsTotal,
      ticketsOpen
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.providerProfile.count(),
      this.prisma.marketplaceService.count(),
      this.prisma.booking.count(),
      this.prisma.booking.groupBy({
        by: ["status"],
        _count: { _all: true }
      }),
      this.prisma.review.count(),
      this.prisma.supportTicket.count({
        where: { status: { in: ["open", "in_progress"] } }
      })
    ]);

    const paymentsByStatus = await this.prisma.payment.groupBy({
      by: ["status"],
      _count: { _all: true }
    });

    const referralsByStatus = await this.prisma.referral.groupBy({
      by: ["status"],
      _count: { _all: true }
    });

    return {
      usersTotal,
      providersTotal,
      servicesTotal,
      bookingsTotal,
      bookingsByStatus,
      reviewsTotal,
      ticketsOpen,
      paymentsByStatus,
      referralsByStatus
    };
  }

  async listAlerts() {
    return this.prisma.opsAlert.findMany({
      orderBy: { createdAt: "desc" },
      take: 200
    });
  }

  async refreshAlerts() {
    const stalePending = await this.prisma.booking.findMany({
      where: {
        status: "pending",
        createdAt: {
          lt: new Date(Date.now() - 6 * 60 * 60 * 1000)
        }
      },
      take: 100
    });

    const unresolvedSupport = await this.prisma.supportTicket.findMany({
      where: {
        status: { in: ["open", "in_progress"] },
        createdAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      take: 100
    });

    for (const booking of stalePending) {
      await this.prisma.opsAlert.create({
        data: {
          bookingId: booking.id,
          type: "stale_pending_booking",
          severity: "high",
          message: `Booking ${booking.id} sigue pendiente por más de 6h`
        }
      });
    }

    for (const ticket of unresolvedSupport) {
      await this.prisma.opsAlert.create({
        data: {
          type: "stale_support_ticket",
          severity: "medium",
          message: `Ticket ${ticket.id} sin resolver por más de 24h`
        }
      });
    }

    return {
      createdAlerts: stalePending.length + unresolvedSupport.length
    };
  }

  async dispatchNudges() {
    const now = new Date();
    const queued = await this.prisma.lifecycleNudge.findMany({
      where: { status: "queued", scheduledAt: { lte: now } },
      take: 200
    });

    for (const nudge of queued) {
      await this.prisma.lifecycleNudge.update({
        where: { id: nudge.id },
        data: { status: "sent", sentAt: now }
      });
    }

    return { dispatched: queued.length };
  }
}
