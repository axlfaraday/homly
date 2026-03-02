import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { PrismaService } from "../../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { SignupDto } from "./dto/signup.dto";

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async signup(payload: SignupDto) {
    const email = payload.email.toLowerCase();
    let referredById: string | undefined;
    if (payload.referralCode) {
      const referrer = await this.prisma.user.findUnique({
        where: { referralCode: payload.referralCode.toUpperCase() },
        select: { id: true }
      });
      if (!referrer) {
        throw new BadRequestException("referral_code_not_found");
      }
      referredById = referrer.id;
    }

    const userData: Prisma.UserCreateInput = {
      id: randomUUID(),
      email,
      passwordHash: await this.hashPassword(payload.password),
      role: payload.role,
      referralCode: this.generateReferralCode(),
      referredBy: referredById ? { connect: { id: referredById } } : undefined
    };

    const user = await this.prisma.user
      .create({ data: userData })
      .catch((error: unknown) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new BadRequestException("email_already_registered");
        }
        throw error;
      });

    if (referredById) {
      await this.prisma.referral.upsert({
        where: {
          referrerId_refereeId: {
            referrerId: referredById,
            refereeId: user.id
          }
        },
        update: { status: "signed_up" },
        create: {
          referrerId: referredById,
          refereeId: user.id,
          status: "signed_up"
        }
      });
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        referralCode: user.referralCode,
        createdAt: user.createdAt.toISOString()
      },
      accessToken: this.issueToken(user.id, user.role)
    };
  }

  async login(payload: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: payload.email.toLowerCase() }
    });

    if (!user) {
      throw new UnauthorizedException("invalid_credentials");
    }

    const isValid = await this.verifyPassword(payload.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException("invalid_credentials");
    }

    if (!user.passwordHash.startsWith("$2")) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await this.hashPassword(payload.password) }
      });
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        referralCode: user.referralCode,
        createdAt: user.createdAt.toISOString()
      },
      accessToken: this.issueToken(user.id, user.role)
    };
  }

  private hashPassword(value: string) {
    return bcrypt.hash(value, 12);
  }

  private async verifyPassword(password: string, hash: string) {
    if (hash.startsWith("$2")) {
      return bcrypt.compare(password, hash);
    }

    return createHash("sha256").update(password).digest("hex") === hash;
  }

  private issueToken(userId: string, role: string) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new UnauthorizedException("jwt_secret_not_configured");
    }

    const expiresIn = process.env.JWT_EXPIRES_IN ?? "1d";
    return jwt.sign({ sub: userId, role }, secret, {
      algorithm: "HS256",
      expiresIn
    });
  }

  private generateReferralCode() {
    return randomUUID().slice(0, 8).toUpperCase();
  }
}
