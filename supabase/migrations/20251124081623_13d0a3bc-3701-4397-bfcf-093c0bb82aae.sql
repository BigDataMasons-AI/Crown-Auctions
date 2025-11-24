-- Drop the overly permissive policy that exposes all bids
DROP POLICY IF EXISTS "Anyone can view all bids" ON public.bids;

-- Allow users to view bids only for approved auctions (maintains auction transparency)
CREATE POLICY "Users can view bids for approved auctions"
ON public.bids FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.auctions
    WHERE auctions.id = bids.auction_id
    AND auctions.approval_status = 'approved'
  )
);

-- Allow users to view their own bids regardless of auction status (needed for dashboard)
CREATE POLICY "Users can view their own bids"
ON public.bids FOR SELECT
USING (auth.uid() = user_id);