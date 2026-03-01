import { Injectable } from "@nestjs/common";

@Injectable()
export class MessagingService {
  getStatus() {
    return { module: "messaging", status: "ready" };
  }
}
