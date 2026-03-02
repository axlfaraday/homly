# Análisis de flujo cliente – Homly

Revisión del recorrido completo de un usuario **cliente** en la plataforma: interacción con la API y la web, y falencias detectadas.

---

## 1. Flujo recorrido

| Paso | Ruta / Acción | Estado |
|-----|----------------|--------|
| 1 | Landing `/` → "Buscar proveedor" → `/app/buscar` | OK (redirige a login si no hay sesión) |
| 2 | Login `/app/login` con `customer@homly.local` / `password123` | OK |
| 3 | Búsqueda `/app/buscar` (filtros ciudad, servicio, rating) | **Falla**: ver §2.1 |
| 4 | Detalle proveedor `/app/proveedores/[id]` | OK si se llega con un `id` válido |
| 5 | Checkout `/app/checkout?providerId=&serviceId=` → crear reserva → pago mock | OK (probado vía API) |
| 6 | Mis reservas `/app/reservas` | OK |
| 7 | Dashboard `/app/dashboard` (reservas + tickets) | OK |
| 8 | Mensajes `/app/mensajes` | OK (estructura; ver §2.5) |
| 9 | Soporte `/app/soporte` (listar y crear tickets) | OK (validación en front; ver §2.4) |

---

## 2. Errores y falencias

### 2.1 Búsqueda vacía por defecto (crítico)

- **Qué pasa**: En `/app/buscar` el valor por defecto del servicio es `limpieza-hogar`. La API `GET /api/providers/discover` se llama con `verifiedOnly=true` y `service=limpieza-hogar`.
- **Por qué falla**: El único proveedor verificado del seed tiene un servicio con slug `limpieza-hogar-demo`, no `limpieza-hogar`. El filtro de discover exige coincidencia exacta de `slug` o que el `title` contenga la cadena (con guión). “Limpieza Hogar Demo” no contiene la subcadena `limpieza-hogar`.
- **Efecto**: El cliente ve “Sin resultados” en la primera búsqueda sin cambiar filtros.
- **Opciones de corrección**:
  - Alinear seed y front: en el seed usar slug `limpieza-hogar` para el servicio demo, o en el front usar por defecto un servicio que exista (p. ej. `limpieza-hogar-demo`).
  - O dejar el servicio por defecto vacío para que discover devuelva todos los proveedores aprobados con al menos un servicio activo (mejor primera experiencia).

### 2.2 Error de login mostrado como JSON

- **Dónde**: `/app/login`, en el `catch` se hace `setFeedback(error.message)` y el `message` es `JSON.stringify(data)` del body de la API.
- **Efecto**: Si la API devuelve `{ "statusCode": 401, "message": "Credenciales inválidas" }`, el usuario ve ese JSON en pantalla.
- **Corrección**: Extraer `message` (o campo equivalente) del body y mostrarlo como texto; si no hay, usar un mensaje genérico (“Credenciales incorrectas” / “No fue posible iniciar sesión”).

### 2.3 Detalle de proveedor sin salud operativa

- **Dónde**: `/app/proveedores/[providerId]`: se pide perfil, servicios y `GET /api/providers/:id/health`.
- **Comportamiento**: Si `health` falla o devuelve null, el render hace `provider && health ? ... : null`, así que no se muestra ni la ficha del proveedor ni los servicios.
- **Corrección**: Mostrar siempre perfil y servicios cuando existan; mostrar la sección “Salud operativa” solo cuando `health` esté disponible, o un mensaje tipo “Datos de salud no disponibles”.

### 2.4 Soporte: validación sin mensaje claro

- **Dónde**: `/app/soporte`, envío del formulario de nuevo ticket. La API exige `subject` ≥ 5 caracteres y `description` ≥ 10.
- **Comportamiento**: El front no valida antes de enviar; si la API rechaza, se hace `setState("error")` sin mensaje específico.
- **Efecto**: El usuario no sabe si el error es de red, de validación (asunto/descripción cortos) u otro.
- **Corrección**: Validar en el cliente asunto y descripción y mostrar mensajes claros (“El asunto debe tener al menos 5 caracteres”, “La descripción debe tener al menos 10 caracteres”). Mantener o mejorar el mensaje genérico cuando el error venga del servidor.

### 2.5 Inconsistencia de layout (Mensajes y Soporte)

- **Dónde**: `/app/mensajes` y `/app/soporte` no usan `WorkspaceShell` ni el mismo patrón de navegación que Buscar, Reservas o Dashboard.
- **Efecto**: Experiencia menos coherente y menos accesible (menú lateral / enlaces de área cliente).
- **Corrección**: Usar `WorkspaceShell` en ambas páginas con los mismos enlaces de sección “Cliente”.

### 2.6 Mensajes: selector de reserva poco usable

- **Dónde**: `/app/mensajes`: el “Reserva” es un input de texto con el UUID; se preselecciona la primera reserva.
- **Efecto**: Cambiar de reserva es incómodo y proclive a errores (pegar ID incorrecto).
- **Corrección**: Select o lista de reservas (id corto + fecha/servicio) en lugar de un input libre.

### 2.7 Estado de pago en Reservas

- **Dónde**: `/app/reservas`: para cada reserva se llama `GET /api/payments/booking/:id`. Si falla, se muestra `"sin_checkout"`.
- **Comportamiento**: Correcto; solo conviene asegurar que el usuario entienda que “sin_checkout” significa que aún no hay pago iniciado (y no un error técnico).

---

## 3. Resumen de prioridades

| Prioridad | Tema | Acción recomendada |
|-----------|------|---------------------|
| Alta | Búsqueda vacía | Ajustar default de servicio (vacío o `limpieza-hogar-demo`) o slug del seed a `limpieza-hogar`. |
| Alta | Error de login | Mostrar `message` del API o mensaje genérico, nunca JSON crudo. |
| Media | Detalle proveedor | Mostrar perfil y servicios aunque falle `health`. |
| Media | Soporte | Validación en front + mensajes claros para asunto/descripción. |
| Baja | Layout | Unificar con `WorkspaceShell` en Mensajes y Soporte. |
| Baja | Mensajes | Selector de reserva por lista/select en lugar de UUID. |

---

## 4. Verificación API (resumen)

- `POST /api/auth/login` con cliente seed: **OK**.
- `GET /api/providers/discover` con `verifiedOnly=true` y `service=limpieza-hogar`: **[]** (origen del fallo de búsqueda).
- `GET /api/providers/discover` con `service=limpieza-hogar-demo` o sin servicio: **resultados OK**.
- `GET /api/providers`, `GET /api/providers/:id/health`, `GET /api/catalog/services?providerId=`: **OK**.
- `POST /api/bookings`, `GET /api/bookings/mine`: **OK**.
- `GET /api/support/tickets/mine`: **OK**.

Fecha del análisis: 2026-03-02.

---

## 5. Navegación en el explorador (E2E)

Para navegar la plataforma en un navegador real y validar el flujo automáticamente:

1. Arranca el proyecto (`pnpm dev` en la raíz).
2. Ejecuta: `pnpm --filter @homly/web e2e` (o desde `apps/web`: `pnpm e2e`).

Los tests E2E (Playwright) cubren: landing → login → buscar (y opcional detalle proveedor), login con credenciales incorrectas (mensaje legible) y página Mis reservas con sesión. Para ver el navegador: `pnpm e2e:ui`.
