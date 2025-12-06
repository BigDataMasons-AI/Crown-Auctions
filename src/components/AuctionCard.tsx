import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Heart } from "lucide-react";
import { useSavedAuctions } from "@/hooks/useSavedAuctions";
import { useCategoryName } from "@/hooks/useCategoryName";
import { cn } from "@/lib/utils";

interface AuctionCardProps {
  id: string;
  title: string;
  image: string;
  startingPrice: number;
  currentBid: number;
  endTime: Date;
  category: string;
  bids: number;
  status?: string;
}

export const AuctionCard = ({
  id,
  title,
  image,
  startingPrice,
  currentBid,
  endTime,
  category,
  bids,
  status,
}: AuctionCardProps) => {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState("");
  const { toggleSaveAuction, isSaved } = useSavedAuctions();
  const { getCategoryName } = useCategoryName();
  
  const handleSaveClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleSaveAuction(id);
  };

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = endTime.getTime();
      const difference = end - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        if (days > 0) {
          setTimeLeft(`${days}d ${hours}h ${minutes}m`);
        } else if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        } else {
          setTimeLeft(`${minutes}m ${seconds}s`);
        }
      } else {
        setTimeLeft("Auction Ended");
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Card 
      className="group overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
      onClick={() => navigate(`/auction/${id}`)}
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm hover:bg-background/90 hover:scale-110 transition-all"
          onClick={handleSaveClick}
        >
          <Heart 
            className={cn(
              "h-5 w-5 transition-colors",
              isSaved(id) ? "fill-accent text-accent" : "text-foreground"
            )}
          />
        </Button>
      </div>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <Badge variant="secondary" className="text-xs font-medium">
            {getCategoryName(category)}
          </Badge>
          {status === 'paused' && (
            <Badge variant="secondary" className="text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              ⏸️ Paused
            </Badge>
          )}
          {status === 'active' && (
            <Badge variant="default" className="text-xs font-medium bg-green-600 hover:bg-green-700">
              🟢 Live
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">{bids} bids</span>
        </div>
        
        <h3 className="font-bold text-lg mb-3 line-clamp-2 group-hover:text-gold transition-colors">
          {title}
        </h3>
        
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Starting Price:</span>
            <span className="text-sm font-medium">{formatPrice(startingPrice)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Current Bid:</span>
            <span className="text-lg font-bold text-gold">{formatPrice(currentBid)}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-gold" />
            <span className="font-medium">{timeLeft}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
