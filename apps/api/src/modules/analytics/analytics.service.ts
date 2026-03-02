import { Injectable } from "@nestjs/common";
import { Prisma, type AnalyticsEvent } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type { AuthUser } from "../auth/interfaces/auth-user.interface";

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  track(name: string, payload: Record<string, string | number | boolean | null> = {}) {
    return this.prisma.analyticsEvent.create({
      data: {
        name,
        payload: payload as Prisma.InputJsonValue
      }
    });
  }

  list(limit = 50): Promise<AnalyticsEvent[]> {
    return this.prisma.analyticsEvent.findMany({
      take: limit,
      orderBy: { createdAt: "desc" }
    });
  }

  async listMine(user: AuthUser, limit = 500): Promise<AnalyticsEvent[]> {
    if (user.role === "admin") {
      return this.list(limit);
    }

    const provider = await this.prisma.providerProfile.findUnique({
      where: { userId: user.userId },
      select: { id: true }
    });
    if (!provider) {
      return [];
    }

    return this.prisma.analyticsEvent.findMany({
      where: {
        OR: [
          {
            payload: {
              path: ["providerId"],
              equals: provider.id
            }
          },
          {
            payload: {
              path: ["providerUserId"],
              equals: user.userId
            }
          }
        ]
      },
      take: Math.min(limit, 5000),
      orderBy: { createdAt: "desc" }
    });
  }
}
