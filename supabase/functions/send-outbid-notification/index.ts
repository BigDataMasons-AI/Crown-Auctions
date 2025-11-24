import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// HTML sanitization to prevent XSS in emails
const escapeHtml = (text: string): string => {
  if (!text) return '';
  return text.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char] || char));
};

interface OutbidNotificationRequest {
  userEmail: string;
  userName: string;
  auctionId: string;
  auctionTitle: string;
  newBidAmount: number;
  userPreviousBid: number;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      userEmail, 
      userName, 
      auctionId, 
      auctionTitle, 
      newBidAmount, 
      userPreviousBid 
    }: OutbidNotificationRequest = await req.json();

    console.log("Sending outbid notification to:", userEmail);

    const emailResponse = await resend.emails.send({
      from: "Crown Auctions <onboarding@resend.dev>",
      to: [userEmail],
      subject: "You've been outbid!",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                font-family: 'Arial', sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                color: #D4AF37;
                padding: 30px;
                text-align: center;
                border-radius: 8px 8px 0 0;
              }
              .content {
                background: #ffffff;
                padding: 30px;
                border: 1px solid #e0e0e0;
              }
              .alert {
                background: #fff3cd;
                border-left: 4px solid #D4AF37;
                padding: 15px;
                margin: 20px 0;
              }
              .bid-details {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 6px;
                margin: 20px 0;
              }
              .bid-amount {
                font-size: 24px;
                color: #D4AF37;
                font-weight: bold;
              }
              .button {
                display: inline-block;
                background: #D4AF37;
                color: #1a1a1a;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: bold;
                margin: 20px 0;
              }
              .footer {
                text-align: center;
                color: #666;
                padding: 20px;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">Crown Auctions</h1>
            </div>
            <div class="content">
              <h2>Hello ${escapeHtml(userName || 'Valued Bidder')},</h2>
              
              <div class="alert">
                <strong>⚠️ You've been outbid!</strong>
              </div>
              
              <p>Someone has placed a higher bid on an auction you're bidding on:</p>
              
              <div class="bid-details">
                <h3 style="margin-top: 0; color: #1a1a1a;">${escapeHtml(auctionTitle)}</h3>
                <p style="margin: 10px 0;">
                  <strong>Your previous bid:</strong> $${userPreviousBid.toFixed(2)}<br>
                  <strong>New highest bid:</strong> <span class="bid-amount">$${newBidAmount.toFixed(2)}</span>
                </p>
              </div>
              
              <p>Don't let this opportunity slip away! Place a higher bid to stay in the game.</p>
              
              <div style="text-align: center;">
                <a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || 'https://your-app.lovable.app'}/auction/${auctionId}" class="button">
                  View Auction & Place Bid
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                This is an automated notification. You're receiving this because you placed a bid on this auction.
              </p>
            </div>
            <div class="footer">
              <p>© 2025 Crown Auctions. All rights reserved.</p>
              <p>Premium luxury auction house for jewelry, watches, and diamonds.</p>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-outbid-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
