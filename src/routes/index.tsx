import { createFileRoute } from "@tanstack/react-router";
import { DealsFeed } from "@/features/deals/dealsFeed";

export const Route = createFileRoute("/")({
  component: DealsPage,
});

function DealsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DealsFeed />
      </div>
    </div>
  );
}
