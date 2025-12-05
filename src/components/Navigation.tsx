import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { Link } from "react-router-dom";
import { User, ShieldCheck, Plus } from "lucide-react";

export const Navigation = () => {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gold rounded-sm transform rotate-45"></div>
            <h1 className="text-2xl font-bold tracking-tight">CROWN AUCTIONS</h1>
          </Link>
          
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/#home" className="text-sm font-medium hover:text-gold transition-colors">
              HOME
            </Link>
            <Link to="/#about" className="text-sm font-medium hover:text-gold transition-colors">
              ABOUT
            </Link>
            <Link to="/#buyers" className="text-sm font-medium hover:text-gold transition-colors">
              BUYERS
            </Link>
            <Link to="/#sellers" className="text-sm font-medium hover:text-gold transition-colors">
              SELLERS
            </Link>
            <Link to="/#auctions" className="text-sm font-medium hover:text-gold transition-colors">
              BROWSE AUCTIONS
            </Link>
            {user ? (
              <div className="flex items-center gap-2 ml-4">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/submit-auction">
                    <Plus className="mr-2 h-4 w-4" />
                    SUBMIT ITEM
                  </Link>
                </Button>
                {isAdmin && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/admin">
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      ADMIN
                    </Link>
                  </Button>
                )}
                <Button variant="gold" size="sm" asChild>
                  <Link to="/dashboard">
                    <User className="mr-2 h-4 w-4" />
                    DASHBOARD
                  </Link>
                </Button>
              </div>
            ) : (
              <Button variant="gold" size="sm" className="ml-4" asChild>
                <Link to="/auth">SIGN IN</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
