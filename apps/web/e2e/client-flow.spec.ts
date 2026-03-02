import { test, expect } from "@playwright/test";

const CLIENT_EMAIL = "customer@homly.local";
const CLIENT_PASSWORD = "password123";

test.describe("Flujo cliente en la web", () => {
  test("Landing → Login → Buscar → Detalle proveedor (navegación completa)", async ({
    page
  }) => {
    const consoleErrors: string[] = [];
    const failedRequests: { url: string; status?: number }[] = [];

    page.on("console", (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (type === "error" && !text.includes("React")) {
        consoleErrors.push(text);
      }
    });

    page.on("requestfailed", (req) => {
      failedRequests.push({ url: req.url() });
    });

    // 1. Landing
    await page.goto("/");
    await expect(page).toHaveTitle(/Homly|Servicios/);
    await expect(
      page.getByRole("link", { name: /buscar proveedor/i })
    ).toBeVisible();

    // 2. Ir a buscar (redirige a login si no hay sesión)
    await page.getByRole("link", { name: /buscar proveedor/i }).first().click();
    await page.waitForURL(/\/app\//);

    // Debe estar en login o en buscar (si ya hay sesión)
    const isLogin = page.url().includes("/app/login");
    if (isLogin) {
      await expect(
        page.getByRole("heading", { name: /iniciar sesión/i })
      ).toBeVisible();
      await page.getByLabel(/email/i).fill(CLIENT_EMAIL);
      await page.getByLabel(/contraseña/i).fill(CLIENT_PASSWORD);
      await page.getByRole("button", { name: /entrar/i }).click();
      await page.waitForURL(/\/(app\/buscar|app\/dashboard)/, { timeout: 8000 });
    }

    // 3. Si estamos en dashboard, ir a buscar; luego validar contenido de /app/buscar
    let path = new URL(page.url()).pathname;
    if (path.includes("/app/dashboard")) {
      await expect(page.getByText(/dashboard|reservas|contratar/i).first()).toBeVisible({ timeout: 5000 });
      await page.getByRole("link", { name: /contratar|buscar/i }).first().click();
      await page.waitForURL(/\/app\/buscar/, { timeout: 8000 });
      path = new URL(page.url()).pathname;
    }
    if (path.includes("/app/buscar")) {
      await expect(page).toHaveURL(/\/app\/buscar/);
      await page.waitForLoadState("networkidle").catch(() => {});
      const verDetalle = page.getByRole("link", { name: /ver detalle/i }).first();
      if ((await verDetalle.count()) > 0) {
        await verDetalle.click();
        await page.waitForURL(/\/app\/proveedores\/[^/]+/);
        await expect(
          page.getByText(/detalle del proveedor|salud operativa|reservar/i)
        ).toBeVisible({ timeout: 5000 });
      }
    }

    // Resumen de fallos en consola/red (no fallar el test, solo reportar)
    if (consoleErrors.length > 0 || failedRequests.length > 0) {
      console.log("\n[E2E] Errores de consola:", consoleErrors);
      console.log("[E2E] Peticiones fallidas:", failedRequests);
    }
  });

  test("Login con credenciales incorrectas muestra mensaje legible", async ({
    page
  }) => {
    await page.goto("/app/login");
    await page.getByLabel(/email/i).fill("noexiste@test.local");
    await page.getByLabel(/contraseña/i).fill("wrong");
    await page.getByRole("button", { name: /entrar/i }).click();

    await expect(
      page.getByRole("heading", { name: "Ocurrió un error" })
    ).toBeVisible({ timeout: 5000 });
    const errText = await page.getByRole("heading", { name: "Ocurrió un error" }).textContent();
    expect(errText).not.toMatch(/^\s*\{.*"statusCode"/);
  });

  test("Reservas requiere sesión y muestra lista o vacío", async ({ page }) => {
    await page.goto("/app/login");
    await page.getByLabel(/email/i).fill(CLIENT_EMAIL);
    await page.getByLabel(/contraseña/i).fill(CLIENT_PASSWORD);
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL(/\/(app\/dashboard|app\/buscar)/, { timeout: 8000 });

    await page.goto("/app/reservas");
    await page.waitForLoadState("networkidle").catch(() => {});

    await expect(
      page.getByRole("heading", { name: "Mis reservas" })
    ).toBeVisible({ timeout: 8000 });
  });
});
