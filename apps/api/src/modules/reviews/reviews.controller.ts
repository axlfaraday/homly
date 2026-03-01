import { Controller, Get } from "@nestjs/common";
import { ReviewsService } from "./reviews.service";

@Controller("reviews")
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @Get("status")
  status() {
    return this.service.getStatus();
  }
}
