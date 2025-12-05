import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Shield, Award, ChevronLeft, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuctionBids } from "@/hooks/useAuctionBids";
import { useAuth } from "@/contexts/AuthContext";
import { useBidNotifications } from "@/contexts/BidNotificationContext";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { BidHistoryChart } from "@/components/BidHistoryChart";

interface AuctionItem {
  id: string;
  title: string;
  images: string[];
  startingPrice: number;
  currentBid: number;
  endTime: Date;
  category: string;
  description: string;
  specifications: { label: string; value: string }[];
  certificates: { name: string; issuer: string; date: string }[];
  bidHistory: { bidder: string; amount: number; time: Date }[];
  minimumIncrement: number;
}

// Removed hardcoded auctionData - now fetching from database
/* const auctionData: Record<string, AuctionItem> = {
  "1": {
    id: "1",
    title: "Platinum Diamond Solitaire Ring - 2.5 Carat",
    images: [diamondRing, diamondRing, diamondRing],
    startingPrice: 8500,
    currentBid: 12800,
    endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000),
    category: "Jewellery",
    description: "Exquisite platinum solitaire ring featuring a brilliant 2.5 carat diamond. The center stone is GIA certified with excellent cut, color grade F, and VS1 clarity. Set in a classic 6-prong platinum band.",
    specifications: [
      { label: "Metal", value: "950 Platinum" },
      { label: "Diamond Weight", value: "2.5 Carats" },
      { label: "Color Grade", value: "F (Colorless)" },
      { label: "Clarity", value: "VS1 (Very Slightly Included)" },
      { label: "Cut", value: "Excellent" },
      { label: "Ring Size", value: "6 (Resizable)" },
    ],
    certificates: [
      { name: "GIA Diamond Report", issuer: "Gemological Institute of America", date: "2024-01-15" },
      { name: "Platinum Hallmark", issuer: "Australian Assay Office", date: "2024-02-01" },
    ],
    bidHistory: [
      { bidder: "Bidder #42", amount: 12800, time: new Date(Date.now() - 1000 * 60 * 15) },
      { bidder: "Bidder #31", amount: 12500, time: new Date(Date.now() - 1000 * 60 * 45) },
      { bidder: "Bidder #42", amount: 12200, time: new Date(Date.now() - 1000 * 60 * 120) },
      { bidder: "Bidder #18", amount: 11800, time: new Date(Date.now() - 1000 * 60 * 180) },
    ],
    minimumIncrement: 200,
  },
  "2": {
    id: "2",
    title: "Swiss Chronograph Watch - Black Leather Strap",
    images: [swissWatch, swissWatch, swissWatch],
    startingPrice: 3200,
    currentBid: 4950,
    endTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
    category: "Watches",
    description: "Premium Swiss-made automatic chronograph with a sophisticated black dial and genuine leather strap. Features include date display, tachymeter bezel, and water resistance to 100 meters.",
    specifications: [
      { label: "Brand", value: "Swiss Manufacture" },
      { label: "Movement", value: "Automatic Chronograph" },
      { label: "Case Material", value: "Stainless Steel" },
      { label: "Case Diameter", value: "42mm" },
      { label: "Water Resistance", value: "100m / 330ft" },
      { label: "Strap", value: "Genuine Black Leather" },
    ],
    certificates: [
      { name: "Swiss Made Certificate", issuer: "Federation of the Swiss Watch Industry", date: "2023-11-20" },
      { name: "Warranty Card", issuer: "Manufacturer", date: "2024-01-05" },
    ],
    bidHistory: [
      { bidder: "Bidder #29", amount: 4950, time: new Date(Date.now() - 1000 * 60 * 25) },
      { bidder: "Bidder #15", amount: 4800, time: new Date(Date.now() - 1000 * 60 * 60) },
      { bidder: "Bidder #29", amount: 4650, time: new Date(Date.now() - 1000 * 60 * 95) },
    ],
    minimumIncrement: 150,
  },
  "3": {
    id: "3",
    title: "18K Gold Diamond Pendant Necklace",
    images: [necklace, necklace, necklace],
    startingPrice: 2800,
    currentBid: 3650,
    endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
    category: "Jewellery",
    description: "Elegant 18K yellow gold necklace featuring a stunning diamond pendant. The design showcases a cluster of brilliant-cut diamonds totaling 0.85 carats, set in a classic teardrop shape.",
    specifications: [
      { label: "Metal", value: "18K Yellow Gold" },
      { label: "Total Diamond Weight", value: "0.85 Carats" },
      { label: "Diamond Quality", value: "G Color, VS Clarity" },
      { label: "Chain Length", value: "18 inches (Adjustable)" },
      { label: "Pendant Size", value: "22mm x 15mm" },
      { label: "Clasp Type", value: "Lobster Claw" },
    ],
    certificates: [
      { name: "Gold Assay Certificate", issuer: "Australian Assay Office", date: "2024-01-10" },
    ],
    bidHistory: [
      { bidder: "Bidder #56", amount: 3650, time: new Date(Date.now() - 1000 * 60 * 10) },
      { bidder: "Bidder #44", amount: 3500, time: new Date(Date.now() - 1000 * 60 * 75) },
    ],
    minimumIncrement: 100,
  },
  "4": {
    id: "4",
    title: "Vintage Rolex Datejust - 18K Gold",
    images: [rolex, rolex, rolex],
    startingPrice: 15000,
    currentBid: 22500,
    endTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000),
    category: "Watches",
    description: "Iconic vintage Rolex Datejust in 18K yellow gold with champagne dial. This timepiece represents the pinnacle of Swiss watchmaking, featuring the legendary Rolex automatic movement and classic jubilee bracelet.",
    specifications: [
      { label: "Brand", value: "Rolex" },
      { label: "Model", value: "Datejust 16238" },
      { label: "Year", value: "1995" },
      { label: "Case Material", value: "18K Yellow Gold" },
      { label: "Case Size", value: "36mm" },
      { label: "Movement", value: "Automatic, Cal. 3135" },
    ],
    certificates: [
      { name: "Rolex Service Papers", issuer: "Authorized Rolex Service Center", date: "2023-10-15" },
      { name: "Authenticity Certificate", issuer: "Crown Auctions", date: "2024-02-20" },
    ],
    bidHistory: [
      { bidder: "Bidder #73", amount: 22500, time: new Date(Date.now() - 1000 * 60 * 8) },
      { bidder: "Bidder #61", amount: 22000, time: new Date(Date.now() - 1000 * 60 * 35) },
      { bidder: "Bidder #73", amount: 21500, time: new Date(Date.now() - 1000 * 60 * 88) },
      { bidder: "Bidder #55", amount: 21000, time: new Date(Date.now() - 1000 * 60 * 142) },
    ],
    minimumIncrement: 500,
  },
  "5": {
    id: "5",
    title: "Sapphire & Diamond Drop Earrings - White Gold",
    images: [earrings, earrings, earrings],
    startingPrice: 5500,
    currentBid: 7200,
    endTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 15 * 60 * 60 * 1000),
    category: "Jewellery",
    description: "Stunning pair of drop earrings crafted in 18K white gold, featuring vivid blue sapphires surrounded by brilliant-cut diamonds. The perfect combination of elegance and sophistication.",
    specifications: [
      { label: "Metal", value: "18K White Gold" },
      { label: "Sapphire Weight", value: "3.2 Carats Total" },
      { label: "Diamond Weight", value: "0.65 Carats Total" },
      { label: "Sapphire Origin", value: "Ceylon (Sri Lanka)" },
      { label: "Earring Length", value: "28mm" },
      { label: "Closure Type", value: "Secure Post & Butterfly" },
    ],
    certificates: [
      { name: "Gemstone Certificate", issuer: "GIA", date: "2024-01-22" },
      { name: "Gold Hallmark", issuer: "Australian Assay Office", date: "2024-02-05" },
    ],
    bidHistory: [
      { bidder: "Bidder #38", amount: 7200, time: new Date(Date.now() - 1000 * 60 * 12) },
      { bidder: "Bidder #27", amount: 7000, time: new Date(Date.now() - 1000 * 60 * 52) },
      { bidder: "Bidder #38", amount: 6800, time: new Date(Date.now() - 1000 * 60 * 105) },
    ],
    minimumIncrement: 200,
  },
  "6": {
    id: "6",
    title: "GIA Certified 3.2 Carat Loose Diamond - VS1",
    images: [looseDiamond, looseDiamond, looseDiamond],
    startingPrice: 18000,
    currentBid: 24800,
    endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000),
    category: "Diamonds",
    description: "Exceptional GIA certified loose diamond weighing 3.2 carats. This stunning stone features an excellent cut grade, E color (colorless), and VS1 clarity. Perfect for custom jewelry creation.",
    specifications: [
      { label: "Carat Weight", value: "3.20 ct" },
      { label: "Shape", value: "Round Brilliant" },
      { label: "Color Grade", value: "E (Colorless)" },
      { label: "Clarity", value: "VS1" },
      { label: "Cut Grade", value: "Excellent" },
      { label: "Polish", value: "Excellent" },
      { label: "Symmetry", value: "Excellent" },
      { label: "Fluorescence", value: "None" },
    ],
    certificates: [
      { name: "GIA Diamond Grading Report", issuer: "Gemological Institute of America", date: "2024-02-10" },
    ],
    bidHistory: [
      { bidder: "Bidder #82", amount: 24800, time: new Date(Date.now() - 1000 * 60 * 5) },
      { bidder: "Bidder #69", amount: 24000, time: new Date(Date.now() - 1000 * 60 * 28) },
      { bidder: "Bidder #82", amount: 23500, time: new Date(Date.now() - 1000 * 60 * 65) },
      { bidder: "Bidder #74", amount: 23000, time: new Date(Date.now() - 1000 * 60 * 110) },
    ],
    minimumIncrement: 500,
  },
}; */

