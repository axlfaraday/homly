import { Controller, Get } from "@nestjs/common";
import { SupportService } from "./support.service";

@Controller("support")
export class SupportController {
  constructor(private readonly service: SupportService) {}

  @Get("status")
  status() {
    return this.service.getStatus();
  }
}
