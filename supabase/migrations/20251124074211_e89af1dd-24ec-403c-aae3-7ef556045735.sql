-- Allow users to delete their own pending auction submissions
CREATE POLICY "Users can delete their pending submissions"
ON public.auctions
FOR DELETE
TO authenticated
USING (
  auth.uid() = submitted_by AND 
  approval_status = 'pending'
);