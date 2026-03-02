#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

function loadLocalEnvFile() {
  if (process.env.DATABASE_URL) {
    return;
  }

  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function daysFromNow(days, hourUtc) {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + days);
  value.setUTCHours(hourUtc, 0, 0, 0);
  return value;
}

async function main() {
  loadLocalEnvFile();
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL no configurada. Usa apps/api/.env o exporta la variable.");
  }

  const prisma = new PrismaClient();
  const password = "password123";
  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@homly.local" },
    update: { passwordHash, role: "admin" },
    create: { email: "admin@homly.local", passwordHash, role: "admin" }
  });

  const providerUser = await prisma.user.upsert({
    where: { email: "provider@homly.local" },
    update: { passwordHash, role: "provider" },
    create: { email: "provider@homly.local", passwordHash, role: "provider" }
  });

  const customerUser = await prisma.user.upsert({
    where: { email: "customer@homly.local" },
    update: { passwordHash, role: "customer" },
    create: { email: "customer@homly.local", passwordHash, role: "customer" }
  });

  const providerProfile = await prisma.providerProfile.upsert({
    where: { userId: providerUser.id },
    update: {
      fullName: "Proveedor Demo Homly",
      bio: "Proveedor demo para pruebas locales del flujo de onboarding, catalogo y reservas.",
      city: "bogota",
      coverage: ["chapinero", "usaquen", "teusaquillo"],
      verificationStatus: "approved"
    },
    create: {
      userId: providerUser.id,
      fullName: "Proveedor Demo Homly",
      bio: "Proveedor demo para pruebas locales del flujo de onboarding, catalogo y reservas.",
      city: "bogota",
      coverage: ["chapinero", "usaquen", "teusaquillo"],
      verificationStatus: "approved"
    }
  });

  const existingService = await prisma.marketplaceService.findFirst({
    where: { providerId: providerProfile.id, slug: "limpieza-hogar-demo" }
  });

  const service = existingService
    ? await prisma.marketplaceService.update({
        where: { id: existingService.id },
        data: {
          title: "Limpieza Hogar Demo",
          durationMinutes: 120,
          basePrice: 90000,
          extras: ["planchado", "limpieza-cocina"],
          active: true
        }
      })
    : await prisma.marketplaceService.create({
        data: {
          providerId: providerProfile.id,
          slug: "limpieza-hogar-demo",
          title: "Limpieza Hogar Demo",
          durationMinutes: 120,
          basePrice: 90000,
          extras: ["planchado", "limpieza-cocina"],
          active: true
        }
      });

  await prisma.availabilitySlot.deleteMany({
    where: { providerId: providerProfile.id }
  });

  await prisma.availabilitySlot.createMany({
    data: [
      { providerId: providerProfile.id, weekday: 1, startTime: "08:00", endTime: "12:00" },
      { providerId: providerProfile.id, weekday: 1, startTime: "14:00", endTime: "18:00" },
      { providerId: providerProfile.id, weekday: 3, startTime: "09:00", endTime: "13:00" },
      { providerId: providerProfile.id, weekday: 5, startTime: "10:00", endTime: "16:00" }
    ]
  });

  await prisma.booking.deleteMany({
    where: {
      customerId: customerUser.id,
      providerId: providerProfile.id,
      notes: { startsWith: "seed-demo:" }
    }
  });

  const bookingPending = await prisma.booking.create({
    data: {
      customerId: customerUser.id,
      providerId: providerProfile.id,
      serviceId: service.id,
      scheduledAt: daysFromNow(1, 14),
      status: "pending",
      notes: "seed-demo:pending"
    }
  });

  const bookingConfirmed = await prisma.booking.create({
    data: {
      customerId: customerUser.id,
      providerId: providerProfile.id,
      serviceId: service.id,
      scheduledAt: daysFromNow(2, 16),
      status: "confirmed",
      notes: "seed-demo:confirmed"
    }
  });

  const bookingCompleted = await prisma.booking.create({
    data: {
      customerId: customerUser.id,
      providerId: providerProfile.id,
      serviceId: service.id,
      scheduledAt: daysFromNow(-1, 15),
      status: "completed",
      notes: "seed-demo:completed"
    }
  });

  await prisma.review.upsert({
    where: { bookingId: bookingCompleted.id },
    update: {
      rating: 5,
      comment: "Excelente servicio demo."
    },
    create: {
      bookingId: bookingCompleted.id,
      customerId: customerUser.id,
      providerId: providerProfile.id,
      rating: 5,
      comment: "Excelente servicio demo."
    }
  });

  await prisma.message.deleteMany({
    where: { bookingId: bookingCompleted.id }
  });

  await prisma.message.createMany({
    data: [
      {
        bookingId: bookingCompleted.id,
        senderId: customerUser.id,
        body: "Hola, gracias por el servicio demo."
      },
      {
        bookingId: bookingCompleted.id,
        senderId: providerUser.id,
        body: "Con gusto, quedo atento a futuras reservas."
      }
    ]
  });

  await prisma.supportTicket.deleteMany({
    where: {
      customerId: customerUser.id,
      subject: { startsWith: "seed-demo:" }
    }
  });

  const supportTicket = await prisma.supportTicket.create({
    data: {
      bookingId: bookingCompleted.id,
      customerId: customerUser.id,
      providerId: providerProfile.id,
      subject: "seed-demo: consulta post-servicio",
      description: "Ticket demo para validar flujo de soporte.",
      status: "open"
    }
  });

  await prisma.analyticsEvent.create({
    data: {
      name: "seed_completed",
      payload: {
        adminUserId: admin.id,
        providerUserId: providerUser.id,
        customerUserId: customerUser.id,
        providerProfileId: providerProfile.id,
        serviceId: service.id,
        bookingIds: [bookingPending.id, bookingConfirmed.id, bookingCompleted.id],
        supportTicketId: supportTicket.id
      }
    }
  });

  await prisma.$disconnect();

  console.log("seed_ok", {
    users: {
      admin: "admin@homly.local",
      provider: "provider@homly.local",
      customer: "customer@homly.local"
    },
    password,
    providerProfileId: providerProfile.id,
    serviceId: service.id,
    bookingIds: [bookingPending.id, bookingConfirmed.id, bookingCompleted.id],
    supportTicketId: supportTicket.id
  });
}

main().catch((error) => {
  console.error("seed_failed", error.message);
  process.exit(1);
});
