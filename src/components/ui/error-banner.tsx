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
      className={cn("flex flex-col gap-3 border-2 border-black bg-error-bg p-4", className)}
      {...props}
    >
      <p className="font-bold text-black">{title}</p>
      {children && <p className="text-sm text-muted-foreground">{children}</p>}
      {onRetry && (
        <Button variant="default" size="sm" onClick={onRetry}>
          RETRY
        </Button>
      )}
    </div>
  );
}

export { ErrorBanner };
