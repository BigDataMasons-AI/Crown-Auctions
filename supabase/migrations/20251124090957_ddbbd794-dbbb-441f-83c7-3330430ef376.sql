-- Add explicit deny policy for profiles table to prevent PII exposure
CREATE POLICY "Deny public access to profiles" 
ON public.profiles 
FOR ALL 
TO anon
USING (false);

-- Create bid rate limiting function
CREATE OR REPLACE FUNCTION public.check_bid_rate_limit(user_id uuid, auction_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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

-- Add comment explaining the rate limit
COMMENT ON FUNCTION public.check_bid_rate_limit IS 'Checks if a user can place a bid based on rate limiting (5 second cooldown between bids on same auction)';

-- Create index to improve rate limit check performance
CREATE INDEX IF NOT EXISTS idx_bids_user_auction_time 
ON public.bids (user_id, auction_id, bid_time DESC);