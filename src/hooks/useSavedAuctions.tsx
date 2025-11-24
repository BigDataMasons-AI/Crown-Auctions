import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useSavedAuctions = () => {
  const { user } = useAuth();
  const [savedAuctionIds, setSavedAuctionIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSavedAuctions();
    } else {
      setSavedAuctionIds(new Set());
      setLoading(false);
    }
  }, [user]);

  const fetchSavedAuctions = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('saved_auctions')
        .select('auction_id')
        .eq('user_id', user.id);

      if (error) throw error;

      const ids = new Set(data.map(item => item.auction_id));
      setSavedAuctionIds(ids);
    } catch (error) {
      console.error('Error fetching saved auctions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSaveAuction = async (auctionId: string) => {
    if (!user) {
      toast.error('Please sign in to save auctions');
      return false;
    }

    const isSaved = savedAuctionIds.has(auctionId);

    try {
      if (isSaved) {
        // Remove from saved
        const { error } = await supabase
          .from('saved_auctions')
          .delete()
          .eq('user_id', user.id)
          .eq('auction_id', auctionId);

        if (error) throw error;

        setSavedAuctionIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(auctionId);
          return newSet;
        });
        toast.success('Removed from watchlist');
      } else {
        // Add to saved
        const { error } = await supabase
          .from('saved_auctions')
          .insert({
            user_id: user.id,
            auction_id: auctionId
          });

        if (error) throw error;

        setSavedAuctionIds(prev => new Set([...prev, auctionId]));
        toast.success('Added to watchlist');
      }
      return true;
    } catch (error) {
      console.error('Error toggling saved auction:', error);
      toast.error('Failed to update watchlist');
      return false;
    }
  };

  const isSaved = (auctionId: string) => savedAuctionIds.has(auctionId);

  return {
    savedAuctionIds,
    loading,
    toggleSaveAuction,
    isSaved,
  };
};
