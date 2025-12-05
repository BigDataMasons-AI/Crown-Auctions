-- Create categories table for managing auction categories
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Anyone can view active categories
CREATE POLICY "Anyone can view active categories"
  ON public.categories
  FOR SELECT
  USING (is_active = true);

-- Admins can view all categories (including inactive)
CREATE POLICY "Admins can view all categories"
  ON public.categories
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert categories
CREATE POLICY "Admins can create categories"
  ON public.categories
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update categories
CREATE POLICY "Admins can update categories"
  ON public.categories
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete categories
CREATE POLICY "Admins can delete categories"
  ON public.categories
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON public.categories(is_active);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_categories_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_categories_updated
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_categories_updated_at();

-- Insert default categories
INSERT INTO public.categories (name, slug, description, display_order, is_active) VALUES
  ('Watches', 'watches', 'Luxury and vintage watches', 1, true),
  ('Jewelry', 'jewelry', 'Fine jewelry and accessories', 2, true),
  ('Diamonds', 'diamonds', 'Loose diamonds and gemstones', 3, true),
  ('Luxury Goods', 'luxury-goods', 'Premium luxury items', 4, true)
ON CONFLICT (slug) DO NOTHING;

