import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type { VerificationStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type { AuthUser } from "../auth/interfaces/auth-user.interface";
import { DiscoverProvidersQueryDto } from "./dto/discover-providers.query.dto";
import { UpgradeProviderPlanDto } from "./dto/upgrade-provider-plan.dto";
import { UpsertProviderProfileDto } from "./dto/upsert-provider-profile.dto";

@Injectable()
export class ProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertProfile(payload: UpsertProviderProfileDto, actor: AuthUser) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      throw new NotFoundException("user_not_found");
    }

    if (user.role !== "provider") {
      throw new BadRequestException("user_is_not_provider");
    }

    const existing = await this.prisma.providerProfile.findUnique({
      where: { userId: payload.userId },
      select: { verificationStatus: true }
    });
    const nextVerificationStatus = this.resolveVerificationStatus(
      actor,
      payload.verificationStatus,
      existing?.verificationStatus
    );

    return this.prisma.providerProfile.upsert({
      where: { userId: payload.userId },
      update: {
        fullName: payload.fullName,
        bio: payload.bio,
        city: payload.city.toLowerCase(),
        coverage: payload.coverage.map((item) => item.toLowerCase()),
        verificationStatus: nextVerificationStatus,
        teamSize: payload.teamSize ?? 1,
        travelBufferMinutes: payload.travelBufferMinutes ?? 15,
        serviceRadiusKm: payload.serviceRadiusKm ?? 10
      },
      create: {
        userId: payload.userId,
        fullName: payload.fullName,
        bio: payload.bio,
        city: payload.city.toLowerCase(),
        coverage: payload.coverage.map((item) => item.toLowerCase()),
        verificationStatus: nextVerificationStatus,
        teamSize: payload.teamSize ?? 1,
        travelBufferMinutes: payload.travelBufferMinutes ?? 15,
        serviceRadiusKm: payload.serviceRadiusKm ?? 10
      }
    });
  }

  listProfiles() {
    return this.prisma.providerProfile.findMany({
      orderBy: { createdAt: "desc" }
    });
  }

  discover(query: DiscoverProvidersQueryDto) {
    const normalizedCity = query.city?.trim().toLowerCase();
    const normalizedService = query.service?.trim().toLowerCase();
    const verifiedOnly = query.verifiedOnly ?? true;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? "newest";
    const featuredFirst = query.featuredFirst ?? true;
    const now = new Date();

    return this.prisma.providerProfile
      .findMany({
        where: {
          city: normalizedCity,
          verificationStatus: verifiedOnly ? "approved" : undefined,
          services: {
            some: normalizedService
              ? {
                  active: true,
                  OR: [
                    { slug: normalizedService },
                    { title: { contains: normalizedService, mode: "insensitive" } }
                  ]
                }
              : { active: true }
          }
        },
        include: {
          services: {
            where: normalizedService
              ? {
                  active: true,
                  OR: [
                    { slug: normalizedService },
                    { title: { contains: normalizedService, mode: "insensitive" } }
                  ]
                }
              : { active: true },
            orderBy: { createdAt: "desc" }
          },
          availability: {
            orderBy: [{ weekday: "asc" }, { startTime: "asc" }]
          },
          reviews: {
            select: { rating: true }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 200
      })
      .then((providers) => {
        const withStats = providers.map((provider) => {
          const reviewCount = provider.reviews.length;
          const averageRating =
            reviewCount === 0
              ? null
              : provider.reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount;

          const healthScore =
            provider.responseRate * 0.25 +
            provider.punctualityRate * 0.25 +
            provider.completionRate * 0.35 +
            (1 - provider.noShowRate) * 0.15;
          const isFeatured = provider.featuredUntil ? provider.featuredUntil > now : false;

          return {
            ...provider,
            averageRating,
            reviewCount,
            healthScore,
            isFeatured
          };
        });

        const filteredByRating =
          query.minRating !== undefined
            ? withStats.filter(
                (provider) =>
                  provider.averageRating !== null && provider.averageRating >= query.minRating!
              )
            : withStats;

        const sorted =
          sortBy === "top-rated"
            ? filteredByRating.sort((a, b) => {
                if (featuredFirst && a.isFeatured !== b.isFeatured) {
                  return a.isFeatured ? -1 : 1;
                }
                if (a.averageRating === null && b.averageRating === null) {
                  return b.createdAt.getTime() - a.createdAt.getTime();
                }
                if (a.averageRating === null) {
                  return 1;
                }
                if (b.averageRating === null) {
                  return -1;
                }

                if (b.averageRating !== a.averageRating) {
                  return b.averageRating - a.averageRating;
                }

                if (b.reviewCount !== a.reviewCount) {
                  return b.reviewCount - a.reviewCount;
                }

                return b.healthScore - a.healthScore;
              })
            : filteredByRating.sort((a, b) => {
                if (featuredFirst && a.isFeatured !== b.isFeatured) {
                  return a.isFeatured ? -1 : 1;
                }
                return b.createdAt.getTime() - a.createdAt.getTime();
              });

        return sorted.slice(0, limit).map(({ reviews, ...provider }) => provider);
      });
  }

  async getByUserId(userId: string) {
    const profile = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException("provider_profile_not_found");
    }

    return profile;
  }

  async upgradePlan(payload: UpgradeProviderPlanDto, actor: AuthUser) {
    const provider =
      actor.role === "admin"
        ? null
        : await this.prisma.providerProfile.findUnique({
            where: { userId: actor.userId },
            select: { id: true }
          });

    if (actor.role !== "admin" && !provider) {
      throw new ForbiddenException("provider_profile_required");
    }

    const targetProviderId = provider?.id;
    if (!targetProviderId) {
      throw new BadRequestException("admin_target_provider_not_implemented");
    }

    return this.prisma.providerProfile.update({
      where: { id: targetProviderId },
      data: {
        plan: payload.plan,
        featuredUntil:
          payload.featuredDays !== undefined
            ? new Date(Date.now() + payload.featuredDays * 24 * 60 * 60 * 1000)
            : undefined
      }
    });
  }

  async getProviderHealth(providerId: string) {
    const provider = await this.prisma.providerProfile.findUnique({
      where: { id: providerId },
      select: {
        id: true,
        responseRate: true,
        punctualityRate: true,
        completionRate: true,
        noShowRate: true,
        plan: true,
        featuredUntil: true
      }
    });
    if (!provider) {
      throw new NotFoundException("provider_not_found");
    }

    const reviews = await this.prisma.review.aggregate({
      where: { providerId },
      _avg: { rating: true },
      _count: { _all: true }
    });

    const healthScore =
      provider.responseRate * 0.25 +
      provider.punctualityRate * 0.25 +
      provider.completionRate * 0.35 +
      (1 - provider.noShowRate) * 0.15;

    return {
      providerId: provider.id,
      plan: provider.plan,
      featuredUntil: provider.featuredUntil,
      responseRate: provider.responseRate,
      punctualityRate: provider.punctualityRate,
      completionRate: provider.completionRate,
      noShowRate: provider.noShowRate,
      averageRating: reviews._avg.rating ?? null,
      reviewCount: reviews._count._all,
      healthScore
    };
  }

  private resolveVerificationStatus(
    actor: AuthUser,
    requested: VerificationStatus | undefined,
    current: VerificationStatus | undefined
  ): VerificationStatus {
    if (actor.role === "admin" && requested) {
      return requested;
    }

    if (current) {
      return current;
    }

    return "pending";
  }
}
