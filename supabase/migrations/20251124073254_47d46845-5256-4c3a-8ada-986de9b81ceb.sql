-- Create storage bucket for auction images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'auction-images',
  'auction-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Create RLS policies for auction images
CREATE POLICY "Anyone can view auction images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'auction-images');

CREATE POLICY "Authenticated users can upload auction images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'auction-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own auction images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'auction-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own auction images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'auction-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);