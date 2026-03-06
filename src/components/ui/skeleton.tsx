import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-sm border-2 border-foreground bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
