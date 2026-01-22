import { Link } from "@tanstack/react-router";
import { useAuth } from "@clerk/tanstack-react-start";
import { Button } from "@/components/ui/button";

export default function Header() {
  const { isSignedIn } = useAuth();

  return (
    <header className="bg-white border-b-3 border-black sticky top-0 z-40">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-display font-black text-2xl uppercase tracking-wider">
              DEALS RADAR
            </span>
          </Link>

          {isSignedIn && (
            <a href="/admin/sources">
              <Button variant="outline" size="sm">
                ADMIN
              </Button>
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
