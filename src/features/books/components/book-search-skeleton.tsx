import { Skeleton } from "@/components/ui/skeleton";

type BookSearchSkeletonProps = {
  count?: number;
};

export function BookSearchSkeleton({ count = 12 }: BookSearchSkeletonProps) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="flex flex-col gap-3 p-2">
          <Skeleton className="aspect-[2/3] w-full rounded-md" />
          <div className="space-y-2 px-1">
            <Skeleton className="h-3 w-4/5 rounded-md" />
            <Skeleton className="h-3 w-2/3 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
