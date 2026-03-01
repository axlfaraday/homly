import { Controller, Get } from "@nestjs/common";
import { PaymentsService } from "./payments.service";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Get("status")
  status() {
    return this.service.getStatus();
  }
}
