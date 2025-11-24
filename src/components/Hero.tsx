import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-luxury-auction.jpg";

export const Hero = () => {
  return (
    <section id="home" className="relative h-screen flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70"></div>
      </div>
      
      <div className="relative z-10 text-center px-4 animate-fade-in">
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 tracking-tight">
          CROWN AUCTIONS
        </h1>
        <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto font-light">
          Surplus Retail Stock & Vendor Liquidations from numerous licensed dealers
        </p>
        <Button 
          variant="gold" 
          size="lg" 
          className="text-base px-8 py-6 h-auto uppercase"
        >
          Watch Auctions
        </Button>
      </div>

      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/50 rounded-full flex items-start justify-center p-2">
          <div className="w-1 h-3 bg-white/50 rounded-full"></div>
        </div>
      </div>
    </section>
  );
};
