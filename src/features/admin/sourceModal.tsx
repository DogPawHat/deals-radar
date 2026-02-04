"use client";

import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api.js";
import { Id } from "@convex/_generated/dataModel.js";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { CrawlJobsPanel } from "@/features/admin/crawlJobsPanel";
import { SourceForm } from "@/features/admin/sourceForm";

interface SourceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: Id<"stores"> | null;
}

export function SourceModal({ open, onOpenChange, storeId }: SourceModalProps) {
  const isEditing = !!storeId;

  const storeQuery = useQuery({
    ...convexQuery(api.admin.sources.getStore, {
      storeId: storeId as Id<"stores">,
    }),
    enabled: open && isEditing,
  });

  const store = storeQuery.data?.store;
  const recentJobs = storeQuery.data?.recentJobs ?? [];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-4xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{isEditing ? "Edit Source" : "Add Source"}</AlertDialogTitle>
          <AlertDialogDescription>
            {isEditing
              ? "Update the source details and review recent crawl jobs."
              : "Add a new source to start crawling deals."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {isEditing && storeQuery.isPending && (
          <div className="space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {isEditing && storeQuery.error && (
          <ErrorBanner title="Failed to load source" onRetry={() => void storeQuery.refetch()}>
            Try again to load the source details.
          </ErrorBanner>
        )}

        {!isEditing && (
          <SourceForm
            mode="create"
            onCancel={() => onOpenChange(false)}
            onSuccess={() => onOpenChange(false)}
          />
        )}

        {isEditing && store && !storeQuery.isPending && !storeQuery.error && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
            <SourceForm
              key={storeId?.toString() ?? "new"}
              mode="edit"
              storeId={store._id}
              initialValues={{
                name: store.name,
                url: store.url,
                robotsRules: store.robotsRules ?? "",
              }}
              onCancel={() => onOpenChange(false)}
              onSuccess={() => onOpenChange(false)}
            />
            <CrawlJobsPanel jobs={recentJobs} />
          </div>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
