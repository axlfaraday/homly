import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import * as jwt from "jsonwebtoken";
import { PrismaService } from "../../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { SignupDto } from "./dto/signup.dto";

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async signup(payload: SignupDto) {
    const email = payload.email.toLowerCase();
    const userData: Prisma.UserCreateInput = {
      id: randomUUID(),
      email,
      passwordHash: this.hashPassword(payload.password),
      role: payload.role
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

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString()
      },
      accessToken: this.issueToken(user.id, user.role)
    };
  }

  async login(payload: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: payload.email.toLowerCase() }
    });

    if (!user || user.passwordHash !== this.hashPassword(payload.password)) {
      throw new UnauthorizedException("invalid_credentials");
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString()
      },
      accessToken: this.issueToken(user.id, user.role)
    };
  }

  private hashPassword(value: string) {
    return createHash("sha256").update(value).digest("hex");
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
}
