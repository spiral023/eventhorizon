import { Skeleton } from "@/components/ui/skeleton";

export function PageLoading() {
  return (
    <div className="space-y-6 w-full animate-pulse">
      <div className="h-8 w-1/3 bg-muted rounded-md" />
      <div className="h-4 w-2/3 bg-muted rounded-md" />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-[300px] w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
