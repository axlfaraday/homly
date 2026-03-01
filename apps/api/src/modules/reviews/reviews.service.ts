import { Injectable } from "@nestjs/common";

@Injectable()
export class ReviewsService {
  getStatus() {
    return { module: "reviews", status: "ready" };
  }
}
