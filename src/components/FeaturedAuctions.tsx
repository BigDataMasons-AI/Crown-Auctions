import { useState } from "react";
import { AuctionCard } from "./AuctionCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import diamondRing from "@/assets/auction-diamond-ring.jpg";
import swissWatch from "@/assets/auction-swiss-watch.jpg";
import necklace from "@/assets/auction-necklace.jpg";
import rolex from "@/assets/auction-rolex.jpg";
import earrings from "@/assets/auction-earrings.jpg";
import looseDiamond from "@/assets/auction-loose-diamond.jpg";

type Category = "all" | "jewellery" | "watches" | "diamonds";

interface AuctionItem {
  id: string;
  title: string;
  image: string;
  startingPrice: number;
  currentBid: number;
  endTime: Date;
  category: "jewellery" | "watches" | "diamonds";
  bids: number;
  status?: string;
}

export const FeaturedAuctions = () => {
  const [selectedCategory, setSelectedCategory] = useState<Category>("all");

  const auctions: AuctionItem[] = [
    {
      id: "1",
      title: "Platinum Diamond Solitaire Ring - 2.5 Carat",
      image: diamondRing,
      startingPrice: 8500,
      currentBid: 12800,
      endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000),
      category: "jewellery",
      bids: 24,
      status: "active",
    },
    {
      id: "2",
      title: "Swiss Chronograph Watch - Black Leather Strap",
      image: swissWatch,
      startingPrice: 3200,
      currentBid: 4950,
      endTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
      category: "watches",
      bids: 18,
      status: "active",
    },
    {
      id: "3",
      title: "18K Gold Diamond Pendant Necklace",
      image: necklace,
      startingPrice: 2800,
      currentBid: 3650,
      endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      category: "jewellery",
      bids: 15,
      status: "paused",
    },
    {
      id: "4",
      title: "Vintage Rolex Datejust - 18K Gold",
      image: rolex,
      startingPrice: 15000,
      currentBid: 22500,
      endTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000),
      category: "watches",
      bids: 42,
      status: "active",
    },
    {
      id: "5",
      title: "Sapphire & Diamond Drop Earrings - White Gold",
      image: earrings,
      startingPrice: 5500,
      currentBid: 7200,
      endTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 15 * 60 * 60 * 1000),
      category: "jewellery",
      bids: 28,
      status: "active",
    },
    {
      id: "6",
      title: "GIA Certified 3.2 Carat Loose Diamond - VS1",
      image: looseDiamond,
      startingPrice: 18000,
      currentBid: 24800,
      endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000),
      category: "diamonds",
      bids: 31,
      status: "active",
    },
  ];

  const filteredAuctions =
    selectedCategory === "all"
      ? auctions
      : auctions.filter((auction) => auction.category === selectedCategory);

  return (
    <section id="auctions" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Featured Auctions</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Browse our current live auctions and place your bids
          </p>
          <div className="w-24 h-1 bg-gold mx-auto"></div>
        </div>

        <Tabs
          defaultValue="all"
          className="mb-12"
          onValueChange={(value) => setSelectedCategory(value as Category)}
        >
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-4 h-12">
            <TabsTrigger value="all" className="text-sm font-medium">
              All
            </TabsTrigger>
            <TabsTrigger value="jewellery" className="text-sm font-medium">
              Jewellery
            </TabsTrigger>
            <TabsTrigger value="watches" className="text-sm font-medium">
              Watches
            </TabsTrigger>
            <TabsTrigger value="diamonds" className="text-sm font-medium">
              Diamonds
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in">
          {filteredAuctions.map((auction) => (
            <AuctionCard key={auction.id} {...auction} />
          ))}
        </div>

        {filteredAuctions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              No auctions found in this category. Check back soon!
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
