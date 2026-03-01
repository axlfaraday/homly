import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Homly | Servicios locales confiables",
  description:
    "Marketplace local para reservar servicios de limpieza, jardineria y mas con pagos seguros y proveedores verificados."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
