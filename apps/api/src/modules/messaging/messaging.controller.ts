import { Controller, Get } from "@nestjs/common";
import { MessagingService } from "./messaging.service";

@Controller("messaging")
export class MessagingController {
  constructor(private readonly service: MessagingService) {}

  @Get("status")
  status() {
    return this.service.getStatus();
  }
}
