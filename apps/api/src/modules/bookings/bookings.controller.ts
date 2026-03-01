import { Controller, Get } from "@nestjs/common";
import { BookingsService } from "./bookings.service";

@Controller("bookings")
export class BookingsController {
  constructor(private readonly service: BookingsService) {}

  @Get("status")
  status() {
    return this.service.getStatus();
  }
}
