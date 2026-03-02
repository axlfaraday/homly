#!/usr/bin/env node

const API = process.env.API_URL ?? "http://localhost:4000/api";
const unique = Date.now();

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(path, init = {}) {
  const response = await fetch(`${API}${path}`, init);
  const raw = await response.text();
  let json;
  try {
    json = raw ? JSON.parse(raw) : {};
  } catch {
    json = { raw };
  }

  return { status: response.status, ok: response.ok, json };
}

async function main() {
  const health = await request("/health");
  assert(health.ok, `health_failed: ${JSON.stringify(health.json)}`);

  const providerSignup = await request("/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: `prov-${unique}@example.com`,
      password: "password123",
      role: "provider"
    })
  });
  assert(providerSignup.ok, `provider_signup_failed: ${JSON.stringify(providerSignup.json)}`);

  const providerToken = providerSignup.json.accessToken;
  const providerUserId = providerSignup.json.user.id;
  const providerReferralCode = providerSignup.json.user.referralCode;

  const customerSignup = await request("/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: `cust-${unique}@example.com`,
      password: "password123",
      role: "customer"
    })
  });
  assert(customerSignup.ok, `customer_signup_failed: ${JSON.stringify(customerSignup.json)}`);

  const customerToken = customerSignup.json.accessToken;

  const customerMe = await request("/users/me", {
    headers: { authorization: `Bearer ${customerToken}` }
  });
  assert(customerMe.ok, `customer_me_failed: ${JSON.stringify(customerMe.json)}`);

  const profile = await request("/providers/profile", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${providerToken}`
    },
    body: JSON.stringify({
      userId: providerUserId,
      fullName: "Proveedor Smoke",
      bio: "Proveedor de prueba para validar flujo critico de onboarding.",
      city: "bogota",
      coverage: ["chapinero", "usaquen"]
    })
  });
  assert(profile.ok, `provider_profile_failed: ${JSON.stringify(profile.json)}`);

  const serviceCreate = await request("/catalog/services", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${providerToken}`
    },
    body: JSON.stringify({
      providerId: profile.json.id,
      slug: "limpieza-hogar",
      title: "Limpieza Hogar",
      durationMinutes: 120,
      basePrice: 90000,
      extras: ["planchado"]
    })
  });
  assert(serviceCreate.ok, `service_create_failed: ${JSON.stringify(serviceCreate.json)}`);

  const discover = await request("/providers/discover?city=bogota&service=limpieza-hogar&verifiedOnly=false");
  assert(discover.ok, `providers_discover_failed: ${JSON.stringify(discover.json)}`);
  assert(Array.isArray(discover.json), "providers_discover_expected_array");
  assert(discover.json.length >= 1, "providers_discover_expected_non_empty");

  const customerForbidden = await request("/catalog/services", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${customerToken}`
    },
    body: JSON.stringify({
      providerId: profile.json.id,
      slug: "jardineria",
      title: "Jardineria",
      durationMinutes: 120,
      basePrice: 50000
    })
  });

  assert(
    customerForbidden.status === 403,
    `rbac_expected_403_got_${customerForbidden.status}: ${JSON.stringify(customerForbidden.json)}`
  );

  const bookingCreate = await request("/bookings", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${customerToken}`
    },
    body: JSON.stringify({
      serviceId: serviceCreate.json.id,
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      notes: "Reserva smoke"
    })
  });
  assert(bookingCreate.ok, `booking_create_failed: ${JSON.stringify(bookingCreate.json)}`);

  const paymentCheckout = await request("/payments/checkout", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${customerToken}`
    },
    body: JSON.stringify({
      bookingId: bookingCreate.json.id
    })
  });
  assert(paymentCheckout.ok, `payment_checkout_failed: ${JSON.stringify(paymentCheckout.json)}`);

  const paymentConfirm = await request(`/payments/booking/${bookingCreate.json.id}/confirm`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${customerToken}` }
  });
  assert(paymentConfirm.ok, `payment_confirm_failed: ${JSON.stringify(paymentConfirm.json)}`);

  const providerBookings = await request("/bookings/mine", {
    headers: { authorization: `Bearer ${providerToken}` }
  });
  assert(providerBookings.ok, `provider_bookings_failed: ${JSON.stringify(providerBookings.json)}`);
  assert(providerBookings.json.length >= 1, "provider_bookings_expected_non_empty");

  const bookingConfirm = await request(`/bookings/${bookingCreate.json.id}/status`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${providerToken}`
    },
    body: JSON.stringify({ status: "confirmed" })
  });
  assert(bookingConfirm.ok, `booking_confirm_failed: ${JSON.stringify(bookingConfirm.json)}`);

  const providerCheckIn = await request(`/bookings/${bookingCreate.json.id}/check-in`, {
    method: "POST",
    headers: { authorization: `Bearer ${providerToken}` }
  });
  assert(providerCheckIn.ok, `booking_checkin_failed: ${JSON.stringify(providerCheckIn.json)}`);

  const providerEvidence = await request(`/bookings/${bookingCreate.json.id}/evidence`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${providerToken}`
    },
    body: JSON.stringify({
      photoUrls: ["https://example.com/mock-evidence.jpg"],
      note: "Trabajo completado",
      geo: "4.711,-74.0721"
    })
  });
  assert(providerEvidence.ok, `booking_evidence_failed: ${JSON.stringify(providerEvidence.json)}`);

  const messageFromCustomer = await request(
    `/messaging/bookings/${bookingCreate.json.id}/messages`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${customerToken}`
      },
      body: JSON.stringify({ body: "Hola, tengo una duda sobre la reserva." })
    }
  );
  assert(messageFromCustomer.ok, `message_customer_failed: ${JSON.stringify(messageFromCustomer.json)}`);

  const messageFromProvider = await request(
    `/messaging/bookings/${bookingCreate.json.id}/messages`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${providerToken}`
      },
      body: JSON.stringify({ body: "Perfecto, te confirmo detalles por aqui." })
    }
  );
  assert(messageFromProvider.ok, `message_provider_failed: ${JSON.stringify(messageFromProvider.json)}`);

  const messageList = await request(`/messaging/bookings/${bookingCreate.json.id}/messages`, {
    headers: { authorization: `Bearer ${customerToken}` }
  });
  assert(messageList.ok, `message_list_failed: ${JSON.stringify(messageList.json)}`);
  assert(messageList.json.length >= 2, "message_list_expected_at_least_two");

  const ticketCreate = await request("/support/tickets", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${customerToken}`
    },
    body: JSON.stringify({
      bookingId: bookingCreate.json.id,
      subject: "Duda sobre llegada",
      description: "Necesito confirmar la ventana de llegada del proveedor."
    })
  });
  assert(ticketCreate.ok, `ticket_create_failed: ${JSON.stringify(ticketCreate.json)}`);

  const providerTickets = await request("/support/tickets/mine", {
    headers: { authorization: `Bearer ${providerToken}` }
  });
  assert(providerTickets.ok, `provider_tickets_failed: ${JSON.stringify(providerTickets.json)}`);
  assert(providerTickets.json.length >= 1, "provider_tickets_expected_non_empty");

  const ticketProgress = await request(`/support/tickets/${ticketCreate.json.id}/status`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${providerToken}`
    },
    body: JSON.stringify({ status: "in_progress" })
  });
  assert(ticketProgress.ok, `ticket_progress_failed: ${JSON.stringify(ticketProgress.json)}`);

  const bookingComplete = await request(`/bookings/${bookingCreate.json.id}/status`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${providerToken}`
    },
    body: JSON.stringify({ status: "completed" })
  });
  assert(bookingComplete.ok, `booking_complete_failed: ${JSON.stringify(bookingComplete.json)}`);

  const paymentRelease = await request(`/payments/booking/${bookingCreate.json.id}/release`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${providerToken}` }
  });
  assert(paymentRelease.ok, `payment_release_failed: ${JSON.stringify(paymentRelease.json)}`);

  const reviewCreate = await request("/reviews", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${customerToken}`
    },
    body: JSON.stringify({
      bookingId: bookingCreate.json.id,
      rating: 5,
      comment: "Excelente servicio de prueba"
    })
  });
  assert(reviewCreate.ok, `review_create_failed: ${JSON.stringify(reviewCreate.json)}`);

  const reviewReply = await request(`/reviews/${reviewCreate.json.id}/reply`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${providerToken}`
    },
    body: JSON.stringify({ reply: "Gracias por tu comentario." })
  });
  assert(reviewReply.ok, `review_reply_failed: ${JSON.stringify(reviewReply.json)}`);

  const providerReviews = await request(`/reviews/provider/${profile.json.id}?limit=20`);
  assert(providerReviews.ok, `provider_reviews_failed: ${JSON.stringify(providerReviews.json)}`);
  assert(providerReviews.json.total >= 1, "provider_reviews_expected_non_empty");

  const bookingPlan = await request("/bookings/plans", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${customerToken}`
    },
    body: JSON.stringify({
      serviceId: serviceCreate.json.id,
      frequency: "weekly",
      weekday: 2,
      startTime: "09:00"
    })
  });
  assert(bookingPlan.ok, `booking_plan_failed: ${JSON.stringify(bookingPlan.json)}`);

  const bookingPlanRun = await request(`/bookings/plans/${bookingPlan.json.id}/run`, {
    method: "POST",
    headers: { authorization: `Bearer ${customerToken}` }
  });
  assert(bookingPlanRun.ok, `booking_plan_run_failed: ${JSON.stringify(bookingPlanRun.json)}`);

  const referredSignup = await request("/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: `referred-${unique}@example.com`,
      password: "password123",
      role: "customer",
      referralCode: providerReferralCode
    })
  });
  assert(referredSignup.ok, `referred_signup_failed: ${JSON.stringify(referredSignup.json)}`);

  console.log("smoke_ok", {
    providerUserId,
    customerUserId: customerSignup.json.user.id,
    providerProfileId: profile.json.id,
    serviceId: serviceCreate.json.id,
    bookingId: bookingCreate.json.id,
    reviewId: reviewCreate.json.id,
    supportTicketId: ticketCreate.json.id,
    bookingPlanId: bookingPlan.json.id
  });
}

main().catch((error) => {
  console.error("smoke_failed", error.message);
  process.exit(1);
});
