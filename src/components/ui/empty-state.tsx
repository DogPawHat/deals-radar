import * as React from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
}

function EmptyState({
  label,
  className,
  children,
  ...props
}: EmptyStateProps & { children?: React.ReactNode }) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center py-12 text-center", className)}
      {...props}
    >
      <p className="font-display text-2xl font-bold uppercase tracking-wide text-black">{label}</p>
      {children}
    </div>
  );
}

export { EmptyState };
