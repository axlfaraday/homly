import { AuthGuard } from "@/components/shared/auth-guard";

export default function AppAreaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <AuthGuard allow={["customer", "admin"]} publicPaths={["/app/login", "/app/registro"]}>
      {children}
    </AuthGuard>
  );
}
