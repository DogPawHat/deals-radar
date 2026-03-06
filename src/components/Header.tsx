import { Link } from "@tanstack/react-router";
import { useAuth } from "@clerk/tanstack-react-start";
import { Button } from "@/components/ui/button";

export default function Header() {
  const { isSignedIn } = useAuth();

  return (
    <header className="bg-primary border-b-2 border-foreground sticky top-0 z-40">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-0">
            <span className="font-sans font-extrabold text-2xl tracking-tight text-foreground">
              DEALS
            </span>
            <span className="font-mono font-semibold text-2xl tracking-tight text-green-gain ml-1 -rotate-2">
              RADAR
            </span>
          </Link>

          {isSignedIn && (
            <Link to="/admin/sources">
              <Button
                variant="outline"
                size="sm"
                className="border-2 border-foreground neo-shadow-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all bg-background"
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
