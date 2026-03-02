import { AuthGuard } from "@/components/shared/auth-guard";

export default function AdminAreaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AuthGuard allow={["admin"]}>{children}</AuthGuard>;
}
