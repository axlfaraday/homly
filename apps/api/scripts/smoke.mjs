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

  console.log("smoke_ok", {
    providerUserId,
    providerProfileId: profile.json.id,
    serviceId: serviceCreate.json.id
  });
}

main().catch((error) => {
  console.error("smoke_failed", error.message);
  process.exit(1);
});
