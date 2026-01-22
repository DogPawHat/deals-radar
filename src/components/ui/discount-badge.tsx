import * as React from "react";

import { cn } from "@/lib/utils";

interface DiscountBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  percentOff: number;
}

function DiscountBadge({ percentOff, className, ...props }: DiscountBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center bg-signal-red text-white font-display font-bold tracking-wide",
        "px-2 py-1 text-sm",
        className,
      )}
      {...props}
    >
      {percentOff}% OFF
    </div>
  );
}

export { DiscountBadge };
