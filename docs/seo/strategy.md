# SEO strategy MVP

## URLs objetivo
- `/{ciudad}/{servicio}`
- `/servicios/{slug}`
- `/proveedores/{nombre-id}`
- `/guias/{slug}`
- `/faq`

## Requisitos tecnicos
- SSR/SSG en landings publicas.
- `sitemap.xml` dinamico.
- `robots.txt` con exclusiones de rutas privadas.
- Canonicals por pagina indexable.
- JSON-LD: Service, FAQPage, BreadcrumbList.

## Core Web Vitals (objetivo inicial)
- LCP <= 2.5s
- INP <= 200ms
- CLS <= 0.1

## Tracking
- GSC + GA4
- Eventos: `search_performed`, `provider_profile_viewed`, `booking_started`, `payment_succeeded`.
