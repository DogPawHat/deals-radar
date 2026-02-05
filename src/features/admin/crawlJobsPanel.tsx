"use client";

import { Id } from "@convex/_generated/dataModel.js";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface CrawlJobInfo {
  _id: Id<"crawlJobs">;
  enqueuedAt: number;
  startedAt?: number;
  finishedAt?: number;
  status: "queued" | "running" | "done" | "failed";
  resultCount?: number;
  blockedByRobots?: boolean;
  blockedRule?: string;
  errorDetails?: string;
  attempt: number;
}

interface CrawlJobsPanelProps {
  jobs?: ReadonlyArray<CrawlJobInfo>;
  isLoading?: boolean;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function getStatusBadge(status: CrawlJobInfo["status"]) {
  switch (status) {
    case "queued":
      return <Badge variant="secondary">QUEUED</Badge>;
    case "running":
      return <Badge variant="default">RUNNING</Badge>;
    case "done":
      return <Badge variant="outline">DONE</Badge>;
    case "failed":
      return <Badge variant="destructive">FAILED</Badge>;
  }
}

function getErrorCopy(job: CrawlJobInfo): string | null {
  if (job.blockedByRobots) {
    return job.blockedRule
      ? `Blocked by robots.txt rule: ${job.blockedRule}`
      : "Blocked by robots.txt";
  }

  if (job.status === "failed") {
    return job.errorDetails
      ? `Error: ${job.errorDetails}`
      : "Crawl failed. Check logs for details.";
  }

  return null;
}

function handleCopy(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(text);
  }
}

export function CrawlJobsPanel({ jobs, isLoading }: CrawlJobsPanelProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Recent Crawl Jobs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-28" />
          </div>
        )}

        {!isLoading && (!jobs || jobs.length === 0) && (
          <p className="text-sm text-muted-foreground">No crawl jobs yet.</p>
        )}

        {!isLoading &&
          jobs?.map((job) => {
            const timestamp = job.finishedAt ?? job.startedAt ?? job.enqueuedAt;
            const errorCopy = getErrorCopy(job);

            return (
              <div
                key={job._id}
                className="rounded-md border border-border bg-secondary p-3 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(job.status)}
                    <span className="text-muted-foreground">{formatRelativeTime(timestamp)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Attempt {job.attempt}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>Enqueued {formatRelativeTime(job.enqueuedAt)}</span>
                  {job.resultCount !== undefined && <span>Results: {job.resultCount}</span>}
                </div>
                {errorCopy && (
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="text-xs text-destructive">{errorCopy}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(errorCopy)}
                    >
                      COPY
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
      </CardContent>
    </Card>
  );
}
