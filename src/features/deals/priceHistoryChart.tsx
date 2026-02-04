interface PriceHistoryPoint {
  price: number;
  at: number;
}

interface PriceHistoryChartProps {
  history: readonly PriceHistoryPoint[];
  currency: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(price);
}

function formatDateLabel(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
  }).format(new Date(timestamp));
}

export function PriceHistoryChart({ history, currency }: PriceHistoryChartProps) {
  const since = Date.now() - 30 * DAY_MS;
  const points = history.filter((point) => point.at >= since).sort((a, b) => a.at - b.at);

  const hasSeries = points.length > 1;
  const minPrice = Math.min(...points.map((point) => point.price), 0);
  const maxPrice = Math.max(...points.map((point) => point.price), 0);
  const range = maxPrice - minPrice || 1;

  const chartLeft = 8;
  const chartRight = 96;
  const chartTop = 8;
  const chartBottom = 92;
  const chartHeight = chartBottom - chartTop;
  const chartWidth = chartRight - chartLeft;

  const coordinates = points.map((point, index) => {
    const x =
      points.length === 1
        ? chartLeft + chartWidth / 2
        : chartLeft + (index / (points.length - 1)) * chartWidth;
    const y = chartBottom - ((point.price - minPrice) / range) * chartHeight;
    return { x, y };
  });

  const path = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const tickCount = Math.min(4, points.length);
  const ticks = Array.from({ length: tickCount })
    .map((_, index) => {
      if (points.length === 0) return undefined;
      if (points.length === 1) return points[0];
      const position = Math.round((index / (tickCount - 1)) * (points.length - 1));
      return points[position];
    })
    .filter((tick): tick is PriceHistoryPoint => Boolean(tick));

  return (
    <div className="border-2 border-black bg-white p-4">
      <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-3">
        <h2 className="font-display font-bold text-xl uppercase tracking-wide">
          Price History (30 days)
        </h2>
        <span className="text-xs font-bold uppercase text-concrete-gray">30D</span>
      </div>

      <div className="relative h-48 border-2 border-black bg-white">
        <svg viewBox="0 0 104 100" className="absolute inset-0 h-full w-full" role="img">
          <line
            x1={chartLeft}
            y1={chartTop}
            x2={chartLeft}
            y2={chartBottom}
            className="stroke-black"
            strokeWidth={1.5}
          />
          <line
            x1={chartLeft}
            y1={chartBottom}
            x2={chartRight}
            y2={chartBottom}
            className="stroke-black"
            strokeWidth={1.5}
          />

          {hasSeries && (
            <path d={path} className="stroke-signal-red" strokeWidth={2.5} fill="none" />
          )}

          {coordinates.map((point, index) => (
            <circle
              key={`${point.x}-${point.y}-${index}`}
              cx={point.x}
              cy={point.y}
              r={2.5}
              className="fill-black"
            />
          ))}
        </svg>

        {points.length <= 1 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <span className="font-display font-bold text-sm uppercase">TRACKING STARTED</span>
            {points.length === 0 && (
              <span className="text-xs text-concrete-gray">No history yet</span>
            )}
          </div>
        )}

        {points.length > 0 && (
          <>
            <span className="absolute left-2 top-2 text-xs font-bold text-concrete-gray">
              {formatPrice(maxPrice, currency)}
            </span>
            <span className="absolute left-2 bottom-2 text-xs font-bold text-concrete-gray">
              {formatPrice(minPrice, currency)}
            </span>
          </>
        )}
      </div>

      {ticks.length > 1 && (
        <div className="mt-3 flex justify-between text-xs font-bold text-concrete-gray">
          {ticks.map((tick) => (
            <span key={tick.at}>{formatDateLabel(tick.at)}</span>
          ))}
        </div>
      )}
    </div>
  );
}
