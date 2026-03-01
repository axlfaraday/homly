import { Injectable } from "@nestjs/common";

@Injectable()
export class PaymentsService {
  getStatus() {
    return { module: "payments", status: "ready" };
  }
}
