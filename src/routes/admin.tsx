import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { Show, SignInButton, SignUpButton, SignOutButton } from "@clerk/tanstack-react-start";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const location = useLocation();

  const isSourcesPage = location.pathname === "/admin/sources";

  return (
    <div className="min-h-screen bg-background">
      <Show when={"signed-out"}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="font-sans font-bold text-2xl uppercase mb-4">Admin Access Required</h1>
            <SignInButton />
            <SignUpButton />
          </div>
        </div>
      </Show>
      <Show when={"signed-in"}>
        <div className="border-b border-border bg-card sticky top-0 z-40">
          <div className="max-w-350 mx-auto px-4 sm:px-6 lg:px-8">
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
                className="uppercase text-muted-foreground hover:text-foreground"
                render={<SignOutButton />}
              />
            </div>
          </div>
        </div>

        <div className="max-w-350 mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </Show>
    </div>
  );
}
