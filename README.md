# Homly

Marketplace local de servicios para conectar clientes y proveedores con foco en confianza, pagos seguros, SEO local y accesibilidad WCAG 2.2 AA.

## Stack base (MVP)

- `apps/web`: Next.js (App Router) + TypeScript
- `apps/api`: NestJS + TypeScript
- DB: PostgreSQL
- Cache/colas: Redis
- Infra local: Docker Compose
- CI: GitHub Actions

## Quickstart

### Requisitos Docker (macOS)

- Instalar runtime local:
  - `brew install docker docker-compose colima`
- Configurar plugin compose:
  - crear/editar `~/.docker/config.json` con:
  - `"cliPluginsExtraDirs": ["/opt/homebrew/lib/docker/cli-plugins"]`
- Iniciar runtime:
  - `colima start --cpu 4 --memory 8 --disk 60`

### Setup recomendado (1 comando)

1. Ejecuta bootstrap local:
   - `pnpm setup:local`
2. Levanta ambas apps:
   - `pnpm dev`
3. URLs locales:
   - Web: `http://localhost:3000`
   - API: `http://localhost:4000/api`
   - Postgres (Docker): `localhost:55432`
   - Redis (Docker): `localhost:56379`

### Setup manual (alternativo)

1. Instala dependencias:
   - `pnpm install`
2. Levanta infraestructura local:
   - `pnpm infra:up`
3. Crea archivos de entorno:
   - `cp apps/api/.env.example apps/api/.env`
   - `cp apps/web/.env.example apps/web/.env.local`
4. Genera cliente Prisma y aplica migraciones:
   - `pnpm db:prepare`
5. Corre API:
   - `pnpm dev:api`
6. Corre Web:
   - `pnpm dev:web`

Variables de auth requeridas:
- `JWT_SECRET` (obligatoria en API)
- `JWT_EXPIRES_IN` (ej: `1d`, `12h`)
- `CORS_ORIGIN` (default local: `http://localhost:3000`)

Variables web relevantes:
- `NEXT_PUBLIC_API_URL` (default local: `http://localhost:4000/api`)
- `NEXT_PUBLIC_APP_URL` (default local: `http://localhost:3000`)

Verificacion rapida API:
- `pnpm --filter @homly/api test:smoke`

Seed demo local:
- `pnpm db:seed`
- Usuarios seed:
  - `admin@homly.local`
  - `provider@homly.local`
  - `customer@homly.local`
- Password seed (todos): `password123`

## Estructura

- `apps/web`: frontend público + app cliente/proveedor/admin
- `apps/api`: backend modular (DDD ligero)
- `docs`: producto, arquitectura, roadmap, QA, SEO, A11y
- `packages/config`: configuraciones compartidas

## Endpoints MVP implementados (iteracion actual)

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me` (Bearer token)
- `POST /api/providers/profile`
- `GET /api/providers`
- `GET /api/providers/discover?city=...&service=...&verifiedOnly=true&minRating=4&sortBy=top-rated`
- `GET /api/providers/user/:userId`
- `POST /api/catalog/services`
- `GET /api/catalog/services?providerId=...`
- `PATCH /api/catalog/services/:serviceId`
- `DELETE /api/catalog/services/:serviceId`
- `POST /api/availability/weekly`
- `GET /api/availability/provider/:providerId`
- `POST /api/analytics/events`
- `POST /api/bookings`
- `GET /api/bookings/mine`
- `PATCH /api/bookings/:bookingId/status`
- `POST /api/reviews`
- `GET /api/reviews/provider/:providerId`
- `GET /api/users/me`
- `PATCH /api/users/me`
- `GET /api/admin/dashboard` (admin)
- `POST /api/support/tickets`
- `GET /api/support/tickets/mine`
- `PATCH /api/support/tickets/:ticketId/status`
- `GET /api/messaging/bookings/:bookingId/messages`
- `POST /api/messaging/bookings/:bookingId/messages`

## RBAC actual

- `provider`:
  - puede crear/actualizar su propio perfil
  - puede gestionar solo sus propios servicios y disponibilidad
- `admin`:
  - puede gestionar recursos de cualquier proveedor
- endpoints protegidos usan `Authorization: Bearer <token>` emitido en `/api/auth/login` o `/api/auth/signup`

## Fases

El plan completo por fases está documentado en:
- `docs/roadmap/mvp-v1-v2.md`
- `docs/product/prd.md`
- `docs/architecture/high-level.md`
