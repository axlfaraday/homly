import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UpsertProviderProfileDto } from "./dto/upsert-provider-profile.dto";

@Injectable()
export class ProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertProfile(payload: UpsertProviderProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      throw new NotFoundException("user_not_found");
    }

    if (user.role !== "provider") {
      throw new BadRequestException("user_is_not_provider");
    }

    return this.prisma.providerProfile.upsert({
      where: { userId: payload.userId },
      update: {
        fullName: payload.fullName,
        bio: payload.bio,
        city: payload.city.toLowerCase(),
        coverage: payload.coverage.map((item) => item.toLowerCase()),
        verificationStatus: payload.verificationStatus ?? "pending"
      },
      create: {
        userId: payload.userId,
        fullName: payload.fullName,
        bio: payload.bio,
        city: payload.city.toLowerCase(),
        coverage: payload.coverage.map((item) => item.toLowerCase()),
        verificationStatus: payload.verificationStatus ?? "pending"
      }
    });
  }

  listProfiles() {
    return this.prisma.providerProfile.findMany({
      orderBy: { createdAt: "desc" }
    });
  }

  async getByUserId(userId: string) {
    const profile = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException("provider_profile_not_found");
    }

    return profile;
  }
}
