import * as React from "react";

import { cn } from "@/lib/utils";
import { Button } from "./button";

interface ErrorBannerProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  onRetry?: () => void;
}

function ErrorBanner({
  title = "Something went wrong",
  onRetry,
  className,
  children,
  ...props
}: ErrorBannerProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-l-2 border-red-loss bg-red-loss-muted p-4",
        className,
      )}
      {...props}
    >
      <p className="font-bold text-foreground">{title}</p>
      {children && <p className="text-sm text-muted-foreground">{children}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          RETRY
        </Button>
      )}
    </div>
  );
}

export { ErrorBanner };
