import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { AuthUser } from "../auth/interfaces/auth-user.interface";
import { UpsertWeeklySlotsDto } from "./dto/upsert-weekly-slots.dto";

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertWeeklySlots(payload: UpsertWeeklySlotsDto, user: AuthUser) {
    await this.assertCanManageAvailability(user, payload.providerId);
    this.assertTimeRanges(payload);

    await this.prisma.availabilitySlot.deleteMany({
      where: { providerId: payload.providerId }
    });

    await this.prisma.availabilitySlot.createMany({
      data: payload.slots.map((slot) => ({
        providerId: payload.providerId,
        weekday: slot.weekday,
        startTime: slot.startTime,
        endTime: slot.endTime
      }))
    });

    return this.listByProvider(payload.providerId);
  }

  listByProvider(providerId: string) {
    return this.prisma.availabilitySlot.findMany({
      where: { providerId },
      orderBy: [{ weekday: "asc" }, { startTime: "asc" }]
    });
  }

  private async assertCanManageAvailability(user: AuthUser, providerId: string) {
    if (user.role === "admin") {
      return;
    }

    const ownProfile = await this.prisma.providerProfile.findUnique({
      where: { userId: user.userId },
      select: { id: true }
    });

    if (!ownProfile || ownProfile.id !== providerId) {
      throw new ForbiddenException("provider_can_only_manage_own_availability");
    }
  }

  private assertTimeRanges(payload: UpsertWeeklySlotsDto) {
    for (const slot of payload.slots) {
      if (slot.startTime >= slot.endTime) {
        throw new BadRequestException("invalid_slot_time_range");
      }
    }
  }
}
