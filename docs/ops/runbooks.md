# Runbooks iniciales

## Incidente checkout caido
1. Confirmar alcance (region, pasarela, endpoint).
2. Activar alerta on-call y status interno.
3. Verificar webhooks/pasarela y colas pendientes.
4. Aplicar fallback manual y comunicar ETA.
5. Ejecutar postmortem con accion correctiva.

## Reembolso manual
1. Validar orden, estado y politica de cancelacion.
2. Registrar evidencia y actor en auditoria.
3. Ejecutar reembolso en pasarela.
4. Actualizar estado interno y notificar cliente/proveedor.

## Payout retenido
1. Revisar ventana de disputa y flags antifraude.
2. Verificar conciliacion de pago.
3. Liberar payout o escalar a ops/fraude.
