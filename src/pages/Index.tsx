import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { Features } from "@/components/Features";
import { FeaturedAuctions } from "@/components/FeaturedAuctions";
import { Testimonials } from "@/components/Testimonials";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <Hero />
      <About />
      <Features />
      <FeaturedAuctions />
      <Testimonials />
      <Footer />
    </div>
  );
};

export default Index;
