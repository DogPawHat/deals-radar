"use client";

import { useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { convexQuery, useConvex } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api.js";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Grid3X3, List, ChevronDown } from "lucide-react";
import { DealCard } from "./dealCard";
import { cn } from "@/lib/utils";

type Tab = "newest" | "biggestDrop" | "price" | "all";

interface Deal {
  _id: string;
  title: string;
  url: string;
  image?: string | null;
  price: number;
  currency: string;
  msrp?: number | null;
  percentOff: number;
  store?: { name: string } | null;
}

interface QueryResult {
  deals: readonly Deal[];
  cursor?: string;
}

const PAGE_SIZE = 20;

const TAB_CONFIG: { value: Tab; label: string; queryFn: typeof api.publicDeals.getDealsNewest }[] =
  [
    { value: "newest", label: "NEWEST", queryFn: api.publicDeals.getDealsNewest },
    { value: "biggestDrop", label: "BIGGEST DROP", queryFn: api.publicDeals.getDealsBiggestDrop },
    { value: "price", label: "PRICE", queryFn: api.publicDeals.getDealsByPrice },
    { value: "all", label: "ALL", queryFn: api.publicDeals.getDealsAll },
  ];

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch {
      // ignore
    }
  };

  return [storedValue, setValue];
}

const SkeletonGrid = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="bg-card rounded-sm">
        <div className="aspect-[240/160] bg-secondary" />
        <div className="p-4 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="pt-2 space-y-1">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-2 w-full" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export function DealsFeed() {
  const [activeTab, setActiveTab] = useState<Tab>("newest");
  const [view, setView] = useLocalStorage<"grid" | "list">("dealView", "grid");
  const convex = useConvex();

  const currentQuery = TAB_CONFIG.find((t) => t.value === activeTab)!;

  const queryKey = useMemo(
    () => convexQuery(currentQuery.queryFn, { limit: PAGE_SIZE }).queryKey,
    [currentQuery.queryFn],
  );

  const { data, isPending, error, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useInfiniteQuery({
      queryKey,
      initialPageParam: undefined as string | undefined,
      queryFn: ({ pageParam }) =>
        convex.query(currentQuery.queryFn, {
          limit: PAGE_SIZE,
          cursor: pageParam ?? undefined,
        }),
      getNextPageParam: (lastPage: QueryResult) => lastPage.cursor ?? undefined,
      staleTime: Infinity,
    });

  const handleViewToggle = (newView: "grid" | "list") => {
    setView(newView);
  };

  if (error) {
    return (
      <div className="bg-red-loss-muted border-l-2 border-red-loss p-4 rounded-sm">
        <p className="font-bold text-foreground">Error loading deals</p>
        <Button variant="secondary" size="sm" className="mt-2" onClick={() => refetch()}>
          RETRY
        </Button>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex gap-1 bg-muted p-[3px] rounded-lg">
            {TAB_CONFIG.map((tab) => (
              <div key={tab.value} className="px-6 py-2 font-sans font-bold uppercase text-sm">
                {tab.label}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-secondary rounded-sm" />
            <div className="w-9 h-9 bg-card border border-border rounded-sm" />
          </div>
        </div>
        <SkeletonGrid />
      </div>
    );
  }

  const deals = data?.pages.flatMap((page) => page.deals) ?? [];

  if (deals.length === 0) {
    return (
      <div className="text-center py-16">
        <h2 className="font-sans font-bold text-4xl uppercase tracking-wide text-muted-foreground">
          NO DEALS FOUND
        </h2>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
          <TabsList variant="line">
            {TAB_CONFIG.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "px-6 py-2 font-sans font-bold uppercase tracking-wide text-sm",
                  "hover:text-foreground",
                )}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Button
            variant={view === "grid" ? "default" : "outline"}
            size="icon-sm"
            onClick={() => handleViewToggle("grid")}
            aria-label="Grid view"
          >
            <Grid3X3 className="size-4" />
          </Button>
          <Button
            variant={view === "list" ? "default" : "outline"}
            size="icon-sm"
            onClick={() => handleViewToggle("list")}
            aria-label="List view"
          >
            <List className="size-4" />
          </Button>
        </div>
      </div>

      <div
        className={cn(
          view === "grid"
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            : "flex flex-col gap-4",
        )}
      >
        {deals.map((deal) => (
          <DealCard key={deal._id} deal={deal} view={view} />
        ))}
      </div>

      {deals.length > 0 && hasNextPage && (
        <div className="flex justify-center pt-8">
          <Button
            variant="default"
            size="xl"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "LOADING..." : "LOAD MORE"}
            <ChevronDown className="ml-2 size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
