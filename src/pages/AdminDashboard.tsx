import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { AuctionComparisonView } from '@/components/AuctionComparisonView';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Check, X, Clock, Eye, Play, Pause, Tag } from 'lucide-react';
import { CategoriesManagement } from '@/components/CategoriesManagement';

interface Auction {
  id: string;
  title: string;
  category: string;
  description: string;
  starting_price: number;
  current_bid: number;
  minimum_increment: number;
  approval_status: string;
  status: string;
  submitted_by: string;
  created_at: string;
  image_urls: string[];
  rejection_reason: string | null;
  original_submission_id: string | null;
  admin_comparison_comments: string | null;
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [originalAuctions, setOriginalAuctions] = useState<Map<string, Auction>>(new Map());
  const [adminComments, setAdminComments] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [savingComments, setSavingComments] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user || !isAdmin) {
        toast.error('Access denied. Admin privileges required.');
        navigate('/');
      }
    }
  }, [user, isAdmin, authLoading, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchAuctions();
      
      // Set up real-time subscription
      const channel = supabase
        .channel('admin-auctions')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'auctions'
          },
          () => {
            fetchAuctions();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAdmin]);

  const fetchAuctions = async () => {
    try {
      const { data, error } = await supabase
        .from('auctions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAuctions(data || []);

      // Initialize admin comments map
      const commentsMap = new Map<string, string>();
      (data || []).forEach(auction => {
        if (auction.admin_comparison_comments) {
          commentsMap.set(auction.id, auction.admin_comparison_comments);
        }
      });
      setAdminComments(commentsMap);

      // Fetch original submissions for resubmissions
      const resubmissions = (data || []).filter(a => a.original_submission_id);
      if (resubmissions.length > 0) {
        const originalIds = resubmissions.map(a => a.original_submission_id).filter(Boolean);
        const { data: originals, error: originalsError } = await supabase
          .from('auctions')
          .select('*')
          .in('id', originalIds);

        if (!originalsError && originals) {
          const originalsMap = new Map(originals.map(o => [o.id, o]));
          setOriginalAuctions(originalsMap);
        }
      }
    } catch (error: any) {
      toast.error('Failed to load auctions');
      console.error('Error fetching auctions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (auctionId: string) => {
    setProcessing(true);
    try {
      // Get auction and user details
      const auction = auctions.find(a => a.id === auctionId);
      if (!auction) throw new Error('Auction not found');

      const { data: profileData } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', auction.submitted_by)
        .single();

      // Update auction status
      const { error } = await supabase
        .from('auctions')
        .update({
          approval_status: 'approved',
          approved_by: user!.id,
          approved_at: new Date().toISOString(),
          status: 'active'
        })
        .eq('id', auctionId);

      if (error) throw error;

      // Log the admin action
      await supabase
        .from('admin_activity_log' as any)
        .insert({
          admin_user_id: user!.id,
          auction_id: auctionId,
          action_type: 'approve',
          auction_title: auction.title
        });

      // Send approval email
      if (profileData?.email) {
        const { error: emailError } = await supabase.functions.invoke('send-auction-status-email', {
          body: {
            auctionId: auction.id,
            auctionTitle: auction.title,
            status: 'approved',
            userEmail: profileData.email,
            userName: profileData.full_name
          }
        });

        if (emailError) {
          console.error('Failed to send approval email:', emailError);
        }
      }
      
      toast.success('Auction approved successfully');
      fetchAuctions();
    } catch (error: any) {
      toast.error('Failed to approve auction');
      console.error('Error approving auction:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedAuction || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setProcessing(true);
    try {
      // Get user details
      const { data: profileData } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', selectedAuction.submitted_by)
        .single();

      // Update auction status
      const { error } = await supabase
        .from('auctions')
        .update({
          approval_status: 'rejected',
          approved_by: user!.id,
          approved_at: new Date().toISOString(),
          status: 'rejected',
          rejection_reason: rejectionReason
        })
        .eq('id', selectedAuction.id);

      if (error) throw error;

      // Log the admin action
      await supabase
        .from('admin_activity_log' as any)
        .insert({
          admin_user_id: user!.id,
          auction_id: selectedAuction.id,
          action_type: 'reject',
          auction_title: selectedAuction.title
        });

      // Send rejection email
      if (profileData?.email) {
        const { error: emailError } = await supabase.functions.invoke('send-auction-status-email', {
          body: {
            auctionId: selectedAuction.id,
            auctionTitle: selectedAuction.title,
            status: 'rejected',
            rejectionReason: rejectionReason,
            userEmail: profileData.email,
            userName: profileData.full_name
          }
        });

        if (emailError) {
          console.error('Failed to send rejection email:', emailError);
        }
      }
      
      toast.success('Auction rejected');
      setShowRejectDialog(false);
      setRejectionReason('');
      setSelectedAuction(null);
      fetchAuctions();
    } catch (error: any) {
      toast.error('Failed to reject auction');
      console.error('Error rejecting auction:', error);
    } finally {
      setProcessing(false);
    }
  };

  const openRejectDialog = (auction: Auction) => {
    setSelectedAuction(auction);
    setShowRejectDialog(true);
  };

  const handleAdminCommentChange = (auctionId: string, comment: string) => {
    setAdminComments(prev => {
      const newMap = new Map(prev);
      newMap.set(auctionId, comment);
      return newMap;
    });
  };

  const saveAdminComment = async (auctionId: string) => {
    setSavingComments(prev => new Set(prev).add(auctionId));
    
    try {
      const { error } = await supabase
        .from('auctions')
        .update({
          admin_comparison_comments: adminComments.get(auctionId) || null
        })
        .eq('id', auctionId);

      if (error) throw error;
      
      toast.success('Comment saved successfully');
    } catch (error: any) {
      console.error('Error saving admin comment:', error);
      toast.error('Failed to save comment');
    } finally {
      setSavingComments(prev => {
        const newSet = new Set(prev);
        newSet.delete(auctionId);
        return newSet;
      });
    }
  };

  const handleStartAuction = async (auctionId: string) => {
    setProcessing(true);
    try {
      const auction = auctions.find(a => a.id === auctionId);
      if (!auction) throw new Error('Auction not found');

      const { error } = await supabase
        .from('auctions')
        .update({ status: 'active' })
        .eq('id', auctionId);

      if (error) throw error;

      // Log the admin action
      await supabase
        .from('admin_activity_log' as any)
        .insert({
          admin_user_id: user!.id,
          auction_id: auctionId,
          action_type: 'start',
          auction_title: auction.title
        });
      
      toast.success('Auction started! Bidding is now enabled.');
      fetchAuctions();
    } catch (error: any) {
      toast.error('Failed to start auction');
      console.error('Error starting auction:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handlePauseAuction = async (auctionId: string) => {
    setProcessing(true);
    try {
      const auction = auctions.find(a => a.id === auctionId);
      if (!auction) throw new Error('Auction not found');

      const { error } = await supabase
        .from('auctions')
        .update({ status: 'paused' })
        .eq('id', auctionId);

      if (error) throw error;

      // Log the admin action
      await supabase
        .from('admin_activity_log' as any)
        .insert({
          admin_user_id: user!.id,
          auction_id: auctionId,
          action_type: 'pause',
          auction_title: auction.title
        });
      
      toast.success('Auction paused. Bidding is now disabled.');
      fetchAuctions();
    } catch (error: any) {
      toast.error('Failed to pause auction');
      console.error('Error pausing auction:', error);
    } finally {
      setProcessing(false);
    }
  };

  if (authLoading || adminLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const pendingAuctions = auctions.filter(a => a.approval_status === 'pending');
  const approvedAuctions = auctions.filter(a => a.approval_status === 'approved');
  const rejectedAuctions = auctions.filter(a => a.approval_status === 'rejected');

  const AuctionCard = ({ auction }: { auction: Auction }) => (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <CardTitle className="text-xl">{auction.title}</CardTitle>
              <Badge variant={
                auction.approval_status === 'approved' ? 'default' : 
                auction.approval_status === 'rejected' ? 'destructive' : 
                'secondary'
              }>
                {auction.approval_status}
              </Badge>
              {auction.approval_status === 'approved' && (
                <Badge variant={
                  auction.status === 'active' ? 'default' : 
                  auction.status === 'paused' ? 'secondary' : 
                  'outline'
                }
                className={
                  auction.status === 'active' ? 'bg-green-600 hover:bg-green-700' :
                  auction.status === 'paused' ? 'bg-yellow-600 hover:bg-yellow-700' :
                  ''
                }>
                  {auction.status === 'active' ? '🟢 Live' : 
                   auction.status === 'paused' ? '⏸️ Paused' : 
                   auction.status}
                </Badge>
              )}
              {auction.original_submission_id && (
                <Badge variant="outline" className="bg-gold/10 text-gold border-gold/30">
                  Resubmission
                </Badge>
              )}
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>Category: {auction.category}</p>
              <p>Starting Price: ${Number(auction.starting_price).toLocaleString()}</p>
              <p>Current Bid: ${Number(auction.current_bid).toLocaleString()}</p>
              <p>Submitted: {new Date(auction.created_at).toLocaleDateString()}</p>
            </div>
          </div>
          {auction.image_urls && auction.image_urls.length > 0 && (() => {
            const firstImage = auction.image_urls[0];
            const imageUrl = firstImage.startsWith('http://') || firstImage.startsWith('https://')
              ? firstImage
              : supabase.storage.from('auction-images').getPublicUrl(firstImage).data.publicUrl;
            return (
              <img 
                src={imageUrl} 
                alt={auction.title}
                className="w-24 h-24 object-cover rounded-lg"
              />
            );
          })()}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {auction.description}
        </p>
        {auction.rejection_reason && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm font-medium text-destructive mb-1">Rejection Reason:</p>
            <p className="text-sm text-muted-foreground">{auction.rejection_reason}</p>
          </div>
        )}
        {auction.original_submission_id && originalAuctions.get(auction.original_submission_id) && (
          <div className="mb-4">
            <AuctionComparisonView
              original={originalAuctions.get(auction.original_submission_id)!}
              resubmitted={auction}
              adminComments={adminComments.get(auction.id)}
              onAdminCommentChange={(comment) => handleAdminCommentChange(auction.id, comment)}
              isAdmin={true}
            />
            <div className="mt-3 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => saveAdminComment(auction.id)}
                disabled={savingComments.has(auction.id)}
              >
                {savingComments.has(auction.id) ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Comment'
                )}
              </Button>
            </div>
          </div>
        )}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/auction/${auction.id}`)}
          >
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
          {auction.approval_status === 'pending' && (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={() => handleApprove(auction.id)}
                disabled={processing}
                className="bg-gold hover:bg-gold/90"
              >
                <Check className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => openRejectDialog(auction)}
                disabled={processing}
              >
                <X className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </>
          )}
          {auction.approval_status === 'approved' && (
            <>
              {auction.status === 'active' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePauseAuction(auction.id)}
                  disabled={processing}
                  className="border-yellow-600 text-yellow-600 hover:bg-yellow-50"
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Pause Auction
                </Button>
              ) : auction.status === 'paused' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStartAuction(auction.id)}
                  disabled={processing}
                  className="border-green-600 text-green-600 hover:bg-green-50"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Resume Auction
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStartAuction(auction.id)}
                  disabled={processing}
                  className="border-green-600 text-green-600 hover:bg-green-50"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Auction
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-24">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage and review auction submissions</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Review</p>
                    <p className="text-3xl font-bold">{pendingAuctions.length}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Approved</p>
                    <p className="text-3xl font-bold">{approvedAuctions.length}</p>
                  </div>
                  <Check className="h-8 w-8 text-gold" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Rejected</p>
                    <p className="text-3xl font-bold">{rejectedAuctions.length}</p>
                  </div>
                  <X className="h-8 w-8 text-destructive" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pending">
                Pending ({pendingAuctions.length})
              </TabsTrigger>
              <TabsTrigger value="approved">
                Approved ({approvedAuctions.length})
              </TabsTrigger>
              <TabsTrigger value="rejected">
                Rejected ({rejectedAuctions.length})
              </TabsTrigger>
              <TabsTrigger value="categories">
                <Tag className="h-4 w-4 mr-2" />
                Categories
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-6">
              <div className="grid gap-4">
                {pendingAuctions.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No pending auctions</p>
                    </CardContent>
                  </Card>
                ) : (
                  pendingAuctions.map((auction) => (
                    <AuctionCard key={auction.id} auction={auction} />
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="approved" className="mt-6">
              <div className="grid gap-4">
                {approvedAuctions.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Check className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No approved auctions</p>
                    </CardContent>
                  </Card>
                ) : (
                  approvedAuctions.map((auction) => (
                    <AuctionCard key={auction.id} auction={auction} />
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="rejected" className="mt-6">
              <div className="grid gap-4">
                {rejectedAuctions.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <X className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No rejected auctions</p>
                    </CardContent>
                  </Card>
                ) : (
                  rejectedAuctions.map((auction) => (
                    <AuctionCard key={auction.id} auction={auction} />
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="categories" className="mt-6">
              <CategoriesManagement />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Auction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Please provide a reason for rejecting this auction. This will be visible to the submitter.
            </p>
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason('');
                setSelectedAuction(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing || !rejectionReason.trim()}
            >
              {processing ? 'Rejecting...' : 'Reject Auction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
