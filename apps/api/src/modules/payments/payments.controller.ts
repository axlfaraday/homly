import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthGuard } from "../auth/guards/auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import type { AuthUser } from "../auth/interfaces/auth-user.interface";
import { CreateCheckoutDto } from "./dto/create-checkout.dto";
import { RefundPaymentDto } from "./dto/refund-payment.dto";
import { PaymentsService } from "./payments.service";

@Controller("payments")
@UseGuards(AuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Post("checkout")
  @Roles("customer", "admin")
  checkout(@Body() payload: CreateCheckoutDto, @CurrentUser() user: AuthUser) {
    return this.service.createCheckout(payload, user);
  }

  @Patch("booking/:bookingId/confirm")
  @Roles("customer", "admin")
  confirm(@Param("bookingId") bookingId: string, @CurrentUser() user: AuthUser) {
    return this.service.confirmPayment(bookingId, user);
  }

  @Patch("booking/:bookingId/release")
  @Roles("provider", "admin")
  release(@Param("bookingId") bookingId: string, @CurrentUser() user: AuthUser) {
    return this.service.releasePayout(bookingId, user);
  }

  @Post("booking/:bookingId/refund")
  @Roles("customer", "provider", "admin")
  refund(
    @Param("bookingId") bookingId: string,
    @Body() payload: RefundPaymentDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.service.refund(bookingId, payload, user);
  }

  @Get("booking/:bookingId")
  @Roles("customer", "provider", "admin")
  byBooking(@Param("bookingId") bookingId: string, @CurrentUser() user: AuthUser) {
    return this.service.getByBooking(bookingId, user);
  }
}
