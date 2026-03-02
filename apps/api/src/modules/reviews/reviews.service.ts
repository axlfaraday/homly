import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type { AuthUser } from "../auth/interfaces/auth-user.interface";
import { CreateReviewDto } from "./dto/create-review.dto";

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateReviewDto, user: AuthUser) {
    if (user.role !== "customer" && user.role !== "admin") {
      throw new ForbiddenException("only_customer_or_admin_can_create_review");
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: payload.bookingId }
    });
    if (!booking) {
      throw new NotFoundException("booking_not_found");
    }

    if (booking.status !== "completed") {
      throw new BadRequestException("booking_must_be_completed");
    }

    if (user.role === "customer" && booking.customerId !== user.userId) {
      throw new ForbiddenException("customer_can_only_review_own_booking");
    }

    const providerAgg = await this.prisma.review.aggregate({
      where: { providerId: booking.providerId },
      _avg: { rating: true },
      _count: { _all: true }
    });
    const projectedAverage =
      ((providerAgg._avg.rating ?? 0) * providerAgg._count._all + payload.rating) /
      (providerAgg._count._all + 1);

    const data: Prisma.ReviewCreateInput = {
      booking: { connect: { id: booking.id } },
      customer: { connect: { id: booking.customerId } },
      provider: { connect: { id: booking.providerId } },
      rating: payload.rating,
      comment: payload.comment,
      badgeSnapshot: this.getBadge(projectedAverage)
    };

    try {
      return await this.prisma.review.create({ data });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new BadRequestException("review_already_exists_for_booking");
      }

      throw error;
    }
  }

  async listByProvider(providerId: string, limit = 20) {
    const reviews = await this.prisma.review.findMany({
      where: { providerId },
      orderBy: { createdAt: "desc" },
      take: limit
    });

    const summary = await this.prisma.review.aggregate({
      where: { providerId },
      _avg: { rating: true },
      _count: { _all: true }
    });

    return {
      providerId,
      total: summary._count._all,
      averageRating: summary._avg.rating ?? null,
      items: reviews
    };
  }

  async reply(reviewId: string, reply: string, user: AuthUser) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { provider: { select: { userId: true } } }
    });
    if (!review) {
      throw new NotFoundException("review_not_found");
    }

    if (user.role !== "admin" && review.provider.userId !== user.userId) {
      throw new ForbiddenException("provider_can_only_reply_own_reviews");
    }

    return this.prisma.review.update({
      where: { id: reviewId },
      data: { providerReply: reply }
    });
  }

  async pendingForCustomer(user: AuthUser) {
    const bookings = await this.prisma.booking.findMany({
      where: {
        customerId: user.userId,
        status: "completed",
        review: null
      },
      include: {
        service: { select: { title: true } },
        provider: { select: { fullName: true } }
      },
      orderBy: { updatedAt: "desc" },
      take: 50
    });

    return {
      total: bookings.length,
      items: bookings
    };
  }

  private getBadge(averageRating: number) {
    if (averageRating >= 4.8) {
      return "gold";
    }
    if (averageRating >= 4.4) {
      return "silver";
    }
    if (averageRating >= 4) {
      return "bronze";
    }
    return "new";
  }
}
