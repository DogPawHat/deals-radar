"use client";

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api.js";
import { Id } from "@convex/_generated/dataModel.js";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/error-banner";
import { PriceHistoryChart } from "@/features/deals/priceHistoryChart";

export const Route = createFileRoute("/deals/$id")({
  component: DealDetailPage,
});

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(price);
}

function DealDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-4 w-40 bg-muted border-2 border-black" />
      <div className="grid grid-cols-1 md:grid-cols-2 border-2 border-black">
        <div className="aspect-[4/3] bg-muted border-b-2 border-black md:border-b-0 md:border-r-2" />
        <div className="p-6 space-y-4">
          <div className="h-8 w-3/4 bg-muted border-2 border-black" />
          <div className="h-4 w-32 bg-muted border-2 border-black" />
          <div className="h-8 w-40 bg-muted border-2 border-black" />
          <div className="h-4 w-full bg-muted border-2 border-black" />
          <div className="h-12 w-40 bg-muted border-2 border-black" />
        </div>
      </div>
      <div className="border-2 border-black bg-muted h-56" />
    </div>
  );
}

function DealDetailPage() {
  const { id } = Route.useParams();
  const dealId = id as Id<"deals">;

  const dealQuery = useQuery(convexQuery(api.publicDeals.getDealById, { dealId }));
  const historyQuery = useQuery(convexQuery(api.priceHistory.getPriceHistory, { dealId }));

  if (dealQuery.isPending) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <DealDetailSkeleton />
        </div>
      </div>
    );
  }

  if (dealQuery.error || !dealQuery.data) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorBanner title="Error loading deal">
            The deal may have been removed or the server is unavailable.
          </ErrorBanner>
        </div>
      </div>
    );
  }

  const { deal, store } = dealQuery.data;
  const currentPrice = formatPrice(deal.price, deal.currency);
  const originalPrice = deal.msrp ? formatPrice(deal.msrp, deal.currency) : null;
  const percentOff = Math.min(Math.max(deal.percentOff, 0), 100);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide"
        >
          &lt;- Back to deals
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 border-2 border-black bg-white">
          <div className="aspect-[4/3] bg-muted border-b-2 border-black md:border-b-0 md:border-r-2 overflow-hidden">
            {deal.image ? (
              <img src={deal.image} alt={deal.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-concrete-gray" />
            )}
          </div>

          <div className="p-6 flex flex-col gap-4">
            <div className="space-y-2">
              <h1 className="font-display font-bold text-3xl uppercase tracking-wide">
                {deal.title}
              </h1>
              <p className="text-sm text-concrete-gray uppercase">
                Store: {store?.name ?? "Unknown Store"}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-baseline gap-3">
                <span className="font-display font-bold text-3xl">{currentPrice}</span>
                {originalPrice && (
                  <span className="text-lg text-concrete-gray line-through">{originalPrice}</span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-muted border-2 border-black">
                  <div className="h-full bg-signal-red" style={{ width: `${percentOff}%` }} />
                </div>
                <span className="font-display font-bold text-lg text-signal-red whitespace-nowrap">
                  {deal.percentOff.toFixed(0)}% OFF
                </span>
              </div>
            </div>

            <div className="pt-2">
              <a href={deal.url} target="_blank" rel="noreferrer">
                <Button variant="default" size="lg">
                  View Deal -&gt;
                </Button>
              </a>
            </div>
          </div>
        </div>

        {historyQuery.error ? (
          <ErrorBanner title="Error loading price history">
            Please try again in a moment.
          </ErrorBanner>
        ) : historyQuery.isPending ? (
          <div className="border-2 border-black bg-muted h-56" />
        ) : (
          <PriceHistoryChart history={historyQuery.data?.history ?? []} currency={deal.currency} />
        )}
      </div>
    </div>
  );
}
