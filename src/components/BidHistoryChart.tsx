import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { format, formatDistanceToNow } from 'date-fns';
import { TrendingUp, TrendingDown, Activity, Clock, Target, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Bid {
  id: string;
  user_id: string;
  auction_id: string;
  bid_amount: number;
  bid_time: string;
  status: string;
}

interface BidHistoryChartProps {
  bids: Bid[];
  startingPrice: number;
  auctionEndTime: Date;
  category: string;
}

interface Prediction {
  predictedPrice: number;
  confidence: 'high' | 'medium' | 'low';
  priceRange: {
    min: number;
    max: number;
  };
  factors: string[];
}

export function BidHistoryChart({ bids, startingPrice, auctionEndTime, category }: BidHistoryChartProps) {
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [previousBidCount, setPreviousBidCount] = useState(0);
  const [newBidAnimation, setNewBidAnimation] = useState(false);

  // Auto-refresh prediction when significant new bids arrive
  useEffect(() => {
    if (bids.length > previousBidCount && bids.length >= 3) {
      const newBidsCount = bids.length - previousBidCount;
      
      // Trigger new bid animation
      setNewBidAnimation(true);
      
      // Show toast for new bid
      if (newBidsCount === 1) {
        toast.success('New bid placed! Chart updated', {
          duration: 2000,
        });
      } else if (newBidsCount > 1) {
        toast.success(`${newBidsCount} new bids placed! Chart updated`, {
          duration: 2000,
        });
      }
      
      setTimeout(() => setNewBidAnimation(false), 1000);
      
      // Auto-refresh prediction if we have a prediction and 2+ new bids
      if (prediction && newBidsCount >= 2) {
        console.log(`${newBidsCount} new bids detected, auto-refreshing prediction...`);
        toast.info('Refreshing AI prediction with new data...', {
          duration: 2000,
        });
        fetchPrediction();
      }
    }
    setPreviousBidCount(bids.length);
  }, [bids.length]);

  const fetchPrediction = async () => {
    if (bids.length < 3) {
      toast.error('Need at least 3 bids to generate prediction');
      return;
    }

    setLoadingPrediction(true);
    try {
      const { data, error } = await supabase.functions.invoke('predict-auction-price', {
        body: {
          bids: bids.map(b => ({
            bid_amount: b.bid_amount,
            bid_time: b.bid_time,
            user_id: b.user_id,
          })),
          startingPrice,
          auctionEndTime: auctionEndTime.toISOString(),
          category,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.prediction) {
        setPrediction(data.prediction);
        toast.success('Price prediction generated!');
      }
    } catch (error: any) {
      console.error('Prediction error:', error);
      toast.error('Failed to generate prediction');
    } finally {
      setLoadingPrediction(false);
    }
  };

  if (bids.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bid History & Analytics</CardTitle>
          <CardDescription>No bids placed yet</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
          <div className="text-center">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Be the first to place a bid!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort bids by time
  const sortedBids = [...bids].sort((a, b) => 
    new Date(a.bid_time).getTime() - new Date(b.bid_time).getTime()
  );

  // Prepare chart data
  const chartData = [
    {
      time: 'Start',
      amount: startingPrice,
      timestamp: new Date(sortedBids[0].bid_time).getTime() - 3600000, // 1 hour before first bid
      displayTime: 'Starting Price',
    },
    ...sortedBids.map((bid, index) => ({
      time: format(new Date(bid.bid_time), 'HH:mm'),
      amount: bid.bid_amount,
      timestamp: new Date(bid.bid_time).getTime(),
      displayTime: formatDistanceToNow(new Date(bid.bid_time), { addSuffix: true }),
      bidNumber: index + 1,
    }))
  ];

  // Calculate analytics
  const totalBids = bids.length;
  const priceIncrease = bids[bids.length - 1].bid_amount - startingPrice;
  const percentageIncrease = ((priceIncrease / startingPrice) * 100).toFixed(1);
  
  // Calculate bid frequency (bids per hour)
  const timeSpan = (new Date(sortedBids[sortedBids.length - 1].bid_time).getTime() - 
                    new Date(sortedBids[0].bid_time).getTime()) / (1000 * 60 * 60);
  const bidsPerHour = timeSpan > 0 ? (totalBids / timeSpan).toFixed(1) : totalBids.toString();

  // Calculate momentum (average bid increase)
  let totalIncrease = 0;
  for (let i = 1; i < sortedBids.length; i++) {
    totalIncrease += sortedBids[i].bid_amount - sortedBids[i - 1].bid_amount;
  }
  const avgIncrement = sortedBids.length > 1 ? Math.round(totalIncrease / (sortedBids.length - 1)) : 0;

  // Identify unique bidders
  const uniqueBidders = new Set(sortedBids.map(b => b.user_id)).size;

  // Calculate price momentum (recent vs earlier average)
  const midPoint = Math.floor(sortedBids.length / 2);
  const firstHalfAvg = sortedBids.slice(0, midPoint).reduce((sum, b) => sum + b.bid_amount, 0) / midPoint;
  const secondHalfAvg = sortedBids.slice(midPoint).reduce((sum, b) => sum + b.bid_amount, 0) / (sortedBids.length - midPoint);
  const momentum = secondHalfAvg > firstHalfAvg ? 'increasing' : 'decreasing';

  const formatPrice = (value: number) => `$${value.toLocaleString()}`;

  return (
    <Card className={newBidAnimation ? 'animate-pulse border-gold' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Bid History & Analytics</CardTitle>
            <CardDescription>Price trends and bidding patterns • Real-time updates</CardDescription>
          </div>
          {newBidAnimation && (
            <Badge className="bg-gold animate-fade-in">
              <Activity className="h-3 w-3 mr-1 animate-pulse" />
              New Bid!
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Analytics Summary */}
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${newBidAnimation ? 'animate-fade-in' : ''}`}>
          <div className="space-y-1 transition-all duration-300 hover:scale-105">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Activity className="h-4 w-4" />
              <span>Total Bids</span>
            </div>
            <p className="text-2xl font-bold">{totalBids}</p>
            <p className="text-xs text-muted-foreground">{uniqueBidders} bidder{uniqueBidders !== 1 ? 's' : ''}</p>
          </div>

          <div className="space-y-1 transition-all duration-300 hover:scale-105">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>Price Increase</span>
            </div>
            <p className="text-2xl font-bold text-gold">${priceIncrease.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">+{percentageIncrease}%</p>
          </div>

          <div className="space-y-1 transition-all duration-300 hover:scale-105">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Bid Frequency</span>
            </div>
            <p className="text-2xl font-bold">{bidsPerHour}</p>
            <p className="text-xs text-muted-foreground">bids/hour</p>
          </div>

          <div className="space-y-1 transition-all duration-300 hover:scale-105">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {momentum === 'increasing' ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-orange-500" />
              )}
              <span>Momentum</span>
            </div>
            <Badge variant={momentum === 'increasing' ? 'default' : 'secondary'} className={momentum === 'increasing' ? 'bg-green-500 hover:bg-green-600' : ''}>
              {momentum === 'increasing' ? 'Heating Up' : 'Cooling'}
            </Badge>
            <p className="text-xs text-muted-foreground">Avg: ${avgIncrement.toLocaleString()}</p>
          </div>
        </div>

        {/* AI Price Prediction */}
        {bids.length >= 3 && (
          <div className={`space-y-4 p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 transition-all duration-300 ${prediction && newBidAnimation ? 'animate-fade-in' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                <h4 className="font-semibold">AI Price Prediction</h4>
              </div>
              <Button 
                onClick={fetchPrediction} 
                disabled={loadingPrediction}
                size="sm"
                variant="outline"
                className="hover:border-purple-500"
              >
                {loadingPrediction ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4 mr-2" />
                    {prediction ? 'Refresh' : 'Generate Prediction'}
                  </>
                )}
              </Button>
            </div>

            {prediction && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Predicted Final Price</p>
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                      ${prediction.predictedPrice.toLocaleString()}
                    </p>
                    <Badge 
                      variant={
                        prediction.confidence === 'high' ? 'default' : 
                        prediction.confidence === 'medium' ? 'secondary' : 
                        'outline'
                      }
                      className={
                        prediction.confidence === 'high' ? 'bg-green-500 hover:bg-green-600' : ''
                      }
                    >
                      {prediction.confidence} confidence
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Price Range</p>
                    <p className="text-lg font-semibold">
                      ${prediction.priceRange.min.toLocaleString()} - ${prediction.priceRange.max.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Expected variance: ±${Math.round((prediction.priceRange.max - prediction.priceRange.min) / 2).toLocaleString()}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Potential Increase</p>
                    <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                      +${(prediction.predictedPrice - bids[bids.length - 1].bid_amount).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(((prediction.predictedPrice - bids[bids.length - 1].bid_amount) / bids[bids.length - 1].bid_amount) * 100).toFixed(1)}% from current
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Key Prediction Factors:</p>
                  <div className="grid gap-2">
                    {prediction.factors.map((factor, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <div className="h-6 w-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-purple-600 dark:text-purple-400">{index + 1}</span>
                        </div>
                        <p className="text-muted-foreground">{factor}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded bg-blue-500/10 border border-blue-500/20">
                  <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
                  <p className="text-xs text-muted-foreground">
                    Prediction will auto-refresh when 2+ new bids are placed
                  </p>
                </div>

                <p className="text-xs text-muted-foreground italic">
                  * Prediction based on AI analysis of bidding patterns, competition, and time remaining. Not a guarantee.
                </p>
              </div>
            )}

            {!prediction && !loadingPrediction && (
              <p className="text-sm text-muted-foreground">
                Click "Generate Prediction" to use AI analysis for estimated final price based on current bidding patterns. Predictions auto-refresh as new bids arrive.
              </p>
            )}
          </div>
        )}

        {/* Price Trend Chart */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Price Trend Over Time</h4>
            <Badge variant="outline" className="text-xs">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse mr-2"></div>
              Live
            </Badge>
          </div>
          <div className={newBidAnimation ? 'animate-scale-in' : ''}>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--gold))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--gold))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="time" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                tickFormatter={formatPrice}
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => [formatPrice(value), 'Bid Amount']}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    return payload[0].payload.displayTime;
                  }
                  return label;
                }}
              />
               <Area 
                 type="monotone" 
                 dataKey="amount" 
                 stroke="hsl(var(--gold))" 
                 strokeWidth={2}
                 fill="url(#colorAmount)" 
               />
               {prediction && (
                 <ReferenceLine 
                   y={prediction.predictedPrice} 
                   stroke="rgb(168, 85, 247)" 
                   strokeDasharray="5 5"
                   strokeWidth={2}
                   label={{ 
                     value: `Predicted: $${prediction.predictedPrice.toLocaleString()}`, 
                     position: 'right',
                     fill: 'rgb(168, 85, 247)',
                     fontSize: 12,
                     fontWeight: 'bold'
                   }}
                 />
               )}
             </AreaChart>
           </ResponsiveContainer>
          </div>
         </div>

        {/* Bidding Pattern Insights */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Bidding Insights</h4>
          <div className="grid gap-2 text-sm">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <span className="text-muted-foreground">Average Bid Increment</span>
              <span className="font-semibold">${avgIncrement.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <span className="text-muted-foreground">Competitive Activity</span>
              <Badge variant={uniqueBidders >= 3 ? 'default' : 'secondary'}>
                {uniqueBidders >= 3 ? 'High' : uniqueBidders >= 2 ? 'Medium' : 'Low'}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <span className="text-muted-foreground">Bidding Pace</span>
              <Badge variant={parseFloat(bidsPerHour) >= 2 ? 'default' : 'secondary'}>
                {parseFloat(bidsPerHour) >= 2 ? 'Fast' : parseFloat(bidsPerHour) >= 0.5 ? 'Moderate' : 'Slow'}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
