import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthGuard } from "../auth/guards/auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import type { AuthUser } from "../auth/interfaces/auth-user.interface";
import { CreateReviewDto } from "./dto/create-review.dto";
import { ListProviderReviewsQueryDto } from "./dto/list-provider-reviews.query.dto";
import { ReplyReviewDto } from "./dto/reply-review.dto";
import { ReviewsService } from "./reviews.service";

@Controller("reviews")
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @Get("provider/:providerId")
  listByProvider(
    @Param("providerId") providerId: string,
    @Query() query: ListProviderReviewsQueryDto
  ) {
    return this.service.listByProvider(providerId, query.limit ?? 20);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("customer", "admin")
  @Post()
  create(@Body() payload: CreateReviewDto, @CurrentUser() user: AuthUser) {
    return this.service.create(payload, user);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("provider", "admin")
  @Patch(":reviewId/reply")
  reply(
    @Param("reviewId") reviewId: string,
    @Body() payload: ReplyReviewDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.service.reply(reviewId, payload.reply, user);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("customer", "admin")
  @Get("pending/mine")
  pendingMyReviews(@CurrentUser() user: AuthUser) {
    return this.service.pendingForCustomer(user);
  }
}