export default function AuctionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const [selectedImage, setSelectedImage] = useState(0);
  const [bidAmount, setBidAmount] = useState("");
  const [auctionStatus, setAuctionStatus] = useState<string | null>(null);
  const [auctionApprovalStatus, setAuctionApprovalStatus] = useState<string | null>(null);
  const [auction, setAuction] = useState<AuctionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const { bids, loading: bidsLoading, currentHighestBid, placeBid } = useAuctionBids(id);
  const { trackAuction } = useBidNotifications();

  // Fetch auction data from database
  useEffect(() => {
    const fetchAuction = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Fetch auction data
        const { data: auctionData, error: auctionError } = await supabase
          .from('auctions')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (auctionError) throw auctionError;
        
        if (!auctionData) {
          setAuction(null);
          setLoading(false);
          return;
        }

        setAuctionStatus(auctionData.status);
        setAuctionApprovalStatus(auctionData.approval_status);

        // Map database auction to component format
        const images = auctionData.image_urls && auctionData.image_urls.length > 0 
          ? auctionData.image_urls 
          : ['/placeholder.svg'];

        const specifications = auctionData.specifications || [];
        const certificates = auctionData.certificates || [];

        const mappedAuction: AuctionItem = {
          id: auctionData.id,
          title: auctionData.title,
          images: images,
          startingPrice: auctionData.starting_price,
          currentBid: auctionData.current_bid || auctionData.starting_price,
          endTime: new Date(auctionData.end_time),
          category: auctionData.category || 'Uncategorized',
          description: auctionData.description || '',
          specifications: specifications,
          certificates: certificates.map((cert: any) => ({
            name: cert.name || '',
            issuer: cert.issuer || '',
            date: cert.date || new Date().toISOString().split('T')[0]
          })),
          bidHistory: [], // Will be populated by useAuctionBids
          minimumIncrement: auctionData.minimum_increment || 100,
        };

        setAuction(mappedAuction);
      } catch (error) {
        console.error('Error fetching auction:', error);
        setAuction(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAuction();

    // Set up real-time subscription for status changes
    const channel = supabase
      .channel(`auction-${id}-status`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'auctions',
          filter: `id=eq.${id}`
        },
        (payload) => {
          if (payload.new) {
            setAuctionStatus(payload.new.status);
            setAuctionApprovalStatus(payload.new.approval_status);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);
  
  // Update current bid based on database bids
  const displayCurrentBid = currentHighestBid || auction?.currentBid || auction?.startingPrice || 0;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-gold mx-auto mb-4" />
            <p className="text-muted-foreground">Loading auction details...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Auction Not Found</h1>
            <p className="text-muted-foreground mb-6">The auction you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => navigate("/")} variant="gold">
              Return to Home
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const minimumBid = displayCurrentBid + (auction?.minimumIncrement || 100);

  const handlePlaceBid = async () => {
    if (!user) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to place a bid.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    const bidValue = parseFloat(bidAmount);
    
    if (!bidAmount || isNaN(bidValue)) {
      toast({
        title: "Invalid Bid",
        description: "Please enter a valid bid amount.",
        variant: "destructive",
      });
      return;
    }

    const success = await placeBid(bidValue, minimumBid);
    if (success && id) {
      // Track this auction for outbid notifications
      trackAuction(id, bidValue);
      setBidAmount("");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-6 hover:text-gold"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Auctions
          </Button>

          <div className="grid lg:grid-cols-2 gap-12 mb-12">
            {/* Image Gallery */}
            <div className="space-y-4">
              <div className="aspect-square overflow-hidden rounded-lg bg-muted">
                <img
                  src={auction.images[selectedImage]}
                  alt={auction.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                {auction.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                      selectedImage === index
                        ? "border-gold"
                        : "border-transparent hover:border-muted-foreground/20"
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${auction.title} view ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Auction Details & Bidding */}
            <div className="space-y-6">
              <div>
                <Badge className="mb-3">{auction.category}</Badge>
                <h1 className="text-4xl font-bold mb-4">{auction.title}</h1>
                <p className="text-muted-foreground text-lg">{auction.description}</p>
              </div>

              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b">
                    <span className="text-sm text-muted-foreground">Starting Price:</span>
                    <span className="font-medium">{formatPrice(auction.startingPrice)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-semibold">Current Bid:</span>
                    <span className="text-3xl font-bold text-gold">
                      {formatPrice(displayCurrentBid)}
                    </span>
                  </div>
                  {bids.length > 0 && (
                    <div className="text-sm text-muted-foreground pt-2">
                      {bids.length} {bids.length === 1 ? 'bid' : 'bids'} placed
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-lg pt-2">
                    <Clock className="w-5 h-5 text-gold" />
                    <span className="font-medium">
                      {auction.endTime > new Date() 
                        ? `Ends ${formatDistanceToNow(auction.endTime, { addSuffix: true })}`
                        : 'Auction Ended'
                      }
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Place Your Bid</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {auctionStatus === 'paused' && (
                    <div className="p-4 border border-yellow-500 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-yellow-900 dark:text-yellow-200">Auction Paused</p>
                          <p className="text-sm text-yellow-800 dark:text-yellow-300 mt-1">
                            This auction has been temporarily paused by administrators. Bidding is currently disabled.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {isAdmin ? (
                    <div className="p-4 border border-muted rounded-lg bg-muted/30">
                      <p className="text-sm text-muted-foreground">
                        Administrators cannot place bids to maintain auction integrity and avoid conflicts of interest.
                      </p>
                    </div>
                  ) : auctionStatus === 'paused' ? null : (
                    <>
                      <div>
                        <Label htmlFor="bid-amount">Your Bid Amount (AUD)</Label>
                        <Input
                          id="bid-amount"
                          type="number"
                          placeholder={formatPrice(minimumBid)}
                          value={bidAmount}
                          onChange={(e) => setBidAmount(e.target.value)}
                          className="mt-2"
                          min={minimumBid}
                          step={auction.minimumIncrement}
                          disabled={auctionStatus !== 'active'}
                        />
                        <p className="text-sm text-muted-foreground mt-2">
                          Minimum bid: {formatPrice(minimumBid)} (increment: {formatPrice(auction.minimumIncrement)})
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Quick Bid</Label>
                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setBidAmount(minimumBid.toString())}
                            className="hover:border-gold hover:text-gold transition-colors"
                            disabled={auctionStatus !== 'active'}
                          >
                            Min Bid
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setBidAmount((minimumBid + auction.minimumIncrement).toString())}
                            className="hover:border-gold hover:text-gold transition-colors"
                            disabled={auctionStatus !== 'active'}
                          >
                            +{formatPrice(auction.minimumIncrement)}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setBidAmount((minimumBid + auction.minimumIncrement * 2).toString())}
                            className="hover:border-gold hover:text-gold transition-colors"
                            disabled={auctionStatus !== 'active'}
                          >
                            +{formatPrice(auction.minimumIncrement * 2)}
                          </Button>
                        </div>
                      </div>

                      <Button 
                        onClick={handlePlaceBid} 
                        variant="gold" 
                        size="lg" 
                        className="w-full"
                        disabled={auctionStatus !== 'active'}
                      >
                        {auctionStatus !== 'active' ? 'Bidding Disabled' : 'Place Bid'}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Specifications */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-gold" />
                Specifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {auction.specifications.map((spec, index) => (
                  <div key={index} className="flex justify-between py-2 border-b border-border/50">
                    <span className="font-medium">{spec.label}:</span>
                    <span className="text-muted-foreground">{spec.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Authentication Certificates */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-gold" />
                Authentication & Certificates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auction.certificates.map((cert, index) => (
                  <div key={index} className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-lg">{cert.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Issued by: {cert.issuer}
                        </p>
                      </div>
                      <Badge variant="secondary">{cert.date}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Bid History */}
          <Card>
            <CardHeader>
              <CardTitle>Bid History</CardTitle>
            </CardHeader>
            <CardContent>
              {bidsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading bid history...
                </div>
              ) : bids.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No bids placed yet. Be the first to bid!
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bidder</TableHead>
                      <TableHead>Bid Amount</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bids.map((bid, index) => (
                      <TableRow key={bid.id} className={index === 0 ? "bg-accent/5" : ""}>
                        <TableCell className="font-medium">
                          {bid.user_id === user?.id ? "You" : `Bidder #${bid.user_id.slice(0, 6)}`}
                          {index === 0 && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              Highest
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-bold text-gold">
                          {formatPrice(bid.bid_amount)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDistanceToNow(new Date(bid.bid_time), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Bid Analytics Chart */}
          <BidHistoryChart 
            bids={bids} 
            startingPrice={auction.startingPrice}
            auctionEndTime={auction.endTime}
            category={auction.category}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}