import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { AuthUser } from "../auth/interfaces/auth-user.interface";
import { ListNotificationsQueryDto } from "./dto/list-notifications.query.dto";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listMine(user: AuthUser, query: ListNotificationsQueryDto) {
    const status = query.status ?? "all";
    const limit = query.limit ?? 50;
    const now = new Date();

    const statusWhere =
      status === "read"
        ? { status: "cancelled" as const }
        : status === "unread"
          ? {
              OR: [
                { status: "sent" as const },
                {
                  status: "queued" as const,
                  scheduledAt: { lte: now }
                }
              ]
            }
          : {
              OR: [
                { status: "sent" as const },
                { status: "cancelled" as const },
                {
                  status: "queued" as const,
                  scheduledAt: { lte: now }
                }
              ]
            };

    const items = await this.prisma.lifecycleNudge.findMany({
      where: {
        userId: user.userId,
        channel: "in_app",
        ...statusWhere
      },
      orderBy: { createdAt: "desc" },
      take: limit
    });

    return items.map((item) => ({
      id: item.id,
      kind: item.kind,
      status: item.status,
      payload: item.payload,
      createdAt: item.createdAt.toISOString(),
      sentAt: item.sentAt?.toISOString() ?? null,
      unread: item.status === "queued" || item.status === "sent"
    }));
  }

  async unreadCount(user: AuthUser) {
    const now = new Date();
    const total = await this.prisma.lifecycleNudge.count({
      where: {
        userId: user.userId,
        channel: "in_app",
        OR: [
          { status: "sent" },
          {
            status: "queued",
            scheduledAt: { lte: now }
          }
        ]
      }
    });

    return { total };
  }

  async markRead(notificationId: string, user: AuthUser) {
    const current = await this.prisma.lifecycleNudge.findUnique({
      where: { id: notificationId }
    });
    if (!current || current.channel !== "in_app") {
      throw new NotFoundException("notification_not_found");
    }
    if (current.userId !== user.userId) {
      throw new ForbiddenException("notification_access_forbidden");
    }
    if (current.status === "cancelled") {
      return {
        ok: true,
        alreadyRead: true
      };
    }

    await this.prisma.lifecycleNudge.update({
      where: { id: notificationId },
      data: { status: "cancelled" }
    });

    return { ok: true, alreadyRead: false };
  }

  async markAllRead(user: AuthUser) {
    const now = new Date();
    const result = await this.prisma.lifecycleNudge.updateMany({
      where: {
        userId: user.userId,
        channel: "in_app",
        OR: [
          { status: "sent" },
          {
            status: "queued",
            scheduledAt: { lte: now }
          }
        ]
      },
      data: { status: "cancelled" }
    });

    return { updated: result.count };
  }

  async notifyInApp(
    userId: string,
    kind: string,
    payload: Record<string, string | number | boolean | null> = {}
  ) {
    const now = new Date();
    return this.prisma.lifecycleNudge.create({
      data: {
        userId,
        kind,
        channel: "in_app",
        payload,
        status: "sent",
        scheduledAt: now,
        sentAt: now
      }
    });
  }
}
