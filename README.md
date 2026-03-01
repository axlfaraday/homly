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

1. Instala dependencias:
   - `pnpm install`
2. Levanta infraestructura local:
   - `docker compose up -d`
3. Copia variables de entorno:
   - `cp .env.example .env`
4. Genera cliente Prisma:
   - `DATABASE_URL=postgresql://homly:homly@localhost:5432/homly pnpm --filter @homly/api db:generate`
5. Ejecuta migraciones:
   - `DATABASE_URL=postgresql://homly:homly@localhost:5432/homly pnpm --filter @homly/api db:migrate --name init`
6. Corre API:
   - `pnpm --filter @homly/api dev`
7. Corre Web:
   - `pnpm --filter @homly/web dev`

Variables de auth requeridas:
- `JWT_SECRET` (obligatoria en API)
- `JWT_EXPIRES_IN` (ej: `1d`, `12h`)

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
- `GET /api/providers/user/:userId`
- `POST /api/catalog/services`
- `GET /api/catalog/services?providerId=...`
- `PATCH /api/catalog/services/:serviceId`
- `DELETE /api/catalog/services/:serviceId`
- `POST /api/availability/weekly`
- `GET /api/availability/provider/:providerId`
- `POST /api/analytics/events`

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
