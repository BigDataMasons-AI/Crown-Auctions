import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { AuctionComparisonView } from '@/components/AuctionComparisonView';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Heart, Gavel, FileText, Clock, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [savedAuctions, setSavedAuctions] = useState<any[]>([]);
  const [bids, setBids] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [originalSubmissions, setOriginalSubmissions] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [enrichedSavedAuctions, setEnrichedSavedAuctions] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      const [profileRes, savedRes, bidsRes, submissionsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user!.id).single(),
        supabase.from('saved_auctions').select('*').eq('user_id', user!.id).order('saved_at', { ascending: false }),
        supabase.from('bids').select('*').eq('user_id', user!.id).eq('status', 'active').order('bid_time', { ascending: false }),
        supabase.from('auctions').select('*').eq('submitted_by', user!.id).order('created_at', { ascending: false })
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (savedRes.data) {
        setSavedAuctions(savedRes.data);
        
        // Enrich saved auctions with auction details
        const enrichedSaved = await Promise.all(
          savedRes.data.map(async (saved: any) => {
            const { data: auctionData, error: auctionError } = await supabase
              .from('auctions')
              .select('id, title, image_urls, category, status, approval_status, current_bid, starting_price')
              .eq('id', saved.auction_id)
              .maybeSingle();
            
            if (auctionError) {
              console.error(`Error fetching auction ${saved.auction_id}:`, auctionError);
            }
            
            return {
              ...saved,
              auction: auctionData || null
            };
          })
        );
        
        setEnrichedSavedAuctions(enrichedSaved);
      }
      if (submissionsRes.data) {
        setSubmissions(submissionsRes.data);
        
        // Fetch original submissions for resubmissions
        const resubmissions = submissionsRes.data.filter((s: any) => s.original_submission_id);
        if (resubmissions.length > 0) {
          const originalIds = resubmissions.map((s: any) => s.original_submission_id).filter(Boolean);
          const { data: originals } = await supabase
            .from('auctions')
            .select('*')
            .in('id', originalIds);

          if (originals) {
            const originalsMap = new Map(originals.map(o => [o.id, o]));
            setOriginalSubmissions(originalsMap);
          }
        }
      }
      
      if (bidsRes.data) {
        // Get unique auctions and fetch current highest bid for each
        const uniqueAuctions = Array.from(new Set(bidsRes.data.map(b => b.auction_id)));
        const enrichedBids = await Promise.all(
          uniqueAuctions.map(async (auctionId) => {
            const userBidsForAuction = bidsRes.data.filter(b => b.auction_id === auctionId);
            const userHighestBid = Math.max(...userBidsForAuction.map(b => b.bid_amount));
            const userLatestBid = userBidsForAuction[0];
            
            // Fetch auction details
            const { data: auctionData, error: auctionError } = await supabase
              .from('auctions')
              .select('id, title, image_urls, category, status, approval_status')
              .eq('id', auctionId)
              .maybeSingle();
            
            if (auctionError) {
              console.error(`Error fetching auction ${auctionId}:`, auctionError);
            }
            
            // Get current highest bid for this auction (only if auction exists)
            let highestBidData = null;
            let isWinning = false;
            
            if (auctionData) {
              const { data: highestBid } = await supabase
                .from('bids')
                .select('bid_amount, user_id')
                .eq('auction_id', auctionId)
                .eq('status', 'active')
                .order('bid_amount', { ascending: false })
                .limit(1)
                .maybeSingle();
              
              highestBidData = highestBid;
              isWinning = highestBidData?.user_id === user!.id;
            } else {
              console.warn(`Auction ${auctionId} not found in database - bid may be orphaned`);
            }
            
            return {
              ...userLatestBid,
              userHighestBid,
              currentHighestBid: highestBidData?.bid_amount || userHighestBid,
              isWinning,
              totalBids: userBidsForAuction.length,
              auction: auctionData || null
            };
          })
        );
        
        setBids(enrichedBids);
      }
    } catch (error: any) {
      toast.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUpdating(true);

    const formData = new FormData(e.currentTarget);
    const updates = {
      full_name: formData.get('fullName') as string,
      phone: formData.get('phone') as string,
    };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user!.id);

    if (error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated successfully');
      fetchUserData();
    }

    setUpdating(false);
  };

  const handleRemoveSaved = async (id: string) => {
    const { error } = await supabase
      .from('saved_auctions')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to remove from watchlist');
    } else {
      toast.success('Removed from watchlist');
      setSavedAuctions(savedAuctions.filter(a => a.id !== id));
    }
  };

  const handleWithdrawSubmission = async (submission: any) => {
    if (!confirm(`Are you sure you want to withdraw "${submission.title}"? This action cannot be undone.`)) {
      return;
    }

    setWithdrawing(submission.id);
    try {
      // Delete images from storage if they exist
      if (submission.image_urls && submission.image_urls.length > 0) {
        for (const imageUrl of submission.image_urls) {
          try {
            // Extract the path from the full URL
            const url = new URL(imageUrl);
            const path = url.pathname.split('/auction-images/')[1];
            
            if (path) {
              await supabase.storage
                .from('auction-images')
                .remove([path]);
            }
          } catch (error) {
            console.error('Error deleting image:', error);
            // Continue with submission deletion even if image deletion fails
          }
        }
      }

      // Delete the submission
      const { error } = await supabase
        .from('auctions')
        .delete()
        .eq('id', submission.id);

      if (error) throw error;

      // Send withdrawal confirmation email
      const { error: emailError } = await supabase.functions.invoke('send-submission-withdrawal-email', {
        body: {
          auctionTitle: submission.title,
          auctionId: submission.id,
          userEmail: profile?.email || user?.email,
          userName: profile?.full_name,
          submittedDate: submission.created_at,
          category: submission.category,
          description: submission.description,
          startingPrice: submission.starting_price,
          minimumIncrement: submission.minimum_increment
        }
      });

      if (emailError) {
        console.error('Failed to send withdrawal confirmation email:', emailError);
        // Don't fail the withdrawal if email fails
      }

      toast.success('Submission withdrawn successfully. Confirmation email sent.');
      setSubmissions(submissions.filter(s => s.id !== submission.id));
    } catch (error: any) {
      console.error('Error withdrawing submission:', error);
      toast.error('Failed to withdraw submission');
    } finally {
      setWithdrawing(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  if (!user) return null;

  const initials = profile?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || user.email?.[0].toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-gold text-background text-xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold">{profile?.full_name || 'User'}</h1>
                <p className="text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <Button variant="outline" onClick={signOut}>
              Sign Out
            </Button>
          </div>

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="submissions">My Submissions ({submissions.length})</TabsTrigger>
              <TabsTrigger value="watchlist">Watchlist ({savedAuctions.length})</TabsTrigger>
              <TabsTrigger value="bids">My Bids ({bids.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your personal details</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        name="fullName"
                        defaultValue={profile?.full_name || ''}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        value={user.email || ''}
                        disabled
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        defaultValue={profile?.phone || ''}
                      />
                    </div>
                    <Button type="submit" disabled={updating}>
                      {updating ? 'Updating...' : 'Update Profile'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="submissions" className="mt-6">
              <div className="grid gap-4">
                {submissions.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-2">No auction submissions yet</p>
                      <Button asChild className="mt-4">
                        <Link to="/submit-auction">Submit Your First Item</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {submissions.filter(s => s.approval_status === 'pending').length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Clock className="h-5 w-5 text-yellow-500" />
                          Pending Review ({submissions.filter(s => s.approval_status === 'pending').length})
                        </h3>
                        {submissions
                          .filter(s => s.approval_status === 'pending')
                          .map((submission) => (
                            <Card key={submission.id}>
                              <CardContent className="p-6">
                                <div className="flex items-start gap-4">
                                  {submission.image_urls && submission.image_urls.length > 0 && (
                                    <img 
                                      src={submission.image_urls[0]} 
                                      alt={submission.title}
                                      className="w-24 h-24 object-cover rounded-lg"
                                    />
                                  )}
                                  <div className="flex-1">
                                    <div className="flex items-start justify-between gap-4 mb-2">
                                       <div>
                                         <h4 className="font-semibold text-lg">{submission.title}</h4>
                                         <p className="text-sm text-muted-foreground">{submission.category}</p>
                                       </div>
                                       <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">
                                         <Clock className="h-3 w-3 mr-1" />
                                         Pending
                                       </Badge>
                                       {submission.original_submission_id && (
                                         <Badge variant="outline" className="bg-gold/10 text-gold border-gold/30">
                                           Resubmission
                                         </Badge>
                                       )}
                                     </div>
                                    <div className="space-y-1 text-sm text-muted-foreground">
                                      <p>Starting Price: ${Number(submission.starting_price).toLocaleString()}</p>
                                      <p>Submitted: {new Date(submission.created_at).toLocaleDateString()}</p>
                                    </div>
                                     <p className="text-sm text-muted-foreground mt-2 italic">
                                       Your submission is being reviewed by our team. You'll receive an email once it's processed.
                                     </p>
                                     {submission.original_submission_id && originalSubmissions.get(submission.original_submission_id) && (
                                       <div className="mt-3">
                                         <AuctionComparisonView
                                           original={originalSubmissions.get(submission.original_submission_id)!}
                                           resubmitted={submission}
                                           adminComments={submission.admin_comparison_comments}
                                           isAdmin={false}
                                         />
                                       </div>
                                     )}
                                     <Button
                                      variant="outline" 
                                      size="sm" 
                                      className="mt-3 text-destructive hover:text-destructive"
                                      onClick={() => handleWithdrawSubmission(submission)}
                                      disabled={withdrawing === submission.id}
                                    >
                                      {withdrawing === submission.id ? (
                                        <>
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          Withdrawing...
                                        </>
                                      ) : (
                                        <>
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Withdraw Submission
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    )}

                    {submissions.filter(s => s.approval_status === 'approved').length > 0 && (
                      <div className="space-y-4 mt-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-gold" />
                          Approved & Live ({submissions.filter(s => s.approval_status === 'approved').length})
                        </h3>
                        {submissions
                          .filter(s => s.approval_status === 'approved')
                          .map((submission) => (
                            <Card key={submission.id} className="border-gold/30">
                              <CardContent className="p-6">
                                <div className="flex items-start gap-4">
                                  {submission.image_urls && submission.image_urls.length > 0 && (
                                    <img 
                                      src={submission.image_urls[0]} 
                                      alt={submission.title}
                                      className="w-24 h-24 object-cover rounded-lg"
                                    />
                                  )}
                                  <div className="flex-1">
                                     <div className="flex items-start justify-between gap-4 mb-2">
                                       <div>
                                         <h4 className="font-semibold text-lg">{submission.title}</h4>
                                         <p className="text-sm text-muted-foreground">{submission.category}</p>
                                       </div>
                                       <div className="flex gap-2">
                                         <Badge className="bg-gold hover:bg-gold/90">
                                           <CheckCircle className="h-3 w-3 mr-1" />
                                           Live
                                         </Badge>
                                         {submission.original_submission_id && (
                                           <Badge variant="outline" className="bg-gold/10 text-gold border-gold/30">
                                             Resubmission
                                           </Badge>
                                         )}
                                       </div>
                                     </div>
                                     <div className="space-y-1 text-sm text-muted-foreground">
                                       <p>Starting Price: ${Number(submission.starting_price).toLocaleString()}</p>
                                       <p>Current Bid: ${Number(submission.current_bid).toLocaleString()}</p>
                                       <p>Approved: {new Date(submission.approved_at || submission.created_at).toLocaleDateString()}</p>
                                       <p>Ends: {new Date(submission.end_time).toLocaleDateString()}</p>
                                     </div>
                                     {submission.original_submission_id && originalSubmissions.get(submission.original_submission_id) && (
                                       <div className="mt-3">
                                         <AuctionComparisonView
                                           original={originalSubmissions.get(submission.original_submission_id)!}
                                           resubmitted={submission}
                                           adminComments={submission.admin_comparison_comments}
                                           isAdmin={false}
                                         />
                                       </div>
                                     )}
                                     <Button asChild size="sm" className="mt-3">
                                      <Link to={`/auction/${submission.id}`}>View Auction</Link>
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    )}

                    {submissions.filter(s => s.approval_status === 'rejected').length > 0 && (
                      <div className="space-y-4 mt-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <XCircle className="h-5 w-5 text-destructive" />
                          Not Approved ({submissions.filter(s => s.approval_status === 'rejected').length})
                        </h3>
                        {submissions
                          .filter(s => s.approval_status === 'rejected')
                          .map((submission) => (
                            <Card key={submission.id} className="border-destructive/30">
                              <CardContent className="p-6">
                                <div className="flex items-start gap-4">
                                  {submission.image_urls && submission.image_urls.length > 0 && (
                                    <img 
                                      src={submission.image_urls[0]} 
                                      alt={submission.title}
                                      className="w-24 h-24 object-cover rounded-lg opacity-60"
                                    />
                                  )}
                                  <div className="flex-1">
                                    <div className="flex items-start justify-between gap-4 mb-2">
                                      <div>
                                        <h4 className="font-semibold text-lg">{submission.title}</h4>
                                        <p className="text-sm text-muted-foreground">{submission.category}</p>
                                      </div>
                                      <Badge variant="destructive">
                                        <XCircle className="h-3 w-3 mr-1" />
                                        Rejected
                                      </Badge>
                                    </div>
                                    <div className="space-y-1 text-sm text-muted-foreground mb-3">
                                      <p>Starting Price: ${Number(submission.starting_price).toLocaleString()}</p>
                                      <p>Submitted: {new Date(submission.created_at).toLocaleDateString()}</p>
                                    </div>
                                    {submission.rejection_reason && (
                                      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-3">
                                        <p className="text-sm font-medium text-destructive mb-1">Reason for rejection:</p>
                                        <p className="text-sm text-muted-foreground">{submission.rejection_reason}</p>
                                      </div>
                                    )}
                                    <Button asChild size="sm" variant="outline">
                                      <Link to="/submit-auction">Submit Another Item</Link>
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="watchlist" className="mt-6">
              <div className="grid gap-4">
                {enrichedSavedAuctions.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Heart className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No saved auctions yet</p>
                      <Button asChild className="mt-4">
                        <Link to="/">Browse Auctions</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  enrichedSavedAuctions.map((savedAuction: any) => {
                    const auction = savedAuction.auction;
                    const auctionNotFound = !auction;
                    
                    // Handle image URL - check if it's already a full URL or needs storage path conversion
                    let imageUrl = '/placeholder.svg';
                    if (auction?.image_urls && auction.image_urls.length > 0) {
                      const firstImage = auction.image_urls[0];
                      if (firstImage.startsWith('http://') || firstImage.startsWith('https://')) {
                        imageUrl = firstImage;
                      } else {
                        imageUrl = supabase.storage.from('auction-images').getPublicUrl(firstImage).data.publicUrl;
                      }
                    }
                    
                    return (
                      <Card key={savedAuction.id} className={auctionNotFound ? 'border-orange-500/30' : ''}>
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            {auction && (
                              <img 
                                src={imageUrl} 
                                alt={auction.title || 'Auction'}
                                className="w-24 h-24 object-cover rounded-lg"
                              />
                            )}
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-lg">
                                  {auction?.title || `Auction #${savedAuction.auction_id}`}
                                </h3>
                                {auctionNotFound ? (
                                  <Badge variant="secondary" className="bg-orange-500/10 text-orange-700 border-orange-500/20">
                                    Auction Unavailable
                                  </Badge>
                                ) : (
                                  auction?.category && (
                                    <Badge variant="outline">{auction.category}</Badge>
                                  )
                                )}
                              </div>
                              <div className="space-y-1 text-sm text-muted-foreground">
                                {auctionNotFound ? (
                                  <p className="text-orange-600 font-medium mb-2">
                                    ⚠️ This auction is no longer available
                                  </p>
                                ) : (
                                  <>
                                    {auction.current_bid > 0 && (
                                      <p>Current Bid: ${Number(auction.current_bid).toLocaleString()}</p>
                                    )}
                                    {auction.starting_price && (
                                      <p>Starting Price: ${Number(auction.starting_price).toLocaleString()}</p>
                                    )}
                                  </>
                                )}
                                <p>Saved on {new Date(savedAuction.saved_at).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              {!auctionNotFound && (
                                <Button asChild size="sm">
                                  <Link to={`/auction/${savedAuction.auction_id}`}>
                                    View Details
                                  </Link>
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveSaved(savedAuction.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>

            <TabsContent value="bids" className="mt-6">
              <div className="grid gap-4">
                {bids.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Gavel className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No active bids</p>
                      <Button asChild className="mt-4">
                        <Link to="/">Browse Auctions</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  bids.map((bid: any) => {
                    const auction = bid.auction;
                    const auctionNotFound = !auction;
                    
                    // Handle image URL - check if it's already a full URL or needs storage path conversion
                    let imageUrl = '/placeholder.svg';
                    if (auction?.image_urls && auction.image_urls.length > 0) {
                      const firstImage = auction.image_urls[0];
                      if (firstImage.startsWith('http://') || firstImage.startsWith('https://')) {
                        imageUrl = firstImage;
                      } else {
                        imageUrl = supabase.storage.from('auction-images').getPublicUrl(firstImage).data.publicUrl;
                      }
                    }
                    
                    return (
                      <Card key={bid.id} className={bid.isWinning ? 'border-gold/50' : 'border-destructive/30'}>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between gap-4">
                            {auction && (
                              <img 
                                src={imageUrl} 
                                alt={auction.title || 'Auction'}
                                className="w-24 h-24 object-cover rounded-lg"
                              />
                            )}
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-lg">
                                  {auction?.title || `Auction #${bid.auction_id}`}
                                </h3>
                                {auctionNotFound ? (
                                  <Badge variant="secondary" className="bg-orange-500/10 text-orange-700 border-orange-500/20">
                                    Auction Unavailable
                                  </Badge>
                                ) : (
                                  <>
                                    <Badge 
                                      variant={bid.isWinning ? 'default' : 'destructive'}
                                      className={bid.isWinning ? 'bg-gold hover:bg-gold/90' : ''}
                                    >
                                      {bid.isWinning ? '🏆 Winning' : '⚠️ Outbid'}
                                    </Badge>
                                    {auction?.category && (
                                      <Badge variant="outline">{auction.category}</Badge>
                                    )}
                                  </>
                                )}
                              </div>
                              <div className="space-y-1 text-sm text-muted-foreground">
                                {auctionNotFound && (
                                  <p className="text-orange-600 font-medium mb-2">
                                    ⚠️ This auction is no longer available
                                  </p>
                                )}
                                <p>Your highest bid: ${Number(bid.userHighestBid).toLocaleString()}</p>
                                {!auctionNotFound && (
                                  <p>Current highest: ${Number(bid.currentHighestBid).toLocaleString()}</p>
                                )}
                                <p>Last bid: {new Date(bid.bid_time).toLocaleString()}</p>
                                {bid.totalBids > 1 && (
                                  <p className="text-xs">{bid.totalBids} bids placed</p>
                                )}
                              </div>
                            </div>
                            {!auctionNotFound && (
                              <div className="flex flex-col gap-2">
                                <Button asChild size="sm">
                                  <Link to={`/auction/${bid.auction_id}`}>
                                    View Details
                                  </Link>
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
