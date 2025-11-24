import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Bid {
  bid_amount: number;
  bid_time: string;
  user_id: string;
}

interface PredictionRequest {
  bids: Bid[];
  startingPrice: number;
  auctionEndTime: string;
  category: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bids, startingPrice, auctionEndTime, category }: PredictionRequest = await req.json();
    
    if (!bids || bids.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No bids provided',
          prediction: null 
        }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Calculate bid statistics
    const sortedBids = [...bids].sort((a, b) => 
      new Date(a.bid_time).getTime() - new Date(b.bid_time).getTime()
    );
    
    const currentPrice = sortedBids[sortedBids.length - 1].bid_amount;
    const totalBids = bids.length;
    const uniqueBidders = new Set(bids.map(b => b.user_id)).size;
    
    // Calculate time metrics
    const now = new Date().getTime();
    const endTime = new Date(auctionEndTime).getTime();
    const hoursRemaining = Math.max(0, (endTime - now) / (1000 * 60 * 60));
    
    const firstBidTime = new Date(sortedBids[0].bid_time).getTime();
    const lastBidTime = new Date(sortedBids[sortedBids.length - 1].bid_time).getTime();
    const timeSpanHours = (lastBidTime - firstBidTime) / (1000 * 60 * 60);
    const bidsPerHour = timeSpanHours > 0 ? totalBids / timeSpanHours : 0;
    
    // Calculate momentum
    let totalIncrease = 0;
    for (let i = 1; i < sortedBids.length; i++) {
      totalIncrease += sortedBids[i].bid_amount - sortedBids[i - 1].bid_amount;
    }
    const avgIncrement = sortedBids.length > 1 ? totalIncrease / (sortedBids.length - 1) : 0;
    
    // Price acceleration (recent vs early bids)
    const midPoint = Math.floor(sortedBids.length / 2);
    const earlyBids = sortedBids.slice(0, midPoint);
    const recentBids = sortedBids.slice(midPoint);
    
    const earlyAvgIncrement = earlyBids.length > 1 
      ? earlyBids.reduce((sum, bid, i) => i > 0 ? sum + (bid.bid_amount - earlyBids[i-1].bid_amount) : sum, 0) / (earlyBids.length - 1)
      : 0;
    const recentAvgIncrement = recentBids.length > 1
      ? recentBids.reduce((sum, bid, i) => i > 0 ? sum + (bid.bid_amount - recentBids[i-1].bid_amount) : sum, 0) / (recentBids.length - 1)
      : 0;
    
    const acceleration = recentAvgIncrement > earlyAvgIncrement ? 'increasing' : 'stable';
    
    // Build AI prompt with structured data
    const prompt = `You are an auction price prediction expert. Analyze this auction data and predict the final sale price.

AUCTION DATA:
- Category: ${category}
- Starting Price: $${startingPrice}
- Current Price: $${currentPrice}
- Total Bids: ${totalBids}
- Unique Bidders: ${uniqueBidders}
- Average Bid Increment: $${avgIncrement.toFixed(2)}
- Bidding Rate: ${bidsPerHour.toFixed(2)} bids/hour
- Hours Remaining: ${hoursRemaining.toFixed(1)}
- Price Acceleration: ${acceleration}
- Recent Avg Increment: $${recentAvgIncrement.toFixed(2)}
- Early Avg Increment: $${earlyAvgIncrement.toFixed(2)}

BID HISTORY (chronological):
${sortedBids.map((bid, i) => `${i + 1}. $${bid.bid_amount} at ${new Date(bid.bid_time).toISOString()}`).join('\n')}

Based on these patterns, provide:
1. Predicted final price (be realistic, consider momentum, competition, time remaining)
2. Confidence level (high/medium/low)
3. Price range (min-max)
4. Three key factors influencing this prediction

Consider:
- Competition intensity (${uniqueBidders} bidders for ${totalBids} bids = ${(totalBids/uniqueBidders).toFixed(1)} bids per bidder)
- Bidding momentum and acceleration
- Time decay factor (${hoursRemaining.toFixed(1)} hours left)
- Category typical patterns for ${category}

Return ONLY a valid JSON object with this exact structure (no markdown, no explanations):
{
  "predictedPrice": number,
  "confidence": "high" | "medium" | "low",
  "priceRange": { "min": number, "max": number },
  "factors": ["factor1", "factor2", "factor3"]
}`;

    console.log('Calling Lovable AI for price prediction...');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert auction price analyst. Always respond with valid JSON only, no markdown formatting.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), 
          { 
            status: 429, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service credits depleted. Please add credits.' }), 
          { 
            status: 402, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    console.log('AI Response:', aiResponse);
    
    // Parse AI response (handle potential markdown wrapping)
    let prediction;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : aiResponse;
      prediction = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse, parseError);
      throw new Error('Invalid AI response format');
    }

    // Validate and sanitize prediction
    const validatedPrediction = {
      predictedPrice: Math.round(prediction.predictedPrice || currentPrice * 1.15),
      confidence: ['high', 'medium', 'low'].includes(prediction.confidence) 
        ? prediction.confidence 
        : 'medium',
      priceRange: {
        min: Math.round(prediction.priceRange?.min || currentPrice * 1.05),
        max: Math.round(prediction.priceRange?.max || currentPrice * 1.25),
      },
      factors: Array.isArray(prediction.factors) 
        ? prediction.factors.slice(0, 3) 
        : ['Competitive bidding activity', 'Time remaining', 'Current momentum'],
    };

    console.log('Validated prediction:', validatedPrediction);

    return new Response(
      JSON.stringify({ prediction: validatedPrediction }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in predict-auction-price function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        prediction: null 
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
