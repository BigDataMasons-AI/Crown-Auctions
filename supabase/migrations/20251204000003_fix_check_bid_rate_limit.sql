-- Fix check_bid_rate_limit function to accept TEXT auction_id instead of UUID
-- The auctions table uses TEXT for id, not UUID
-- First, drop the old UUID version to avoid function overloading conflicts

DROP FUNCTION IF EXISTS public.check_bid_rate_limit(user_id uuid, auction_id uuid);

-- Now create the function with TEXT auction_id
CREATE OR REPLACE FUNCTION public.check_bid_rate_limit(user_id uuid, auction_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  last_bid_time timestamp with time zone;
  min_interval interval := interval '5 seconds';
BEGIN
  -- Get the timestamp of the user's most recent bid on this auction
  SELECT bid_time INTO last_bid_time
  FROM public.bids
  WHERE bids.user_id = check_bid_rate_limit.user_id
    AND bids.auction_id = check_bid_rate_limit.auction_id
  ORDER BY bid_time DESC
  LIMIT 1;
  
  -- If no previous bid or enough time has passed, allow the bid
  IF last_bid_time IS NULL OR (now() - last_bid_time) >= min_interval THEN
    RETURN true;
  END IF;
  
  -- Rate limit exceeded
  RETURN false;
END;
$$;

-- Update comment
COMMENT ON FUNCTION public.check_bid_rate_limit IS 'Checks if a user can place a bid based on rate limiting (5 second cooldown between bids on same auction). Accepts TEXT auction_id to match auctions table.';

