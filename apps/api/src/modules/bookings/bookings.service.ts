import { Injectable } from "@nestjs/common";

@Injectable()
export class BookingsService {
  getStatus() {
    return { module: "bookings", status: "ready" };
  }
}
