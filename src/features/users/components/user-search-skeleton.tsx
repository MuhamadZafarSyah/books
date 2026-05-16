import { Skeleton } from "@/components/ui/skeleton";

export function UserSearchSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border bg-card/70">
      {Array.from({ length: count }).map((_, idx) => (
        <li key={idx} className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
          <Skeleton className="size-12 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-2/5 rounded-md" />
            <Skeleton className="h-2.5 w-3/5 rounded-md" />
          </div>
          <Skeleton className="h-8 w-24 shrink-0 rounded-full" />
        </li>
      ))}
    </ul>
  );
}
