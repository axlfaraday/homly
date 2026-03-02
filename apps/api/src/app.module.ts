import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { join } from "node:path";
import { HealthModule } from "./health.module";
import { AdminModule } from "./modules/admin/admin.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { AuthModule } from "./modules/auth/auth.module";
import { AvailabilityModule } from "./modules/availability/availability.module";
import { BookingsModule } from "./modules/bookings/bookings.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { MessagingModule } from "./modules/messaging/messaging.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { ProvidersModule } from "./modules/providers/providers.module";
import { ReviewsModule } from "./modules/reviews/reviews.module";
import { SupportModule } from "./modules/support/support.module";
import { UsersModule } from "./modules/users/users.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(__dirname, "..", ".env"), ".env"]
    }),
    PrismaModule,
    HealthModule,
    AnalyticsModule,
    AuthModule,
    UsersModule,
    ProvidersModule,
    CatalogModule,
    AvailabilityModule,
    BookingsModule,
    PaymentsModule,
    MessagingModule,
    ReviewsModule,
    SupportModule,
    AdminModule
  ]
})
export class AppModule {}
