import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Bid {
  id: string;
  user_id: string;
  auction_id: string;
  bid_amount: number;
  bid_time: string;
  status: string;
}

export const useAuctionBids = (auctionId: string | undefined) => {
  const { user } = useAuth();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentHighestBid, setCurrentHighestBid] = useState<number | null>(null);

  useEffect(() => {
    if (!auctionId) return;

    fetchBids();
    
    // Set up real-time subscription
    const channel = supabase
      .channel(`auction-${auctionId}-bids`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bids',
          filter: `auction_id=eq.${auctionId}`
        },
        (payload) => {
          console.log('New bid received:', payload);
          const newBid = payload.new as Bid;
          setBids(prev => [newBid, ...prev]);
          setCurrentHighestBid(newBid.bid_amount);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [auctionId]);

  const fetchBids = async () => {
    if (!auctionId) return;

    try {
      const { data, error } = await supabase
        .from('bids')
        .select('*')
        .eq('auction_id', auctionId)
        .eq('status', 'active')
        .order('bid_time', { ascending: false });

      if (error) throw error;

      setBids(data || []);
      
      if (data && data.length > 0) {
        const highest = Math.max(...data.map(bid => bid.bid_amount));
        setCurrentHighestBid(highest);
      }
    } catch (error) {
      console.error('Error fetching bids:', error);
      toast.error('Failed to load bid history');
    } finally {
      setLoading(false);
    }
  };

  const placeBid = async (bidAmount: number, minimumBid: number) => {
    if (!user) {
      toast.error('Please sign in to place a bid');
      return false;
    }

    if (!auctionId) {
      toast.error('Invalid auction');
      return false;
    }

    if (bidAmount < minimumBid) {
      toast.error(`Minimum bid is $${minimumBid.toFixed(2)}`);
      return false;
    }

    try {
      // Check rate limit before placing bid
      const { data: canBid, error: rateLimitError } = await supabase
        .rpc('check_bid_rate_limit', {
          user_id: user.id,
          auction_id: auctionId
        });

      if (rateLimitError) throw rateLimitError;

      if (!canBid) {
        toast.error('Please wait 5 seconds between bids');
        return false;
      }

      const { error } = await supabase
        .from('bids')
        .insert({
          user_id: user.id,
          auction_id: auctionId,
          bid_amount: bidAmount,
          status: 'active'
        });

      if (error) throw error;

      toast.success('Bid placed successfully!');
      return true;
    } catch (error: any) {
      console.error('Error placing bid:', error);
      toast.error(error.message || 'Failed to place bid');
      return false;
    }
  };

  return {
    bids,
    loading,
    currentHighestBid,
    placeBid,
  };
};
