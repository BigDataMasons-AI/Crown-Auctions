-- Prevent admins from placing bids (conflict of interest)
CREATE POLICY "Admins cannot place bids"
ON public.bids FOR INSERT
WITH CHECK (NOT public.is_admin());