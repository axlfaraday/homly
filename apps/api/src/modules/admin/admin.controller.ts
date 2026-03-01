import { Controller, Get } from "@nestjs/common";
import { AdminService } from "./admin.service";

@Controller("admin")
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get("status")
  status() {
    return this.service.getStatus();
  }
}
