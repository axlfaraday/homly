"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { clearSession, readStoredSession, getRoleHome, type AppRole } from "@/lib/session";

const nav = [
  { href: "/", label: "Inicio" },
  { href: "/app/buscar", label: "Buscar" },
  { href: "/faq", label: "FAQ" }
];

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<AppRole | null>(null);

  useEffect(() => {
    const session = readStoredSession();
    setRole(session?.role ?? null);
  }, [pathname]);

  function onLogout() {
    clearSession();
    setRole(null);
    router.push("/app/login");
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight">
          Homly
        </Link>

        <nav className="hidden items-center gap-6 text-sm md:flex">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="text-muted-foreground hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {role ? (
            <>
              <Button asChild size="sm" variant="outline" className="hidden md:inline-flex">
                <Link href={getRoleHome(role)}>
                  {role === "customer" ? "Mi área" : role === "provider" ? "Panel proveedor" : "Panel admin"}
                </Link>
              </Button>
              <Button size="sm" variant="ghost" onClick={onLogout} className="hidden md:inline-flex">
                Cerrar sesión
              </Button>
            </>
          ) : (
            <Button asChild size="sm" variant="outline" className="hidden md:inline-flex">
              <Link href="/app/login">Iniciar sesión</Link>
            </Button>
          )}
          <ThemeToggle />
          <Sheet>
            <SheetTrigger asChild>
              <Button className="md:hidden" size="icon" variant="outline" aria-label="Abrir menu">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
                <SheetDescription>Navega por la plataforma.</SheetDescription>
              </SheetHeader>
              <Separator className="my-4" />
              <div className="grid gap-3">
                {nav.map((item) => (
                  <Link key={item.href} href={item.href} className="rounded-md px-2 py-1 text-sm hover:bg-muted">
                    {item.label}
                  </Link>
                ))}
                {role ? (
                  <>
                    <Link href={getRoleHome(role)} className="rounded-md px-2 py-1 text-sm hover:bg-muted">
                      Ir a mi panel
                    </Link>
                    <button
                      type="button"
                      className="rounded-md px-2 py-1 text-left text-sm hover:bg-muted"
                      onClick={onLogout}
                    >
                      Cerrar sesión
                    </button>
                  </>
                ) : (
                  <Link href="/app/login" className="rounded-md px-2 py-1 text-sm hover:bg-muted">
                    Iniciar sesión
                  </Link>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
