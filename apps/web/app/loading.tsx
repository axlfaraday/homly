import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="container py-10">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    </main>
  );
}
