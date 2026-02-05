import { Link } from "@tanstack/react-router";
import { useAuth } from "@clerk/tanstack-react-start";
import { Button } from "@/components/ui/button";

export default function Header() {
  const { isSignedIn } = useAuth();

  return (
    <header className="bg-card border-b border-border sticky top-0 z-40">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-mono font-bold text-xl tracking-wider">
              <span className="text-muted-foreground">DEALS</span>
              <span className="text-green-gain">RADAR</span>
            </span>
          </Link>

          {isSignedIn && (
            <Link to="/admin/sources">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
              >
                ADMIN
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
