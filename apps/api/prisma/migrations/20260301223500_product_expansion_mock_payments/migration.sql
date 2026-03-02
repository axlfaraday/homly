-- CreateEnum
CREATE TYPE "ProviderPlan" AS ENUM ('free', 'pro', 'elite');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('requires_payment_method', 'requires_confirmation', 'held_in_escrow', 'released', 'refunded', 'failed');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('pending', 'processed', 'failed');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('signed_up', 'qualified', 'rewarded');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('open', 'acknowledged', 'resolved');

-- CreateEnum
CREATE TYPE "NudgeStatus" AS ENUM ('queued', 'sent', 'cancelled');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "cancelWindowHours" INTEGER NOT NULL DEFAULT 12,
ADD COLUMN     "cancellationFeePct" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "checkInAt" TIMESTAMP(3),
ADD COLUMN     "checkOutAt" TIMESTAMP(3),
ADD COLUMN     "completionEvidence" JSONB,
ADD COLUMN     "guaranteeAccepted" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "recurrencePlanId" TEXT;

-- AlterTable
ALTER TABLE "ProviderProfile" ADD COLUMN     "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
ADD COLUMN     "featuredUntil" TIMESTAMP(3),
ADD COLUMN     "noShowRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "plan" "ProviderPlan" NOT NULL DEFAULT 'free',
ADD COLUMN     "punctualityRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
ADD COLUMN     "responseRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
ADD COLUMN     "serviceRadiusKm" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "teamSize" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "travelBufferMinutes" INTEGER NOT NULL DEFAULT 15;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "badgeSnapshot" TEXT,
ADD COLUMN     "providerReply" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "referredById" TEXT;

-- CreateTable
CREATE TABLE "BookingPlan" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "intervalWeeks" INTEGER NOT NULL DEFAULT 1,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "totalRuns" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "platformFeeAmount" INTEGER NOT NULL,
    "providerPayoutAmount" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'requires_payment_method',
    "mockReference" TEXT,
    "paidAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "refereeId" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'signed_up',
    "rewardCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpsAlert" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'medium',
    "status" "AlertStatus" NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "OpsAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LifecycleNudge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "NudgeStatus" NOT NULL DEFAULT 'queued',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LifecycleNudge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingPlan_customerId_createdAt_idx" ON "BookingPlan"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "BookingPlan_providerId_active_idx" ON "BookingPlan"("providerId", "active");

-- CreateIndex
CREATE INDEX "BookingPlan_nextRunAt_active_idx" ON "BookingPlan"("nextRunAt", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_bookingId_key" ON "Payment"("bookingId");

-- CreateIndex
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Refund_paymentId_createdAt_idx" ON "Refund"("paymentId", "createdAt");

-- CreateIndex
CREATE INDEX "Referral_status_createdAt_idx" ON "Referral"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_referrerId_refereeId_key" ON "Referral"("referrerId", "refereeId");

-- CreateIndex
CREATE INDEX "OpsAlert_status_severity_createdAt_idx" ON "OpsAlert"("status", "severity", "createdAt");

-- CreateIndex
CREATE INDEX "LifecycleNudge_userId_status_scheduledAt_idx" ON "LifecycleNudge"("userId", "status", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_recurrencePlanId_fkey" FOREIGN KEY ("recurrencePlanId") REFERENCES "BookingPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPlan" ADD CONSTRAINT "BookingPlan_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPlan" ADD CONSTRAINT "BookingPlan_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPlan" ADD CONSTRAINT "BookingPlan_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "MarketplaceService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpsAlert" ADD CONSTRAINT "OpsAlert_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LifecycleNudge" ADD CONSTRAINT "LifecycleNudge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

