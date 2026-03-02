import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthGuard } from "../auth/guards/auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import type { AuthUser } from "../auth/interfaces/auth-user.interface";
import { BookingsService } from "./bookings.service";
import { CreateBookingDto } from "./dto/create-booking.dto";
import { CreateBookingPlanDto } from "./dto/create-booking-plan.dto";
import { AddEvidenceDto } from "./dto/add-evidence.dto";
import { UpdateBookingStatusDto } from "./dto/update-booking-status.dto";

@Controller("bookings")
@UseGuards(AuthGuard, RolesGuard)
export class BookingsController {
  constructor(private readonly service: BookingsService) {}

  @Post()
  @Roles("customer", "admin")
  create(@Body() payload: CreateBookingDto, @CurrentUser() user: AuthUser) {
    return this.service.create(payload, user);
  }

  @Get("mine")
  @Roles("customer", "provider", "admin")
  listMine(@CurrentUser() user: AuthUser) {
    return this.service.listMine(user);
  }

  @Patch(":bookingId/status")
  @Roles("customer", "provider", "admin")
  updateStatus(
    @Param("bookingId") bookingId: string,
    @Body() payload: UpdateBookingStatusDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.service.updateStatus(bookingId, payload, user);
  }

  @Post(":bookingId/check-in")
  @Roles("provider", "admin")
  checkIn(@Param("bookingId") bookingId: string, @CurrentUser() user: AuthUser) {
    return this.service.markCheckIn(bookingId, user);
  }

  @Post(":bookingId/check-out")
  @Roles("provider", "admin")
  checkOut(@Param("bookingId") bookingId: string, @CurrentUser() user: AuthUser) {
    return this.service.markCheckOut(bookingId, user);
  }

  @Post(":bookingId/evidence")
  @Roles("provider", "admin")
  addEvidence(
    @Param("bookingId") bookingId: string,
    @Body() payload: AddEvidenceDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.service.addEvidence(bookingId, payload, user);
  }

  @Post("plans")
  @Roles("customer", "admin")
  createPlan(@Body() payload: CreateBookingPlanDto, @CurrentUser() user: AuthUser) {
    return this.service.createPlan(payload, user);
  }

  @Get("plans/mine")
  @Roles("customer", "provider", "admin")
  listMyPlans(@CurrentUser() user: AuthUser) {
    return this.service.listMyPlans(user);
  }

  @Post("plans/:planId/run")
  @Roles("customer", "admin")
  runPlan(@Param("planId") planId: string, @CurrentUser() user: AuthUser) {
    return this.service.runPlan(planId, user);
  }

  @Get(":bookingId/risk")
  @Roles("customer", "provider", "admin")
  bookingRisk(@Param("bookingId") bookingId: string, @CurrentUser() user: AuthUser) {
    return this.service.getBookingRisk(bookingId, user);
  }
}
