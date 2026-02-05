import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { useAuth } from "@clerk/tanstack-react-start";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const location = useLocation();
  const { isSignedIn, signOut } = useAuth();

  const isSourcesPage = location.pathname === "/admin/sources";

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-sans font-bold text-2xl uppercase mb-4">Admin Access Required</h1>
          <a href="/sign-in">
            <Button variant="default" size="lg">
              Sign In
            </Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-6">
              <a href="/" className="font-mono font-bold text-xl uppercase tracking-wider">
                <span className="text-muted-foreground">DEALS</span>
                <span className="text-green-gain">RADAR</span>
              </a>

              <nav className="flex items-center gap-1">
                <a href="/admin/sources">
                  <Button
                    variant={isSourcesPage ? "default" : "ghost"}
                    size="sm"
                    className={cn("uppercase tracking-wide", !isSourcesPage && "hover:bg-muted")}
                  >
                    Sources
                  </Button>
                </a>
              </nav>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut()}
              className="uppercase text-muted-foreground hover:text-foreground"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </div>
    </div>
  );
}
