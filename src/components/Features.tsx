import { Shield, Award, Gem } from "lucide-react";

export const Features = () => {
  const features = [
    {
      icon: Shield,
      title: "Trusted Worldwide",
      description: "We are a registered company that holds a corporation's license compliant with all Australian Business Laws, Audit Systems & Fair-Trading Practices under the Auctioneers Act 2014."
    },
    {
      icon: Award,
      title: "Expert Advice",
      description: "We offer expert advice and valuation services to help you learn the correct value of your items. Contact us for professional appraisals and guidance."
    },
    {
      icon: Gem,
      title: "Premium Selection",
      description: "GIA Certified Diamonds, Fine Jewellery & Big Brand Swiss Watches. Get your desired items at exceptional values, well below retail prices."
    }
  ];

  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-12">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="text-center group hover:transform hover:scale-105 transition-all duration-300"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gold/10 rounded-full mb-6 group-hover:bg-gold group-hover:text-white transition-colors">
                <feature.icon className="w-8 h-8 text-gold group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
