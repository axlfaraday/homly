# Arquitectura High-Level

## Estilo
Monolito modular (DDD ligero) con modulos de dominio y eventos internos.

## Apps
- `apps/web`: Next.js App Router (SSR/SSG en landings SEO).
- `apps/api`: NestJS modular para dominio transaccional.

## Modulos core
- Identity & Access
- Provider Onboarding
- Marketplace Catalog
- Availability
- Booking & Orders
- Payments & Payouts
- Messaging & Notifications
- Reviews & Reputation
- Support & Disputes
- Admin Console

## Datos
- PostgreSQL: entidades transaccionales.
- Redis: cache, rate-limit, colas/eventos efimeros.
- S3 compatible: imagenes y evidencias.

## Integraciones
- Pasarela de pago (Stripe/Mercado Pago) via webhooks.
- Email (MVP), WhatsApp/SMS (V1).
- Analitica (GA4 + warehouse/eventos backend).

## Seguridad
- RBAC base (cliente/proveedor/admin).
- Logs de auditoria en acciones criticas.
- Rate limiting + proteccion CSRF/CORS + secretos gestionados.
