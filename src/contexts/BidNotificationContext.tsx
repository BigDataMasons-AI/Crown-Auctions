import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface UserBid {
  auction_id: string;
  highest_bid: number;
}

interface BidNotificationContextType {
  trackAuction: (auctionId: string, bidAmount: number) => void;
  untrackAuction: (auctionId: string) => void;
}

const BidNotificationContext = createContext<BidNotificationContextType | undefined>(undefined);

export const BidNotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [trackedAuctions, setTrackedAuctions] = useState<Map<string, number>>(new Map());
  const [userProfile, setUserProfile] = useState<{ email: string; full_name: string | null } | null>(null);

  useEffect(() => {
    if (!user) {
      setTrackedAuctions(new Map());
      setUserProfile(null);
      return;
    }

    // Fetch user profile
    fetchUserProfile();
    // Fetch user's active bids on mount
    fetchUserActiveBids();
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const sendOutbidEmail = async (
    auctionId: string,
    auctionTitle: string,
    newBidAmount: number,
    userPreviousBid: number
  ) => {
    if (!userProfile) return;

    try {
      const { error } = await supabase.functions.invoke('send-outbid-notification', {
        body: {
          userEmail: userProfile.email,
          userName: userProfile.full_name || 'Valued Bidder',
          auctionId,
          auctionTitle,
          newBidAmount,
          userPreviousBid,
        },
      });

      if (error) throw error;
      console.log('Outbid email sent successfully');
    } catch (error) {
      console.error('Error sending outbid email:', error);
    }
  };

  useEffect(() => {
    if (!user || trackedAuctions.size === 0) return;

    // Subscribe to all tracked auctions
    const channels = Array.from(trackedAuctions.keys()).map(auctionId => {
      const channel = supabase
        .channel(`outbid-notifications-${auctionId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'bids',
            filter: `auction_id=eq.${auctionId}`
          },
          (payload) => {
            const newBid = payload.new as any;
            
            // Check if this bid is from another user and higher than user's current bid
            if (newBid.user_id !== user.id) {
              const userHighestBid = trackedAuctions.get(auctionId);
              
              if (userHighestBid && newBid.bid_amount > userHighestBid) {
                // User has been outbid - show toast and send email
                toast.error('You\'ve been outbid!', {
                  description: `Someone placed a higher bid of $${newBid.bid_amount.toFixed(2)} on an auction you're bidding on.`,
                  duration: 5000,
                  action: {
                    label: 'View Auction',
                    onClick: () => window.location.href = `/auction/${auctionId}`
                  }
                });

                // Send email notification - get auction title from static data for now
                // In production, this would fetch from database
                const auctionTitles: Record<string, string> = {
                  '1': 'Platinum Diamond Solitaire Ring - 2.5 Carat',
                  '2': 'Swiss Chronograph Watch - Black Leather Strap',
                  '3': '18K Gold Diamond Pendant Necklace',
                  '4': 'Vintage Rolex Datejust - 18K Gold',
                  '5': 'Sapphire & Diamond Drop Earrings - White Gold',
                  '6': 'GIA Certified 3.2 Carat Loose Diamond - VS1',
                };

                sendOutbidEmail(
                  auctionId,
                  auctionTitles[auctionId] || 'Luxury Auction Item',
                  newBid.bid_amount,
                  userHighestBid
                );
              }
            } else {
              // Update tracked amount if user placed a new bid
              setTrackedAuctions(prev => {
                const updated = new Map(prev);
                updated.set(auctionId, newBid.bid_amount);
                return updated;
              });
            }
          }
        )
        .subscribe();

      return channel;
    });

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [user, trackedAuctions, sendOutbidEmail]);

  const fetchUserActiveBids = async () => {
    if (!user) return;

    try {
      // Get all user's bids grouped by auction
      const { data, error } = await supabase
        .from('bids')
        .select('auction_id, bid_amount')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('bid_time', { ascending: false });

      if (error) throw error;

      if (data) {
        // Group by auction and keep highest bid per auction
        const auctionBids = new Map<string, number>();
        data.forEach(bid => {
          const currentHighest = auctionBids.get(bid.auction_id);
          if (!currentHighest || bid.bid_amount > currentHighest) {
            auctionBids.set(bid.auction_id, bid.bid_amount);
          }
        });

        setTrackedAuctions(auctionBids);
      }
    } catch (error) {
      console.error('Error fetching user bids:', error);
    }
  };

  const trackAuction = (auctionId: string, bidAmount: number) => {
    setTrackedAuctions(prev => {
      const updated = new Map(prev);
      updated.set(auctionId, bidAmount);
      return updated;
    });
  };

  const untrackAuction = (auctionId: string) => {
    setTrackedAuctions(prev => {
      const updated = new Map(prev);
      updated.delete(auctionId);
      return updated;
    });
  };

  return (
    <BidNotificationContext.Provider value={{ trackAuction, untrackAuction }}>
      {children}
    </BidNotificationContext.Provider>
  );
};

export const useBidNotifications = () => {
  const context = useContext(BidNotificationContext);
  if (context === undefined) {
    throw new Error('useBidNotifications must be used within a BidNotificationProvider');
  }
  return context;
};
