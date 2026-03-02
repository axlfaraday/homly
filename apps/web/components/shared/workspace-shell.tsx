import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface WorkspaceShellProps {
  section: "Cliente" | "Proveedor" | "Admin";
  title: string;
  description: string;
  links: Array<{ href: string; label: string }>;
  children: React.ReactNode;
}

export function WorkspaceShell({ section, title, description, links, children }: WorkspaceShellProps) {
  return (
    <main className="container py-8 md:py-10">
      <div className="space-y-4">
        <Badge variant="secondary">{section}</Badge>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {links.map((item) => (
            <Button key={item.href} asChild size="sm" variant="outline">
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </main>
  );
}
