"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { readStoredSession, type AppRole, getRoleHome } from "@/lib/session";

interface AuthGuardProps {
  allow: AppRole[];
  publicPaths?: string[];
  children: React.ReactNode;
}

export function AuthGuard({ allow, publicPaths = [], children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (publicPaths.some((path) => pathname?.startsWith(path))) {
      setAuthorized(true);
      return;
    }

    const session = readStoredSession();
    if (!session) {
      const next = encodeURIComponent(pathname || "/");
      router.replace(`/app/login?next=${next}`);
      return;
    }

    if (!allow.includes(session.role)) {
      router.replace(getRoleHome(session.role));
      return;
    }

    setAuthorized(true);
  }, [allow, pathname, router]);

  if (!authorized) {
    return (
      <main className="container py-10">
        <p className="text-sm text-muted-foreground">Validando sesión...</p>
      </main>
    );
  }

  return <>{children}</>;
}
