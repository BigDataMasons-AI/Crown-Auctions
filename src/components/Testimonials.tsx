import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

export const Testimonials = () => {
  const testimonials = [
    {
      text: "What a great selection there was, I purchased 2 items and was very satisfied. Thank you!",
      author: "Sarah M.",
      rating: 5
    },
    {
      text: "Professional service and authentic luxury items. The authentication process gave me complete confidence in my purchase.",
      author: "James R.",
      rating: 5
    },
    {
      text: "I've been buying from Crown Auctions for years. Their Swiss watch collection is unmatched and prices are exceptional.",
      author: "Michael K.",
      rating: 5
    }
  ];

  return (
    <section id="sellers" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">What Our Clients Say</h2>
          <div className="w-24 h-1 bg-gold mx-auto"></div>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <Card 
              key={index} 
              className="border-2 hover:border-gold transition-all duration-300 hover:shadow-lg"
            >
              <CardContent className="pt-6">
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-gold text-gold" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-6 italic">
                  "{testimonial.text}"
                </p>
                <p className="font-semibold text-gold">— {testimonial.author}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
