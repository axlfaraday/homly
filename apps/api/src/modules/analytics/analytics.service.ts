import { Injectable } from "@nestjs/common";
import { Prisma, type AnalyticsEvent } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

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
}
