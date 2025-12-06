import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Upload, X, Plus } from 'lucide-react';
import { z } from 'zod';

const auctionSchema = z.object({
  title: z.string().trim().min(5, 'Title must be at least 5 characters').max(200, 'Title must be less than 200 characters'),
  category: z.string().min(1, 'Please select a category'),
  description: z.string().trim().min(20, 'Description must be at least 20 characters').max(2000, 'Description must be less than 2000 characters'),
  startingPrice: z.number().min(1, 'Starting price must be at least $1'),
  endTime: z.string().min(1, 'Please select an end time'),
});

interface SpecField {
  id: string;
  label: string;
  value: string;
}

interface CertField {
  id: string;
  name: string;
  issuer: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

export default function SubmitAuction() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { id: auctionId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [loadingAuction, setLoadingAuction] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [specifications, setSpecifications] = useState<SpecField[]>([
    { id: '1', label: '', value: '' }
  ]);
  const [certificates, setCertificates] = useState<CertField[]>([
    { id: '1', name: '', issuer: '' }
  ]);
  
  // Pre-filled form values from URL parameters
  const [prefilledData, setPrefilledData] = useState<{
    title?: string;
    category?: string;
    description?: string;
    startingPrice?: string;
    minimumIncrement?: string;
    originalId?: string;
    endTime?: string;
  }>({});

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error('Please sign in to submit an auction');
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Load auction data if editing
  useEffect(() => {
    const loadAuctionForEdit = async () => {
      if (!auctionId || !user) return;

      setLoadingAuction(true);
      try {
        const { data: auction, error } = await supabase
          .from('auctions')
          .select('*')
          .eq('id', auctionId)
          .eq('submitted_by', user.id)
          .eq('approval_status', 'pending')
          .single();

        if (error) throw error;

        if (!auction) {
          toast.error('Auction not found or cannot be edited');
          navigate('/dashboard');
          return;
        }

        setIsEditing(true);
        const imageUrls = auction.image_urls || [];
        setExistingImageUrls(imageUrls);
        
        // Convert storage paths to public URLs for preview
        const previewUrls = imageUrls.map((url: string) => {
          if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
          }
          return supabase.storage.from('auction-images').getPublicUrl(url).data.publicUrl;
        });
        setImagePreviews(previewUrls);

        // Set form values
        setPrefilledData({
          title: auction.title,
          category: auction.category,
          description: auction.description,
          startingPrice: auction.starting_price.toString(),
          minimumIncrement: auction.minimum_increment?.toString() || '100',
          endTime: auction.end_time,
        });
        
        // Set selected category for controlled Select component
        setSelectedCategory(auction.category || '');

        // Set specifications
        if (auction.specifications && Array.isArray(auction.specifications) && auction.specifications.length > 0) {
          setSpecifications(
            auction.specifications.map((spec: any, index: number) => ({
              id: String(index + 1),
              label: spec.label || '',
              value: spec.value || '',
            }))
          );
        }

        // Set certificates
        if (auction.certificates && Array.isArray(auction.certificates) && auction.certificates.length > 0) {
          setCertificates(
            auction.certificates.map((cert: any, index: number) => ({
              id: String(index + 1),
              name: cert.name || '',
              issuer: cert.issuer || '',
            }))
          );
        }
      } catch (error: any) {
        console.error('Error loading auction:', error);
        toast.error('Failed to load auction data');
        navigate('/dashboard');
      } finally {
        setLoadingAuction(false);
      }
    };

    loadAuctionForEdit();
  }, [auctionId, user, navigate]);

  // Fetch active categories from database
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .order('name', { ascending: true });

