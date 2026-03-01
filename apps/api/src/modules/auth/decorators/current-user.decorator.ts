import { UnauthorizedException, createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthUser } from "../interfaces/auth-user.interface";

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  const request = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
  if (!request.user) {
    throw new UnauthorizedException("current_user_not_available");
  }

  return request.user;
});
