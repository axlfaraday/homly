import { AuthGuard } from "@/components/shared/auth-guard";

export default function ProviderAreaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AuthGuard allow={["provider", "admin"]}>{children}</AuthGuard>;
}
