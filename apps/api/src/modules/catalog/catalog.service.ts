import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { AuthUser } from "../auth/interfaces/auth-user.interface";
import { CreateServiceDto } from "./dto/create-service.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateServiceDto, user: AuthUser) {
    const providerId = await this.resolveProviderId(user, payload.providerId);

    return this.prisma.marketplaceService.create({
      data: {
        providerId,
        slug: payload.slug.toLowerCase(),
        title: payload.title,
        durationMinutes: payload.durationMinutes,
        basePrice: payload.basePrice,
        extras: payload.extras ?? [],
        active: payload.active ?? true
      }
    });
  }

  list(providerId?: string) {
    return this.prisma.marketplaceService.findMany({
      where: providerId ? { providerId } : undefined,
      orderBy: { createdAt: "desc" }
    });
  }

  async update(serviceId: string, payload: UpdateServiceDto, user: AuthUser) {
    const current = await this.prisma.marketplaceService.findUnique({
      where: { id: serviceId },
      include: { provider: true }
    });
    if (!current) {
      throw new NotFoundException("service_not_found");
    }

    this.assertCanManageService(user, current.provider.userId);
    const providerId =
      payload.providerId !== undefined ? await this.resolveProviderId(user, payload.providerId) : current.providerId;

    return this.prisma.marketplaceService.update({
      where: { id: serviceId },
      data: {
        providerId,
        slug: payload.slug ? payload.slug.toLowerCase() : current.slug,
        title: payload.title ?? current.title,
        durationMinutes: payload.durationMinutes ?? current.durationMinutes,
        basePrice: payload.basePrice ?? current.basePrice,
        extras: payload.extras ?? current.extras,
        active: payload.active ?? current.active
      }
    });
  }

  async remove(serviceId: string, user: AuthUser) {
    const exists = await this.prisma.marketplaceService.findUnique({
      where: { id: serviceId },
      include: { provider: true }
    });
    if (!exists) {
      throw new NotFoundException("service_not_found");
    }

    this.assertCanManageService(user, exists.provider.userId);
    await this.prisma.marketplaceService.delete({ where: { id: serviceId } });
    return { ok: true };
  }

  private async resolveProviderId(user: AuthUser, requestedProviderId: string): Promise<string> {
    if (user.role === "admin") {
      return requestedProviderId;
    }

    const ownProfile = await this.prisma.providerProfile.findUnique({
      where: { userId: user.userId },
      select: { id: true }
    });

    if (!ownProfile) {
      throw new ForbiddenException("provider_profile_required");
    }

    if (ownProfile.id !== requestedProviderId) {
      throw new ForbiddenException("provider_can_only_manage_own_services");
    }

    return ownProfile.id;
  }

  private assertCanManageService(user: AuthUser, providerUserId: string) {
    if (user.role === "admin") {
      return;
    }

    if (user.userId !== providerUserId) {
      throw new ForbiddenException("provider_can_only_manage_own_services");
    }
  }
}
