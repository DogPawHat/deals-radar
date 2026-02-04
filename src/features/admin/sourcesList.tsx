"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api.js";
import { Id } from "@convex/_generated/dataModel.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Plus, Play, MoreHorizontal, Trash2, Pencil } from "lucide-react";
import { SourceModal } from "@/features/admin/sourceModal";

interface StoreWithStats {
  _id: Id<"stores">;
  name: string;
  url: string;
  lastCrawlAt?: number | null;
  isCrawling: boolean;
  robotsRules?: string | null;
  dealCount: number;
  lastJobStatus?: "queued" | "running" | "done" | "failed" | null;
  lastJobAt?: number | null;
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

function formatCooldown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function getStatusBadge(status?: string | null, isCrawling?: boolean) {
  if (isCrawling) {
    return <Badge variant="default">CRAWLING</Badge>;
  }

  switch (status) {
    case "queued":
      return <Badge variant="secondary">QUEUED</Badge>;
    case "running":
      return <Badge variant="default">RUNNING</Badge>;
    case "done":
      return <Badge variant="outline">DONE</Badge>;
    case "failed":
      return <Badge variant="destructive">FAILED</Badge>;
    default:
      return <Badge variant="secondary">IDLE</Badge>;
  }
}

function StoreCard({
  store,
  onRunNow,
  onEdit,
  onDelete,
  cooldownRemainingMs,
}: {
  store: StoreWithStats;
  onRunNow: (storeId: Id<"stores">) => void;
  onEdit: (storeId: Id<"stores">) => void;
  onDelete: (storeId: Id<"stores">) => void;
  cooldownRemainingMs: number;
}) {
  const [showMenu, setShowMenu] = useState(false);

  const isCooldownActive = cooldownRemainingMs > 0;
  const canRun = !store.isCrawling && !isCooldownActive;
  const lastCrawl = store.lastJobAt ? formatRelativeTime(store.lastJobAt) : "never";
  const cooldownLabel = isCooldownActive ? formatCooldown(cooldownRemainingMs) : null;

  return (
    <Card className="bg-white">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-display font-bold text-lg truncate">{store.name}</h3>
              {getStatusBadge(store.lastJobStatus, store.isCrawling)}
            </div>

            <p className="text-sm text-muted-foreground truncate mb-2">{store.url}</p>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Last crawl: {lastCrawl}</span>
              <span>{store.dealCount} deals</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end gap-1">
              <Button
                variant={canRun ? "default" : "outline"}
                size="sm"
                disabled={!canRun}
                onClick={() => onRunNow(store._id)}
                className="uppercase"
                title={cooldownLabel ? `Available in ${cooldownLabel}` : undefined}
              >
                <Play className="size-3 mr-1" />
                Run Now
              </Button>
              {cooldownLabel && (
                <span className="text-xs text-muted-foreground">Ready in {cooldownLabel}</span>
              )}
            </div>

            <div className="relative">
              <Button variant="ghost" size="icon-sm" onClick={() => setShowMenu(!showMenu)}>
                <MoreHorizontal className="size-4" />
              </Button>

              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50">
                  <button
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                    onClick={() => {
                      setShowMenu(false);
                      onEdit(store._id);
                    }}
                  >
                    <Pencil className="size-3" />
                    Edit Source
                  </button>
                  <button
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-destructive"
                    onClick={() => {
                      setShowMenu(false);
                      onDelete(store._id);
                    }}
                  >
                    <Trash2 className="size-3" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StoresSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function SourcesList() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStoreId, setEditingStoreId] = useState<Id<"stores"> | null>(null);
  const [cooldownByStore, setCooldownByStore] = useState<Record<string, number>>({});
  const [now, setNow] = useState(() => Date.now());

  const {
    data: stores,
    isPending,
    error,
  } = useQuery(convexQuery(api.admin.sources.listStores, {}));

  const runNow = useConvexMutation(api.admin.sources.runNow);
  const deleteStore = useConvexMutation(api.admin.sources.deleteStore);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRunNow = async (storeId: Id<"stores">) => {
    const result = await runNow({ storeId });

    if (!result.success && result.cooldownRemainingMs > 0) {
      setCooldownByStore((prev) => ({
        ...prev,
        [storeId.toString()]: Date.now() + result.cooldownRemainingMs,
      }));
      return;
    }

    if (result.success) {
      setCooldownByStore((prev) => {
        const next = { ...prev };
        delete next[storeId.toString()];
        return next;
      });
    }
  };

  const handleDelete = (storeId: Id<"stores">) => {
    if (confirm("Are you sure you want to delete this source?")) {
      void deleteStore({ storeId });
    }
  };

  const handleAddSource = () => {
    setEditingStoreId(null);
    setModalOpen(true);
  };

  const handleEditSource = (storeId: Id<"stores">) => {
    setEditingStoreId(storeId);
    setModalOpen(true);
  };

  const cooldownRemainingById = useMemo(() => {
    const result: Record<string, number> = {};

    Object.entries(cooldownByStore).forEach(([storeId, cooldownUntil]) => {
      result[storeId] = Math.max(0, cooldownUntil - now);
    });

    return result;
  }, [cooldownByStore, now]);

  if (error) {
    return (
      <div className="bg-error-bg border-2 border-black p-4">
        <p className="font-bold text-black">Error loading sources</p>
        <Button
          variant="default"
          size="sm"
          className="mt-2"
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: ["convex", "admin.sources.listStores"] })
          }
        >
          RETRY
        </Button>
      </div>
    );
  }

  if (isPending) {
    return <StoresSkeleton />;
  }

  if (!stores || stores.length === 0) {
    return (
      <>
        <Empty>
          <EmptyHeader>
            <EmptyTitle>ADD YOUR FIRST SOURCE</EmptyTitle>
            <EmptyDescription>Configure a store to start crawling deals</EmptyDescription>
          </EmptyHeader>
          <Button variant="default" size="lg" onClick={handleAddSource}>
            <Plus className="size-4 mr-2" />
            Add Source
          </Button>
        </Empty>
        <SourceModal
          open={modalOpen}
          storeId={editingStoreId}
          onOpenChange={(nextOpen) => {
            setModalOpen(nextOpen);
            if (!nextOpen) {
              setEditingStoreId(null);
            }
          }}
        />
      </>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button variant="default" onClick={handleAddSource}>
            <Plus className="size-4 mr-2" />
            Add Source
          </Button>
        </div>

        <div className="space-y-4">
          {(stores as StoreWithStats[]).map((store) => {
            const cooldownRemainingMs = cooldownRemainingById[store._id.toString()] ?? 0;

            return (
              <StoreCard
                key={store._id.toString()}
                store={store}
                onRunNow={handleRunNow}
                onEdit={handleEditSource}
                onDelete={handleDelete}
                cooldownRemainingMs={cooldownRemainingMs}
              />
            );
          })}
        </div>
      </div>

      <SourceModal
        open={modalOpen}
        storeId={editingStoreId}
        onOpenChange={(nextOpen) => {
          setModalOpen(nextOpen);
          if (!nextOpen) {
            setEditingStoreId(null);
          }
        }}
      />
    </>
  );
}
