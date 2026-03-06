import { Badge } from "@/components/ui/badge";
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
        <Card className="group/card flex cursor-pointer flex-row items-center gap-4 p-4">
          <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-sm border-2 border-foreground bg-secondary">
            {deal.image ? (
              <img src={deal.image} alt={deal.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-secondary" />
            )}
          </div>
          <CardContent className="flex-1 p-0">
            <h3 className="mb-1 line-clamp-1 text-lg leading-tight font-extrabold">{deal.title}</h3>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {deal.store?.name ?? "Unknown Store"}
            </p>
          </CardContent>
          <div className="text-right flex-shrink-0">
            <div className="font-mono text-xl font-bold text-green-gain">{currentPrice}</div>
            {originalPrice && (
              <div className="font-mono text-sm text-muted-foreground line-through">
                {originalPrice}
              </div>
            )}
            <Badge className="mt-2">-{deal.percentOff.toFixed(0)}%</Badge>
          </div>
        </Card>
      </a>
    );
  }

  const progressWidth = Math.min(deal.percentOff, 100);

  return (
    <a href={`/deals/${deal._id}`}>
      <Card className="h-full cursor-pointer group/card">
        <div className="relative aspect-[240/160] w-full overflow-hidden border-b-2 border-foreground bg-secondary">
          {deal.image ? (
            <img src={deal.image} alt={deal.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-secondary" />
          )}
          <Badge className="absolute top-3 right-3">-{deal.percentOff.toFixed(0)}%</Badge>
        </div>
        <CardContent className="p-4 flex flex-col gap-2 flex-1">
          <h3 className="line-clamp-2 text-base leading-tight font-extrabold">{deal.title}</h3>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {deal.store?.name ?? "Unknown Store"}
          </p>
          <div className="mt-auto pt-2">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-xl font-bold text-green-gain">{currentPrice}</span>
              {originalPrice && (
                <span className="font-mono text-sm text-muted-foreground line-through">
                  {originalPrice}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-2 flex-1 overflow-hidden rounded-sm border-2 border-foreground bg-muted">
                <div
                  className="h-full bg-green-gain transition-all"
                  style={{ width: `${progressWidth}%` }}
                />
              </div>
              <span className="font-mono text-sm font-bold whitespace-nowrap text-green-gain">
                -{deal.percentOff.toFixed(0)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </a>
  );
}
