import * as React from "react";

import { cn } from "@/lib/utils";

interface DiscountBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  percentOff: number;
}

function DiscountBadge({ percentOff, className, ...props }: DiscountBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center bg-green-gain-muted text-green-gain font-mono font-semibold",
        "px-2 py-0.5 text-xs rounded-sm",
        className,
      )}
      {...props}
    >
      -{percentOff}%
    </div>
  );
}

export { DiscountBadge };
