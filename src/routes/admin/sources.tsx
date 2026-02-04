import { createFileRoute } from "@tanstack/react-router";
import { SourcesList } from "@/features/admin/sourcesList";

export const Route = createFileRoute("/admin/sources")({
  component: AdminSourcesPage,
});

function AdminSourcesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-3xl uppercase tracking-wide">Sources</h1>
      </div>

      <SourcesList />
    </div>
  );
}
