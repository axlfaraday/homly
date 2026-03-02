import type { Metadata } from "next";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SiteHeader } from "@/components/shared/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Homly | Limpieza y jardinería con confianza",
  description:
    "Plataforma para reservar servicios de limpieza y jardinería con proveedores verificados, agenda clara y soporte continuo."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider>
          <SiteHeader />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
