import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowRight, Check, X, Loader2 } from 'lucide-react';
import { useCategoryName } from '@/hooks/useCategoryName';
import { supabase } from '@/integrations/supabase/client';

interface Auction {
  id: string;
  title: string;
  category: string;
  description: string;
  starting_price: number;
  minimum_increment: number;
  created_at: string;
  image_urls: string[];
  specifications?: any;
  certificates?: any;
}

interface ResubmissionComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  original: Auction;
  resubmitted: Auction;
  onApprove: () => void;
  onReject: () => void;
  onCommentChange: (comment: string) => void;
  adminComments?: string | null;
  processing?: boolean;
}

export const ResubmissionComparisonDialog = ({
  open,
  onOpenChange,
  original,
  resubmitted,
  onApprove,
  onReject,
  onCommentChange,
  adminComments,
  processing = false,
}: ResubmissionComparisonDialogProps) => {
  const { getCategoryName } = useCategoryName();
  const [comment, setComment] = useState(adminComments || '');

  const hasChanges = (field: keyof Auction): boolean => {
    const originalValue = original[field];
    const resubmittedValue = resubmitted[field];
    
    if (typeof originalValue === 'object' && typeof resubmittedValue === 'object') {
      return JSON.stringify(originalValue) !== JSON.stringify(resubmittedValue);
    }
    
    return originalValue !== resubmittedValue;
  };

  const titleChanged = hasChanges('title');
  const categoryChanged = hasChanges('category');
  const descriptionChanged = hasChanges('description');
  const priceChanged = hasChanges('starting_price');
  const incrementChanged = hasChanges('minimum_increment');

  const handleCommentChange = (value: string) => {
    setComment(value);
    onCommentChange(value);
  };

  const handleApprove = () => {
    onApprove();
  };

  const handleReject = () => {
    onReject();
  };

  // Helper to get image URL
  const getImageUrl = (imagePath: string) => {
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    return supabase.storage.from('auction-images').getPublicUrl(imagePath).data.publicUrl;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Compare Resubmission</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          {/* Original Submission */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Original Submission</h3>
              <Badge variant="secondary">Rejected</Badge>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{original.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Images */}
                {original.image_urls && original.image_urls.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {original.image_urls.slice(0, 4).map((img, idx) => (
                      <img
                        key={idx}
                        src={getImageUrl(img)}
                        alt={`Original ${idx + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                )}

                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Category: </span>
                    <span className={categoryChanged ? 'line-through opacity-60' : ''}>
                      {getCategoryName(original.category)}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Starting Price: </span>
                    <span className={priceChanged ? 'line-through opacity-60' : ''}>
                      ${Number(original.starting_price).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Minimum Increment: </span>
                    <span className={incrementChanged ? 'line-through opacity-60' : ''}>
                      ${Number(original.minimum_increment).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Description: </span>
                    <p className={`mt-1 text-muted-foreground ${descriptionChanged ? 'line-through opacity-60' : ''}`}>
                      {original.description}
                    </p>
                  </div>
                </div>

                {original.specifications && Array.isArray(original.specifications) && original.specifications.length > 0 && (
                  <div>
                    <p className="font-medium text-sm mb-2">Specifications:</p>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {original.specifications.map((spec: any, idx: number) => (
                        <div key={idx}>
                          <span className="font-medium">{spec.label}:</span> {spec.value}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xs text-muted-foreground pt-2 border-t">
                  Submitted: {new Date(original.created_at).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resubmission */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Resubmission</h3>
              <Badge variant="secondary">Pending Review</Badge>
            </div>

            <Card className={titleChanged || categoryChanged || descriptionChanged || priceChanged || incrementChanged ? 'border-gold' : ''}>
              <CardHeader>
                <CardTitle className="text-base">
                  {resubmitted.title}
                  {titleChanged && <Badge variant="outline" className="ml-2 text-xs bg-gold/10 text-gold border-gold/30">Changed</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Images */}
                {resubmitted.image_urls && resubmitted.image_urls.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {resubmitted.image_urls.slice(0, 4).map((img, idx) => (
                      <img
                        key={idx}
                        src={getImageUrl(img)}
                        alt={`Resubmission ${idx + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                )}

                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Category: </span>
                    <span className={categoryChanged ? 'text-gold font-semibold' : ''}>
                      {getCategoryName(resubmitted.category)}
                    </span>
                    {categoryChanged && <Badge variant="outline" className="ml-2 text-xs bg-gold/10 text-gold border-gold/30">Changed</Badge>}
                  </div>
                  <div>
                    <span className="font-medium">Starting Price: </span>
                    <span className={priceChanged ? 'text-gold font-semibold' : ''}>
                      ${Number(resubmitted.starting_price).toLocaleString()}
                    </span>
                    {priceChanged && <Badge variant="outline" className="ml-2 text-xs bg-gold/10 text-gold border-gold/30">Changed</Badge>}
                  </div>
                  <div>
                    <span className="font-medium">Minimum Increment: </span>
                    <span className={incrementChanged ? 'text-gold font-semibold' : ''}>
                      ${Number(resubmitted.minimum_increment).toLocaleString()}
                    </span>
                    {incrementChanged && <Badge variant="outline" className="ml-2 text-xs bg-gold/10 text-gold border-gold/30">Changed</Badge>}
                  </div>
                  <div>
                    <span className="font-medium">Description: </span>
                    {descriptionChanged && <Badge variant="outline" className="ml-2 text-xs bg-gold/10 text-gold border-gold/30">Changed</Badge>}
                    <p className={`mt-1 text-muted-foreground ${descriptionChanged ? 'text-gold font-medium' : ''}`}>
                      {resubmitted.description}
                    </p>
                  </div>
                </div>

                {resubmitted.specifications && Array.isArray(resubmitted.specifications) && resubmitted.specifications.length > 0 && (
                  <div>
                    <p className="font-medium text-sm mb-2">Specifications:</p>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {resubmitted.specifications.map((spec: any, idx: number) => (
                        <div key={idx}>
                          <span className="font-medium">{spec.label}:</span> {spec.value}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xs text-muted-foreground pt-2 border-t">
                  Resubmitted: {new Date(resubmitted.created_at).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Comparison Comments */}
        <div className="space-y-2 pt-4 border-t">
          <Label htmlFor="comparison-comments">Comparison Comments</Label>
          <Textarea
            id="comparison-comments"
            placeholder="Add your comments about the changes made in this resubmission..."
            value={comment}
            onChange={(e) => handleCommentChange(e.target.value)}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            These comments will be saved and visible to the submitter if approved.
          </p>
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={processing}
          >
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </>
              )}
            </Button>
            <Button
              onClick={handleApprove}
              disabled={processing}
              className="bg-gold hover:bg-gold/90"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Approve
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

