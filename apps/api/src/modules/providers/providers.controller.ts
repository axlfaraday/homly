import { Body, Controller, ForbiddenException, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthGuard } from "../auth/guards/auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import type { AuthUser } from "../auth/interfaces/auth-user.interface";
import { UpsertProviderProfileDto } from "./dto/upsert-provider-profile.dto";
import { ProvidersService } from "./providers.service";

@Controller("providers")
export class ProvidersController {
  constructor(private readonly service: ProvidersService) {}

  @Get()
  listProfiles() {
    return this.service.listProfiles();
  }

  @Get("user/:userId")
  getByUserId(@Param("userId") userId: string) {
    return this.service.getByUserId(userId);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("provider", "admin")
  @Post("profile")
  async upsertProfile(
    @Body() payload: UpsertProviderProfileDto,
    @CurrentUser() user: AuthUser
  ) {
    if (user.role === "provider" && payload.userId !== user.userId) {
      throw new ForbiddenException("provider_can_only_edit_own_profile");
    }

    return this.service.upsertProfile(payload);
  }
}
