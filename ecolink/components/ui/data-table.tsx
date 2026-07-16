import type { ReactNode } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type DataTableColumn<TData> = {
  accessorKey?: keyof TData;
  cell?: (row: TData) => ReactNode;
  className?: string;
  header: ReactNode;
  id: string;
};

export type DataTableProps<TData> = {
  columns: DataTableColumn<TData>[];
  data: TData[];
  emptyState?: ReactNode;
  getRowKey: (row: TData, index: number) => string;
  className?: string;
};

/**
 * DataTable renders typed tabular data with a reusable empty state slot.
 */
export function DataTable<TData>({
  className,
  columns,
  data,
  emptyState,
  getRowKey,
}: DataTableProps<TData>) {
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead className={column.className} key={column.id}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((row, rowIndex) => (
              <TableRow key={getRowKey(row, rowIndex)}>
                {columns.map((column) => (
                  <TableCell className={column.className} key={column.id}>
                    {column.cell
                      ? column.cell(row)
                      : column.accessorKey
                        ? String(row[column.accessorKey] ?? "")
                        : null}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length}>
                {emptyState ?? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No records found.
                  </p>
                )}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
