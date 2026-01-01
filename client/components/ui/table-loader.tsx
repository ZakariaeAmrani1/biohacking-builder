import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TableLoaderProps {
  columns: number;
  rows?: number;
  showHeader?: boolean;
}

export function TableLoader({
  columns,
  rows = 6,
  showHeader = true,
}: TableLoaderProps) {
  return (
    <div className="relative overflow-hidden">
      <Table>
        {showHeader && (
          <TableHeader>
            <TableRow>
              {Array.from({ length: columns }, (_, i) => (
                <TableHead key={i}>
                  <Skeleton className="h-4 w-full max-w-[120px]" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        )}
        <TableBody>
          {Array.from({ length: rows }, (_, rowIndex) => (
            <TableRow key={rowIndex} className="hover:bg-transparent">
              {Array.from({ length: columns }, (_, colIndex) => (
                <TableCell key={colIndex}>
                  <div className="flex items-center space-x-2">
                    {colIndex === 0 && (
                      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                    )}
                    <Skeleton
                      className={`h-4 ${
                        colIndex === 0
                          ? "w-[100px]"
                          : colIndex === 1
                            ? "w-[140px]"
                            : colIndex === 2
                              ? "w-[80px]"
                              : colIndex === 3
                                ? "w-[60px]"
                                : "w-[90px]"
                      }`}
                    />
                  </div>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Animated overlay for extra loading effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse pointer-events-none" />
    </div>
  );
}

export function TableLoaderCard({
  title,
  columns,
  rows = 6,
  showHeader = true,
}: TableLoaderProps & { title: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-[200px]" />
          <Skeleton className="h-4 w-[300px]" />
        </div>
        <div className="flex space-x-2">
          <Skeleton className="h-9 w-[100px]" />
          <Skeleton className="h-9 w-[32px]" />
        </div>
      </div>

      <div className="flex space-x-2 mb-4">
        <Skeleton className="h-9 w-[200px]" />
        <Skeleton className="h-9 w-[120px]" />
        <Skeleton className="h-9 w-[80px]" />
      </div>

      <div className="border rounded-md">
        <TableLoader columns={columns} rows={rows} showHeader={showHeader} />
      </div>
    </div>
  );
}

export function GridLoader({ items = 6 }: { items?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: items }, (_, i) => (
        <div key={i} className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[120px]" />
              <Skeleton className="h-3 w-[80px]" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-[80%]" />
          </div>
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-[60px]" />
            <div className="flex space-x-2">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
