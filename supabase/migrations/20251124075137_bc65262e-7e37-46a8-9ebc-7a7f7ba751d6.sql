-- Add column for admin comments on resubmission comparisons
ALTER TABLE public.auctions
ADD COLUMN admin_comparison_comments TEXT NULL;

-- Add comment
COMMENT ON COLUMN public.auctions.admin_comparison_comments IS 'Admin comments explaining why changes in a resubmission improved the submission quality';