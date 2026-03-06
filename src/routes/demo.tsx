import { createFileRoute } from "@tanstack/react-router";
import { DealCard } from "@/features/deals/dealCard";

export const Route = createFileRoute("/demo")({
  component: DemoPage,
});

const MOCK_DEALS = [
  {
    _id: "demo-1",
    title: "Sony WH-1000XM5 Wireless Noise Cancelling Headphones",
    url: "https://example.com/deal1",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop",
    price: 279.99,
    currency: "USD",
    msrp: 399.99,
    percentOff: 30,
    store: { name: "Amazon" },
  },
  {
    _id: "demo-2",
    title: "Apple MacBook Air 15-inch M3 Chip",
    url: "https://example.com/deal2",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop",
    price: 1099.0,
    currency: "USD",
    msrp: 1299.0,
    percentOff: 15,
    store: { name: "Best Buy" },
  },
  {
    _id: "demo-3",
    title: 'Samsung 65" QLED 4K Smart TV',
    url: "https://example.com/deal3",
    image: "https://images.unsplash.com/photo-1593359677879-a4b92c804a1d?w=400&h=300&fit=crop",
    price: 799.99,
    currency: "USD",
    msrp: 1199.99,
    percentOff: 33,
    store: { name: "Walmart" },
  },
  {
    _id: "demo-4",
    title: "Nintendo Switch OLED Model",
    url: "https://example.com/deal4",
    image: "https://images.unsplash.com/photo-1578303512597-81a3a2390096?w=400&h=300&fit=crop",
    price: 299.99,
    currency: "USD",
    msrp: 349.99,
    percentOff: 14,
    store: { name: "Target" },
  },
  {
    _id: "demo-5",
    title: "Dyson V15 Detect Vacuum Cleaner",
    url: "https://example.com/deal5",
    image: "https://images.unsplash.com/photo-1558317381-386641a407a9?w=400&h=300&fit=crop",
    price: 549.0,
    currency: "USD",
    msrp: 749.99,
    percentOff: 27,
    store: { name: "Dyson" },
  },
  {
    _id: "demo-6",
    title: "Bose SoundLink Flex Bluetooth Speaker",
    url: "https://example.com/deal6",
    image: "https://images.unsplash.com/photo-1608043152769-00a9f1dadea1?w=400&h=300&fit=crop",
    price: 119.0,
    currency: "USD",
    msrp: 149.0,
    percentOff: 20,
    store: { name: "Bose" },
  },
  {
    _id: "demo-7",
    title: "iPad Pro 12.9-inch M2 Chip",
    url: "https://example.com/deal7",
    image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=300&fit=crop",
    price: 899.0,
    currency: "USD",
    msrp: 1099.0,
    percentOff: 18,
    store: { name: "Apple" },
  },
  {
    _id: "demo-8",
    title: "Instant Pot Duo 7-in-1 Electric Pressure Cooker",
    url: "https://example.com/deal8",
    image: "https://images.unsplash.com/photo-1585515320310-2294a0432726?w=400&h=300&fit=crop",
    price: 59.99,
    currency: "USD",
    msrp: 99.99,
    percentOff: 40,
    store: { name: "Amazon" },
  },
];

function DemoPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-sans font-bold text-4xl uppercase tracking-wide">Demo Deals</h1>
          <p className="text-muted-foreground mt-2">Sample deals for design preview</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {MOCK_DEALS.map((deal) => (
            <DealCard key={deal._id} deal={deal} view="grid" />
          ))}
        </div>
      </div>
    </div>
  );
}
