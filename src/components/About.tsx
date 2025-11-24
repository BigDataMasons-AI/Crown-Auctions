import { Button } from "@/components/ui/button";

export const About = () => {
  return (
    <section id="about" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Crown Auctions</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Trusted By Jewellery Lovers and Watch Enthusiasts Worldwide
          </p>
          
          <div className="w-24 h-1 bg-gold mx-auto mb-12"></div>
          
          <p className="text-lg leading-relaxed mb-8">
            Crown Auctions Specialise in Fine Jewellery, Diamonds, and Swiss Watch Auctions. 
            Under license we auction surplus personal & retail items, liquidated and receiver 
            items, along final stock clearances & more.
          </p>
          
          <div className="aspect-video bg-muted rounded-lg mb-8 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-gold/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-gold" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground">Crown Auctions Introduction</p>
            </div>
          </div>
          
          <Button variant="gold" size="lg" className="uppercase tracking-wide">
            Register to Make a Bid
          </Button>
        </div>
      </div>
    </section>
  );
};
