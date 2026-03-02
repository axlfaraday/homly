import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type { AuthUser } from "../auth/interfaces/auth-user.interface";
import { UpdateMeDto } from "./dto/update-me.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(user: AuthUser) {
    const entity = await this.prisma.user.findUnique({
      where: { id: user.userId },
      include: {
        providerProfile: {
          select: {
            id: true,
            fullName: true,
            city: true,
            verificationStatus: true
          }
        }
      }
    });

    if (!entity) {
      throw new NotFoundException("user_not_found");
    }

    return {
      id: entity.id,
      email: entity.email,
      role: entity.role,
      referralCode: entity.referralCode,
      createdAt: entity.createdAt.toISOString(),
      providerProfile: entity.providerProfile
    };
  }

  async updateMe(payload: UpdateMeDto, user: AuthUser) {
    try {
      const updated = await this.prisma.user.update({
        where: { id: user.userId },
        data: {
          email: payload.email?.toLowerCase()
        },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true
        }
      });

      return {
        ...updated,
        createdAt: updated.createdAt.toISOString()
      };
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new BadRequestException("email_already_registered");
      }
      throw error;
    }
  }

  async applyReferralCode(code: string, user: AuthUser) {
    const me = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { id: true, referredById: true }
    });
    if (!me) {
      throw new NotFoundException("user_not_found");
    }

    if (me.referredById) {
      throw new BadRequestException("referral_already_applied");
    }

    const referrer = await this.prisma.user.findUnique({
      where: { referralCode: code.toUpperCase() },
      select: { id: true }
    });
    if (!referrer || referrer.id === me.id) {
      throw new BadRequestException("invalid_referral_code");
    }

    await this.prisma.user.update({
      where: { id: me.id },
      data: { referredById: referrer.id }
    });

    await this.prisma.referral.upsert({
      where: {
        referrerId_refereeId: {
          referrerId: referrer.id,
          refereeId: me.id
        }
      },
      update: { status: "signed_up" },
      create: {
        referrerId: referrer.id,
        refereeId: me.id,
        status: "signed_up"
      }
    });

    return { ok: true };
  }

  async getMyReferrals(user: AuthUser) {
    const referrals = await this.prisma.referral.findMany({
      where: { referrerId: user.userId },
      include: {
        referee: {
          select: { id: true, email: true, createdAt: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const earned = referrals.reduce((sum, item) => sum + item.rewardCents, 0);
    return {
      total: referrals.length,
      earnedCents: earned,
      items: referrals
    };
  }
}
