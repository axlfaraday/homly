import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import * as jwt from "jsonwebtoken";
import { PrismaService } from "../../../prisma/prisma.service";
import type { AuthUser } from "../interfaces/auth-user.interface";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: AuthUser;
    }>();

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("missing_bearer_token");
    }

    const token = authHeader.slice("Bearer ".length).trim();
    const decoded = this.decodeToken(token);
    const user = await this.prisma.user.findUnique({ where: { id: decoded.userId } });

    if (!user || user.role !== decoded.role) {
      throw new UnauthorizedException("invalid_token_user");
    }

    request.user = decoded;
    return true;
  }

  private decodeToken(token: string): AuthUser {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new UnauthorizedException("jwt_secret_not_configured");
    }

    try {
      const payload = jwt.verify(token, secret, { algorithms: ["HS256"] }) as {
        sub?: string;
        role?: string;
      };

      if (!payload.sub || !payload.role) {
        throw new Error("invalid_format");
      }

      if (
        payload.role !== "customer" &&
        payload.role !== "provider" &&
        payload.role !== "admin"
      ) {
        throw new Error("invalid_role");
      }

      return { userId: payload.sub, role: payload.role };
    } catch {
      throw new UnauthorizedException("invalid_token");
    }
  }
}
