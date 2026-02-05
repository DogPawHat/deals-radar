import { Card, CardContent } from "@/components/ui/card";

interface DealCardProps {
  deal: {
    _id: string;
    title: string;
    url: string;
    image?: string | null;
    price: number;
    currency: string;
    msrp?: number | null;
    percentOff: number;
    store?: { name: string } | null;
  };
  view?: "grid" | "list";
}

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(price);
}

export function DealCard({ deal, view = "grid" }: DealCardProps) {
  const currentPrice = formatPrice(deal.price, deal.currency);
  const originalPrice = deal.msrp ? formatPrice(deal.msrp, deal.currency) : null;

  if (view === "list") {
    return (
      <a href={`/deals/${deal._id}`}>
        <Card className="group/card flex flex-row items-center p-4 gap-4 cursor-pointer">
          <div className="w-20 h-20 flex-shrink-0 bg-secondary rounded-sm overflow-hidden">
            {deal.image ? (
              <img src={deal.image} alt={deal.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-secondary" />
            )}
          </div>
          <CardContent className="flex-1 p-0">
            <h3 className="font-sans font-bold text-lg leading-tight line-clamp-1 mb-1">
              {deal.title}
            </h3>
            <p className="text-muted-foreground text-sm mb-2">
              {deal.store?.name ?? "Unknown Store"}
            </p>
          </CardContent>
          <div className="text-right flex-shrink-0">
            <div className="font-mono font-semibold text-xl text-green-gain">{currentPrice}</div>
            {originalPrice && (
              <div className="text-muted-foreground text-sm line-through font-mono">
                {originalPrice}
              </div>
            )}
            <div className="inline-block bg-green-gain-muted text-green-gain text-xs font-mono font-semibold px-2 py-0.5 mt-1 rounded-sm">
              -{deal.percentOff.toFixed(0)}%
            </div>
          </div>
        </Card>
      </a>
    );
  }

  const progressWidth = Math.min(deal.percentOff, 100);

  return (
    <a href={`/deals/${deal._id}`}>
      <Card className="h-full cursor-pointer group/card">
        <div className="aspect-[240/160] w-full bg-secondary overflow-hidden relative">
          {deal.image ? (
            <img src={deal.image} alt={deal.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-secondary" />
          )}
        </div>
        <CardContent className="p-4 flex flex-col gap-2 flex-1">
          <h3 className="font-sans font-bold text-base leading-tight line-clamp-2">{deal.title}</h3>
          <p className="text-muted-foreground text-sm">{deal.store?.name ?? "Unknown Store"}</p>
          <div className="mt-auto pt-2">
            <div className="flex items-baseline gap-2">
              <span className="font-mono font-semibold text-xl text-green-gain">
                {currentPrice}
              </span>
              {originalPrice && (
                <span className="text-muted-foreground text-sm line-through font-mono">
                  {originalPrice}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-2 bg-secondary rounded-sm overflow-hidden">
                <div
                  className="h-full bg-green-gain transition-all"
                  style={{ width: `${progressWidth}%` }}
                />
              </div>
              <span className="font-mono font-semibold text-sm text-green-gain whitespace-nowrap">
                -{deal.percentOff.toFixed(0)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </a>
  );
}
