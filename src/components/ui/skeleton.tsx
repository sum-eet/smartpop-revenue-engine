import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

// Specific skeleton components for different use cases
const CardSkeleton = () => (
  <div className="border rounded-lg p-6 space-y-3">
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-4" />
    </div>
    <Skeleton className="h-8 w-16" />
    <Skeleton className="h-3 w-32" />
  </div>
);

const TableRowSkeleton = () => (
  <div className="flex items-center space-x-4 py-3 border-b">
    <Skeleton className="h-4 w-8" />
    <Skeleton className="h-4 flex-1" />
    <Skeleton className="h-4 w-20" />
    <Skeleton className="h-4 w-16" />
    <Skeleton className="h-4 w-16" />
    <Skeleton className="h-8 w-20" />
  </div>
);

const ChartSkeleton = () => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-4 w-20" />
    </div>
    <Skeleton className="h-64 w-full" />
    <div className="flex justify-center space-x-4">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-3 w-16" />
    </div>
  </div>
);

const AnalyticsCardsSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {[...Array(4)].map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

const PopupTableSkeleton = () => (
  <div className="space-y-1">
    {[...Array(5)].map((_, i) => (
      <TableRowSkeleton key={i} />
    ))}
  </div>
);

export { 
  Skeleton, 
  CardSkeleton, 
  TableRowSkeleton, 
  ChartSkeleton, 
  AnalyticsCardsSkeleton, 
  PopupTableSkeleton 
}
