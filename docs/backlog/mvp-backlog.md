# Backlog MVP inicial

## Epicas priorizadas (orden sugerido)
1. Identidad y acceso
2. Onboarding proveedor
3. Catalogo de servicios
4. Disponibilidad y agenda
5. Search y discovery
6. Reserva y orden
7. Pagos y conciliacion
8. Cancelacion y disputas
9. Mensajeria y notificaciones
10. Reseñas y reputacion
11. Admin y operaciones
12. SEO tecnico + contenido base

## Sprint 1 propuesto
- [x] Registro/login basico cliente/proveedor.
- [x] Perfil proveedor (MVP) + estado de verificacion.
- [x] CRUD servicios y disponibilidad semanal.
- [x] Landing SEO local + sitemap + robots.
- [x] Instrumentacion de eventos base.
- [x] Persistencia PostgreSQL (Prisma en modulos Auth/Providers/Catalog/Availability/Analytics).
- [x] Ejecutar migracion inicial en entorno con Docker/Postgres disponible.
- [x] Guards de autorizacion por rol (RBAC) + ownership por proveedor.
- [ ] E2E de flujos criticos (registro->onboarding->servicio->slots).

## Criterios DoD MVP
- Flujo completo buscar->reservar->pagar->completar->calificar.
- Webhooks de pago reconciliados.
- SEO indexable en paginas clave.
- WCAG 2.2 AA en flujos criticos.