        if (error) throw error;
        setCategories(data || []);
      } catch (error: any) {
        console.error('Error fetching categories:', error);
        toast.error('Failed to load categories');
        // Fallback to default categories if fetch fails
        setCategories([
          { id: '1', name: 'Watches', slug: 'watches', description: null, display_order: 1, is_active: true },
          { id: '2', name: 'Jewelry', slug: 'jewelry', description: null, display_order: 2, is_active: true },
          { id: '3', name: 'Diamonds', slug: 'diamonds', description: null, display_order: 3, is_active: true },
          { id: '4', name: 'Luxury Goods', slug: 'luxury-goods', description: null, display_order: 4, is_active: true },
        ]);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // Check for pre-filled data from URL parameters
  useEffect(() => {
    const isPrefill = searchParams.get('prefill') === 'true';
    if (isPrefill) {
      const title = searchParams.get('title');
      const category = searchParams.get('category');
      const description = searchParams.get('description');
      const startingPrice = searchParams.get('startingPrice');
      const minimumIncrement = searchParams.get('minimumIncrement');
      const originalId = searchParams.get('originalId');

      setPrefilledData({
        title: title || undefined,
        category: category || undefined,
        description: description || undefined,
        startingPrice: startingPrice || undefined,
        minimumIncrement: minimumIncrement || undefined,
        originalId: originalId || undefined,
      });
      
      // Set selected category for controlled Select component
      if (category) {
        setSelectedCategory(category);
      }

      if (title || category || description) {
        toast.info('Form pre-filled with your previous submission data. Feel free to make changes!', {
          duration: 5000,
        });
      }
    }
  }, [searchParams]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file count
    if (images.length + files.length > 10) {
      toast.error('Maximum 10 images allowed');
      return;
    }

    // Validate file sizes and types
    for (const file of files) {
      if (file.size > 5242880) { // 5MB
        toast.error(`${file.name} is too large. Maximum size is 5MB`);
        return;
      }
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
        toast.error(`${file.name} is not a supported image format`);
        return;
      }
    }

    setImages([...images, ...files]);
    
    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    if (isEditing && index < existingImageUrls.length) {
      // Remove from existing images
      setExistingImageUrls(existingImageUrls.filter((_, i) => i !== index));
      setImagePreviews(imagePreviews.filter((_, i) => i !== index));
    } else {
      // Remove from new images
      const newIndex = index - existingImageUrls.length;
      setImages(images.filter((_, i) => i !== newIndex));
      setImagePreviews(imagePreviews.filter((_, i) => i !== index));
    }
  };

  const addSpecification = () => {
    setSpecifications([...specifications, { id: Date.now().toString(), label: '', value: '' }]);
  };

  const removeSpecification = (id: string) => {
    setSpecifications(specifications.filter(spec => spec.id !== id));
  };

  const updateSpecification = (id: string, field: 'label' | 'value', value: string) => {
    setSpecifications(specifications.map(spec =>
      spec.id === id ? { ...spec, [field]: value } : spec
    ));
  };

  const addCertificate = () => {
    setCertificates([...certificates, { id: Date.now().toString(), name: '', issuer: '' }]);
  };

  const removeCertificate = (id: string) => {
    setCertificates(certificates.filter(cert => cert.id !== id));
  };

  const updateCertificate = (id: string, field: 'name' | 'issuer', value: string) => {
    setCertificates(certificates.map(cert =>
      cert.id === id ? { ...cert, [field]: value } : cert
    ));
  };

  const sanitizeFileName = (fileName: string): string => {
    // Remove spaces and special characters, keep only alphanumeric, dots, hyphens, and underscores
    return fileName
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/[^a-zA-Z0-9._-]/g, '') // Remove special characters except . _ -
      .toLowerCase();
  };

  const uploadImages = async (auctionId: string): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    if (!user) {
      throw new Error('User must be authenticated to upload images');
    }

    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';

      // Sanitize the original file name and create a clean path
      const sanitizedOriginalName = sanitizeFileName(file.name.replace(/\.[^/.]+$/, '')); // Remove extension
      const fileName = `${user.id}/${auctionId}/${Date.now()}_${i}_${sanitizedOriginalName}.${fileExt}`;

      try {
      const { data, error } = await supabase.storage
        .from('auction-images')
        .upload(fileName, file, {
          cacheControl: '3600',
            upsert: false,
            contentType: file.type || `image/${fileExt}`
        });

        if (error) {
          console.error('Upload error for file:', file.name, error);
          throw error;
        }

      const { data: { publicUrl } } = supabase.storage
        .from('auction-images')
        .getPublicUrl(data.path);

      uploadedUrls.push(publicUrl);
      } catch (error: any) {
        console.error(`Failed to upload image ${i + 1}:`, error);
        // If it's a CORS error, provide helpful message
        if (error.message?.includes('CORS') || error.message?.includes('fetch')) {
          throw new Error(
            'Image upload failed due to CORS policy. Please check Supabase Storage CORS settings. ' +
            'Go to Supabase Dashboard > Storage > Settings and ensure your origin is allowed.'
          );
        }
        throw error;
      }
    }

    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      
      // Validate form data
      const validationData = {
        title: formData.get('title') as string,
        category: selectedCategory || (formData.get('category') as string),
        description: formData.get('description') as string,
        startingPrice: parseFloat(formData.get('startingPrice') as string),
        endTime: formData.get('endTime') as string,
      };

      const result = auctionSchema.safeParse(validationData);
      
      if (!result.success) {
        const errors = result.error.errors.map(e => e.message).join(', ');
        toast.error(errors);
        setSubmitting(false);
        return;
      }

      // Validate images - allow existing images if editing
      if (images.length === 0 && (!isEditing || existingImageUrls.length === 0)) {
        toast.error('Please upload at least one image');
        setSubmitting(false);
        return;
      }

      let imageUrls: string[] = [];
      
      if (isEditing && auctionId) {
        // When editing, use existing images if no new images uploaded
        if (images.length > 0) {
          toast.info('Uploading new images...');
          imageUrls = await uploadImages(auctionId);
        } else {
          imageUrls = existingImageUrls;
        }
      } else {
        // Generate auction ID for new submission
        const newAuctionId = `auction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Upload images
        toast.info('Uploading images...');
        imageUrls = await uploadImages(newAuctionId);
      }

      // Prepare specifications and certificates
      const validSpecs = specifications
        .filter(spec => spec.label.trim() && spec.value.trim())
        .map(({ label, value }) => ({ label: label.trim(), value: value.trim() }));

      const validCerts = certificates
        .filter(cert => cert.name.trim() && cert.issuer.trim())
        .map(({ name, issuer }) => ({ name: name.trim(), issuer: issuer.trim() }));

      if (isEditing && auctionId) {
        // Update existing auction
        const { error } = await supabase
          .from('auctions')
          .update({
            title: result.data.title,
            category: result.data.category,
            description: result.data.description,
            starting_price: result.data.startingPrice,
            end_time: result.data.endTime,
            image_urls: imageUrls,
            specifications: validSpecs.length > 0 ? validSpecs : null,
            certificates: validCerts.length > 0 ? validCerts : null,
            current_bid: result.data.startingPrice,
            minimum_increment: parseFloat(formData.get('minimumIncrement') as string) || 100,
          })
          .eq('id', auctionId)
          .eq('submitted_by', user!.id)
          .eq('approval_status', 'pending');

        if (error) throw error;
        toast.success('Auction updated successfully!');
      } else {
        // Create new auction
        const newAuctionId = `auction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const { error } = await supabase
          .from('auctions')
          .insert({
            id: newAuctionId,
            title: result.data.title,
            category: result.data.category,
            description: result.data.description,
            starting_price: result.data.startingPrice,
            end_time: result.data.endTime,
            image_urls: imageUrls,
            specifications: validSpecs.length > 0 ? validSpecs : null,
            certificates: validCerts.length > 0 ? validCerts : null,
            submitted_by: user!.id,
            approval_status: 'pending',
            status: 'pending',
            current_bid: result.data.startingPrice,
            minimum_increment: parseFloat(formData.get('minimumIncrement') as string) || 100,
            original_submission_id: prefilledData.originalId || null
          });

        if (error) throw error;
        toast.success('Auction submitted for approval!');
      }
      
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error submitting auction:', error);
      toast.error(error.message || 'Failed to submit auction');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-24">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">
                {isEditing ? 'Edit Auction Item' : 'Submit Auction Item'}
              </CardTitle>
              <CardDescription>
                {isEditing 
                  ? 'Update your auction submission. Changes will be reviewed by our team.'
                  : 'Submit your luxury item for auction approval. All submissions are reviewed by our team.'}
                {prefilledData.title && !isEditing && (
                  <span className="block mt-2 text-sm font-medium text-gold">
                    ✨ Form pre-filled with your previous submission data
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Basic Information</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      name="title"
                      placeholder="e.g., Rolex Submariner 116610LN"
                      maxLength={200}
                      defaultValue={prefilledData.title || ''}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    {loadingCategories ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Loading categories...</span>
                      </div>
                    ) : (
                    <Select 
                      name="category" 
                      value={selectedCategory || prefilledData.category || ''} 
                      onValueChange={(value) => setSelectedCategory(value)}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                          {categories.length === 0 ? (
                            <SelectItem value="" disabled>No categories available</SelectItem>
                          ) : (
                            categories.map((category) => (
                              <SelectItem key={category.id} value={category.slug}>
                                {category.name}
                              </SelectItem>
                            ))
                          )}
                      </SelectContent>
                    </Select>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Detailed description of the item, including condition, provenance, and any notable features..."
                      rows={6}
                      maxLength={2000}
                      defaultValue={prefilledData.description || ''}
                      required
                    />
                    <p className="text-xs text-muted-foreground">Minimum 20 characters</p>
                  </div>
                </div>

                {/* Pricing */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Pricing</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startingPrice">Starting Price (USD) *</Label>
                      <Input
                        id="startingPrice"
                        name="startingPrice"
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="10000"
                        defaultValue={prefilledData.startingPrice || ''}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="minimumIncrement">Minimum Bid Increment (USD)</Label>
                      <Input
                        id="minimumIncrement"
                        name="minimumIncrement"
                        type="number"
                        min="1"
                        step="1"
                        placeholder="100"
                        defaultValue={prefilledData.minimumIncrement || '100'}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endTime">Auction End Date & Time *</Label>
                    <Input
                      id="endTime"
                      name="endTime"
                      type="datetime-local"
                      min={new Date().toISOString().slice(0, 16)}
                      defaultValue={prefilledData.endTime ? new Date(prefilledData.endTime).toISOString().slice(0, 16) : ''}
                      required
                    />
                  </div>
                </div>

                {/* Images */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Images *</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload high-quality images (max 10 images, 5MB each, JPG/PNG/WEBP)
                  </p>
                  
                  <div className="grid grid-cols-3 gap-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative aspect-square">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    
                    {(images.length + existingImageUrls.length) < 10 && (
                      <label className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gold transition-colors">
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Upload</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          multiple
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Specifications */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Specifications (Optional)</h3>
                    <Button type="button" variant="outline" size="sm" onClick={addSpecification}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                  
                  {specifications.map((spec) => (
                    <div key={spec.id} className="flex gap-2">
                      <Input
                        placeholder="Label (e.g., Brand)"
                        value={spec.label}
                        onChange={(e) => updateSpecification(spec.id, 'label', e.target.value)}
                        maxLength={50}
                      />
                      <Input
                        placeholder="Value (e.g., Rolex)"
                        value={spec.value}
                        onChange={(e) => updateSpecification(spec.id, 'value', e.target.value)}
                        maxLength={100}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSpecification(spec.id)}
                        disabled={specifications.length === 1}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Certificates */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Certificates (Optional)</h3>
                    <Button type="button" variant="outline" size="sm" onClick={addCertificate}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                  
                  {certificates.map((cert) => (
                    <div key={cert.id} className="flex gap-2">
                      <Input
                        placeholder="Certificate Name"
                        value={cert.name}
                        onChange={(e) => updateCertificate(cert.id, 'name', e.target.value)}
                        maxLength={100}
                      />
                      <Input
                        placeholder="Issuer"
                        value={cert.issuer}
                        onChange={(e) => updateCertificate(cert.id, 'issuer', e.target.value)}
                        maxLength={100}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCertificate(cert.id)}
                        disabled={certificates.length === 1}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Submit */}
                <div className="flex gap-4 pt-4">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-gold hover:bg-gold/90"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit for Approval'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/dashboard')}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
