-- Add column to track if an auction is a resubmission of a previous one
ALTER TABLE public.auctions
ADD COLUMN original_submission_id TEXT NULL;

-- Add index for faster lookups
CREATE INDEX idx_auctions_original_submission_id 
ON public.auctions(original_submission_id) 
WHERE original_submission_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.auctions.original_submission_id IS 'References the ID of the original submission if this is a resubmission after withdrawal or rejection';