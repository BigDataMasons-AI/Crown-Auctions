import { useState, useEffect } from "react";
import { AuctionCard } from "./AuctionCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  display_order: number;
}

interface AuctionItem {
  id: string;
  title: string;
  image: string;
  startingPrice: number;
  currentBid: number;
  endTime: Date;
  category: string; // Use slug from database
  bids: number;
  status?: string;
}

export const FeaturedAuctions = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [categories, setCategories] = useState<Category[]>([]);
  const [auctions, setAuctions] = useState<AuctionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
    fetchApprovedAuctions();
    
    // Set up real-time subscription for new approvals
    const channel = supabase
      .channel('featured-auctions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'auctions',
          filter: 'approval_status=eq.approved'
        },
        () => {
          fetchApprovedAuctions();
        }
      )
      .subscribe();

    // Set up real-time subscription for category changes
    const categoriesChannel = supabase
      .channel('featured-categories')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories'
        },
        () => {
          fetchCategories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(categoriesChannel);
    };
  }, []);

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchApprovedAuctions = async () => {
    try {
      setLoading(true);
      
      // Fetch approved and active auctions
      const { data: auctionsData, error: auctionsError } = await supabase
        .from('auctions')
        .select('*')
        .eq('approval_status', 'approved')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (auctionsError) throw auctionsError;

      if (!auctionsData || auctionsData.length === 0) {
        setAuctions([]);
        setLoading(false);
        return;
      }

      // Fetch bid counts for each auction
      const auctionIds = auctionsData.map(a => a.id);
      const { data: bidsData, error: bidsError } = await supabase
        .from('bids')
        .select('auction_id, bid_amount')
        .in('auction_id', auctionIds)
        .eq('status', 'active');

      if (bidsError) {
        console.error('Error fetching bids:', bidsError);
      }

      // Calculate bid counts and current highest bid per auction
      const bidCounts = new Map<string, number>();
      const highestBids = new Map<string, number>();

      bidsData?.forEach(bid => {
        const count = bidCounts.get(bid.auction_id) || 0;
        bidCounts.set(bid.auction_id, count + 1);
        
        const currentHighest = highestBids.get(bid.auction_id) || 0;
        if (bid.bid_amount > currentHighest) {
          highestBids.set(bid.auction_id, bid.bid_amount);
        }
      });

      // Map database data to component format
      // Filter out ended auctions (end_time in the past)
      const now = new Date();
      const mappedAuctions: AuctionItem[] = auctionsData
        .filter(auction => {
          const endTime = new Date(auction.end_time);
          return endTime > now; // Only show auctions that haven't ended
        })
        .map(auction => {
          // Use category slug directly from database
          const categorySlug = auction.category?.toLowerCase() || '';

          const bidCount = bidCounts.get(auction.id) || 0;
          const highestBid = highestBids.get(auction.id) || auction.current_bid || auction.starting_price;
          const imageUrl = auction.image_urls && auction.image_urls.length > 0 
            ? auction.image_urls[0] 
            : '/placeholder.svg';

          return {
            id: auction.id,
            title: auction.title,
            image: imageUrl,
            startingPrice: auction.starting_price,
            currentBid: highestBid,
            endTime: new Date(auction.end_time),
            category: categorySlug, // Use slug from database
            bids: bidCount,
            status: auction.status || 'active',
          };
        });

      setAuctions(mappedAuctions);
    } catch (error) {
      console.error('Error fetching approved auctions:', error);
      setAuctions([]);
    } finally {
      setLoading(false);
    }
  };

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
          onValueChange={(value) => setSelectedCategory(value)}
        >
          <TabsList 
            className="w-full max-w-2xl mx-auto h-12 flex flex-wrap justify-center gap-1"
            style={{ 
              gridTemplateColumns: `repeat(${categories.length + 1}, minmax(0, 1fr))`,
              display: 'grid'
            }}
          >
            <TabsTrigger value="all" className="text-sm font-medium">
              All
            </TabsTrigger>
            {categories.map((category) => (
              <TabsTrigger 
                key={category.id} 
                value={category.slug} 
                className="text-sm font-medium"
              >
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {(loading || categoriesLoading) ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gold" />
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </section>
  );
};
