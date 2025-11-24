import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight, AlertCircle, MessageSquare } from 'lucide-react';

interface AuctionData {
  id: string;
  title: string;
  category: string;
  description: string;
  starting_price: number;
  minimum_increment: number;
  created_at: string;
  image_urls?: string[];
  specifications?: any;
  certificates?: any;
}

interface AuctionComparisonViewProps {
  original: AuctionData;
  resubmitted: AuctionData;
  adminComments?: string | null;
  onAdminCommentChange?: (comment: string) => void;
  isAdmin?: boolean;
}

export const AuctionComparisonView = ({ original, resubmitted, adminComments, onAdminCommentChange, isAdmin }: AuctionComparisonViewProps) => {
  const hasChanges = (field: keyof AuctionData): boolean => {
    const originalValue = original[field];
    const resubmittedValue = resubmitted[field];
    
    if (typeof originalValue === 'object' && typeof resubmittedValue === 'object') {
      return JSON.stringify(originalValue) !== JSON.stringify(resubmittedValue);
    }
    
    return originalValue !== resubmittedValue;
  };

  const ComparisonField = ({ 
    label, 
    originalValue, 
    newValue, 
    changed 
  }: { 
    label: string; 
    originalValue: string | number; 
    newValue: string | number; 
    changed: boolean;
  }) => (
    <div className={`p-3 rounded-lg border ${changed ? 'border-gold/50 bg-gold/5' : 'border-border'}`}>
      <p className="text-sm font-medium mb-2 flex items-center gap-2">
        {label}
        {changed && <Badge variant="outline" className="text-xs bg-gold/10 text-gold border-gold/30">Changed</Badge>}
      </p>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground mb-1">Original</p>
          <p className={`text-sm ${changed ? 'line-through opacity-60' : ''}`}>
            {typeof originalValue === 'number' ? `$${originalValue.toLocaleString()}` : originalValue}
          </p>
        </div>
        {changed && (
          <>
            <ArrowRight className="h-4 w-4 text-gold flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1">New</p>
              <p className="text-sm font-medium text-gold">
                {typeof newValue === 'number' ? `$${newValue.toLocaleString()}` : newValue}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const titleChanged = hasChanges('title');
  const categoryChanged = hasChanges('category');
  const descriptionChanged = hasChanges('description');
  const priceChanged = hasChanges('starting_price');
  const incrementChanged = hasChanges('minimum_increment');
  
  const anyChanges = titleChanged || categoryChanged || descriptionChanged || priceChanged || incrementChanged;

  return (
    <Card className="border-gold/30">
      <CardHeader>
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-gold mt-0.5" />
          <div className="flex-1">
            <CardTitle className="text-lg">Resubmission Detected</CardTitle>
            <CardDescription>
              This submission is a revision of a previous submission (ID: {original.id.slice(0, 20)}...)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!anyChanges ? (
          <div className="p-4 bg-muted rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              No changes detected between original and resubmitted version
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">COMPARISON</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="grid gap-3">
              <ComparisonField
                label="Title"
                originalValue={original.title}
                newValue={resubmitted.title}
                changed={titleChanged}
              />

              <ComparisonField
                label="Category"
                originalValue={original.category}
                newValue={resubmitted.category}
                changed={categoryChanged}
              />

              <ComparisonField
                label="Starting Price"
                originalValue={original.starting_price}
                newValue={resubmitted.starting_price}
                changed={priceChanged}
              />

              <ComparisonField
                label="Minimum Increment"
                originalValue={original.minimum_increment}
                newValue={resubmitted.minimum_increment}
                changed={incrementChanged}
              />

              {descriptionChanged && (
                <div className="p-3 rounded-lg border border-gold/50 bg-gold/5">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    Description
                    <Badge variant="outline" className="text-xs bg-gold/10 text-gold border-gold/30">Changed</Badge>
                  </p>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Original</p>
                      <p className="text-sm line-through opacity-60 line-clamp-2">
                        {original.description}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gold" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">New</p>
                      <p className="text-sm text-gold line-clamp-2">
                        {resubmitted.description}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t">
              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <p className="font-medium mb-1">Original Submitted</p>
                  <p>{new Date(original.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="font-medium mb-1">Resubmitted</p>
                  <p>{new Date(resubmitted.created_at).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Admin Comments Section */}
            {(adminComments || isAdmin) && (
              <div className="pt-3 border-t">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="h-4 w-4 text-gold" />
                  <h4 className="text-sm font-semibold">
                    {isAdmin ? 'Admin Review Comments' : 'Reviewer Feedback'}
                  </h4>
                </div>
                
                {isAdmin ? (
                  <Textarea
                    placeholder="Add comments explaining why these changes improved the submission quality..."
                    value={adminComments || ''}
                    onChange={(e) => onAdminCommentChange?.(e.target.value)}
                    rows={4}
                    className="text-sm"
                  />
                ) : adminComments ? (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {adminComments}
                    </p>
                  </div>
                ) : null}
                
                {isAdmin && !adminComments && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Add feedback to help the submitter understand why their changes improved their submission.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
