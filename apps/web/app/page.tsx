const cities = ["bogota", "medellin", "cali"];
const services = ["limpieza-hogar", "jardineria", "limpieza-oficinas"];

export default function HomePage() {
  return (
    <main className="container">
      <h1>Homly</h1>
      <p>
        Reserva servicios locales con proveedores verificados, precios claros y soporte en cada orden.
      </p>

      <section className="grid cols-3" aria-label="Accesos rapidos">
        <article className="card">
          <h2>Cliente</h2>
          <p>Buscar, reservar, pagar y calificar.</p>
          <a href="/app/buscar">Ir a buscar</a>
          <br />
          <a href="/app/registro">Crear cuenta</a>
        </article>
        <article className="card">
          <h2>Proveedor</h2>
          <p>Gestionar servicios, agenda e ingresos.</p>
          <a href="/proveedor/dashboard">Ir al panel proveedor</a>
          <br />
          <a href="/proveedor/onboarding">Completar onboarding</a>
        </article>
        <article className="card">
          <h2>Admin</h2>
          <p>Operaciones, verificacion y disputas.</p>
          <a href="/admin/ordenes">Ir a admin</a>
        </article>
      </section>

      <section className="card" style={{ marginTop: "1rem" }}>
        <h2>Landings locales (SEO)</h2>
        <ul>
          {cities.flatMap((city) =>
            services.map((service) => (
              <li key={`${city}-${service}`}>
                <a href={`/${city}/${service}`}>{`/${city}/${service}`}</a>
              </li>
            ))
          )}
        </ul>
      </section>
    </main>
  );
}
