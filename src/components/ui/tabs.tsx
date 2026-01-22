import * as React from "react";

import { cn } from "@/lib/utils";

function Tabs({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="tabs" className={cn("flex flex-col gap-2", className)} {...props} />;
}

function TabsList({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="tabs-list"
      className={cn(
        "inline-flex h-12 items-center justify-start gap-0 border-b border-black/20 bg-white p-0",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap border-b-2 border-transparent px-6 py-2 text-sm font-bold uppercase tracking-wide text-black transition-all",
        "hover:bg-muted",
        "data-[state=active]:border-b-3 data-[state=active]:border-black data-[state=active]:bg-safety-yellow data-[state=active]:text-black",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-black focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="tabs-content" className={cn("mt-4", className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
