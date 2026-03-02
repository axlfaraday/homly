import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthGuard } from "../auth/guards/auth.guard";
import type { AuthUser } from "../auth/interfaces/auth-user.interface";
import { ApplyReferralDto } from "./dto/apply-referral.dto";
import { UpdateMeDto } from "./dto/update-me.dto";
import { UsersService } from "./users.service";

@Controller("users")
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return this.service.getMe(user);
  }

  @Patch("me")
  updateMe(@Body() payload: UpdateMeDto, @CurrentUser() user: AuthUser) {
    return this.service.updateMe(payload, user);
  }

  @Post("referrals/apply")
  applyReferral(@Body() payload: ApplyReferralDto, @CurrentUser() user: AuthUser) {
    return this.service.applyReferralCode(payload.referralCode, user);
  }

  @Get("referrals/mine")
  myReferrals(@CurrentUser() user: AuthUser) {
    return this.service.getMyReferrals(user);
  }
}
