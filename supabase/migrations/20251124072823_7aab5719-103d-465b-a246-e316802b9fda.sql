-- Create auctions table
CREATE TABLE public.auctions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  starting_price NUMERIC NOT NULL,
  current_bid NUMERIC NOT NULL DEFAULT 0,
  minimum_increment NUMERIC NOT NULL DEFAULT 100,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  approval_status TEXT NOT NULL DEFAULT 'pending',
  submitted_by UUID REFERENCES auth.users(id) NOT NULL,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  specifications JSONB DEFAULT '[]',
  certificates JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'active', 'ended', 'cancelled')),
  CONSTRAINT valid_approval_status CHECK (approval_status IN ('pending', 'approved', 'rejected'))
);

-- Enable RLS
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;

-- Anyone can view approved active auctions
CREATE POLICY "Anyone can view approved auctions"
ON public.auctions
FOR SELECT
USING (approval_status = 'approved' OR auth.uid() = submitted_by);

-- Users can submit their own auctions
CREATE POLICY "Users can create auction submissions"
ON public.auctions
FOR INSERT
WITH CHECK (auth.uid() = submitted_by AND approval_status = 'pending');

-- Users can update their pending auctions
CREATE POLICY "Users can update their pending auctions"
ON public.auctions
FOR UPDATE
USING (auth.uid() = submitted_by AND approval_status = 'pending');

-- Admins can view all auctions
CREATE POLICY "Admins can view all auctions"
ON public.auctions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can approve/reject auctions
CREATE POLICY "Admins can manage auctions"
ON public.auctions
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Create updated_at trigger
CREATE TRIGGER update_auctions_updated_at
BEFORE UPDATE ON public.auctions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create index for faster queries
CREATE INDEX idx_auctions_approval_status ON public.auctions(approval_status);
CREATE INDEX idx_auctions_status ON public.auctions(status);
CREATE INDEX idx_auctions_submitted_by ON public.auctions(submitted_by);

-- Add admin check function for convenience
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
$$;