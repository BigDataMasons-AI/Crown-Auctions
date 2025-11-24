-- Update RLS policies for bids table to allow viewing all bids for any auction
-- Drop the old restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view their own bids" ON public.bids;

-- Create new SELECT policy that allows viewing all bids
CREATE POLICY "Anyone can view all bids"
ON public.bids
FOR SELECT
TO authenticated
USING (true);

-- Update the bids table to store auction_id properly and add constraints
ALTER TABLE public.bids
ADD CONSTRAINT bids_bid_amount_positive CHECK (bid_amount > 0);

-- Create an index on auction_id for faster queries
CREATE INDEX IF NOT EXISTS idx_bids_auction_id ON public.bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_bids_bid_time ON public.bids(bid_time DESC);