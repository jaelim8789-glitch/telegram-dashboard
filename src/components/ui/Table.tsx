import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/ui/EmptyState";

/** Lightweight composable table primitives — intentionally not a DataTable.
 * No sorting/pagination/virtualization. Matches the visual pattern already
 * hand-rolled in the dashboard overview table so migrating an existing
 * <table> to these primitives is a 1:1, visually-neutral swap. */

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto responsive-table", className)}>
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function TableHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <thead className={className}>{children}</thead>;
}

export function TableBody({ children, className }: { children: ReactNode; className?: string }) {
  return <tbody className={cn("divide-y divide-app-border", className)}>{children}</tbody>;
}

export function TableRow({ children, className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn("text-app-text transition-colors hover:bg-app-card-hover/50 table-row-card", className)} {...props}>
      {children}
    </tr>
  );
}

export function TableHead({ children, className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-app-border pb-2 pr-3 text-left text-xs font-medium text-app-text-muted",
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({ children, className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("py-2.5 pr-3", className)} {...props}>
      {children}
    </td>
  );
}

interface TableEmptyStateProps {
  /** Number of columns in the table, so the message spans the full row. */
  colSpan: number;
  icon: LucideIcon;
  title: string;
  description?: string;
}

/** Drop-in <tr> for the "no rows" case — spans all columns and reuses the
 * shared EmptyState presentation instead of a bespoke centered <td>. */
export function TableEmptyState({ colSpan, icon, title, description }: TableEmptyStateProps) {
  return (
    <tr>
      <td colSpan={colSpan}>
        <EmptyState icon={icon} title={title} description={description} />
      </td>
    </tr>
  );
}
