import { Injectable } from "@nestjs/common";

@Injectable()
export class SupportService {
  getStatus() {
    return { module: "support", status: "ready" };
  }
}
