import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

interface AuctionStatusEmailRequest {
  auctionId: string;
  auctionTitle: string;
  status: 'approved' | 'rejected';
  rejectionReason?: string;
  userEmail: string;
  userName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      auctionId, 
      auctionTitle, 
      status, 
      rejectionReason, 
      userEmail, 
      userName 
    }: AuctionStatusEmailRequest = await req.json();

    console.log(`Sending ${status} email for auction ${auctionId} to ${userEmail}`);

    // Validate required fields
    if (!auctionId || !auctionTitle || !status || !userEmail) {
      throw new Error("Missing required fields");
    }

    const displayName = userName || userEmail.split('@')[0];

    // Prepare email content based on status
    let subject: string;
    let htmlContent: string;

    if (status === 'approved') {
      subject = `🎉 Your Auction Submission Has Been Approved - ${auctionTitle}`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #D4AF37 0%, #C9A02A 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .header h1 { color: white; margin: 0; font-size: 28px; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
              .badge { display: inline-block; background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 20px 0; }
              .auction-details { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .cta-button { display: inline-block; background: #D4AF37; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✨ Congratulations! ✨</h1>
              </div>
              <div class="content">
                <h2>Hello ${escapeHtml(displayName)},</h2>
                <p>We're excited to inform you that your auction submission has been <strong>approved</strong>!</p>
                
                <div class="auction-details">
                  <h3 style="margin-top: 0; color: #D4AF37;">Auction Details</h3>
                  <p><strong>Title:</strong> ${escapeHtml(auctionTitle)}</p>
                  <p><strong>Auction ID:</strong> ${auctionId}</p>
                  <p><strong>Status:</strong> <span class="badge">✓ Approved & Live</span></p>
                </div>

                <p>Your luxury item is now live on our auction platform and bidders can start placing their offers. You can track the bidding activity and monitor your auction's performance through your dashboard.</p>

                <p style="margin-top: 30px;">
                  <a href="${Deno.env.get('VITE_SUPABASE_URL')?.replace('supabase.co', 'lovable.app') || '#'}/auction/${auctionId}" class="cta-button">View Your Auction</a>
                </p>

                <p style="margin-top: 30px; color: #666; font-size: 14px;">
                  <strong>What happens next?</strong><br>
                  • Your auction is now visible to all bidders<br>
                  • You'll receive notifications when bids are placed<br>
                  • Monitor bidding activity in real-time from your dashboard
                </p>

                <p>If you have any questions, please don't hesitate to contact our support team.</p>

                <p style="margin-top: 30px;">Best regards,<br><strong>Crown Auctions Team</strong></p>
              </div>
              <div class="footer">
                <p>Crown Auctions - Premium Luxury Auction House</p>
                <p style="font-size: 12px; color: #999;">This is an automated email. Please do not reply directly to this message.</p>
              </div>
            </div>
          </body>
        </html>
      `;
    } else {
      subject = `Auction Submission Update - ${auctionTitle}`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #6B7280 0%, #4B5563 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .header h1 { color: white; margin: 0; font-size: 28px; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
              .badge { display: inline-block; background: #ef4444; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 20px 0; }
              .auction-details { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .reason-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0; border-radius: 4px; }
              .cta-button { display: inline-block; background: #D4AF37; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Submission Update</h1>
              </div>
              <div class="content">
                <h2>Hello ${escapeHtml(displayName)},</h2>
                <p>Thank you for submitting your item to Crown Auctions. After careful review, we're unable to approve this submission at this time.</p>
                
                <div class="auction-details">
                  <h3 style="margin-top: 0; color: #4B5563;">Submission Details</h3>
                  <p><strong>Title:</strong> ${escapeHtml(auctionTitle)}</p>
                  <p><strong>Submission ID:</strong> ${escapeHtml(auctionId)}</p>
                  <p><strong>Status:</strong> <span class="badge">✗ Not Approved</span></p>
                </div>

                ${rejectionReason ? `
                  <div class="reason-box">
                    <h4 style="margin-top: 0; color: #dc2626;">Reason for Rejection:</h4>
                    <p style="margin-bottom: 0;">${escapeHtml(rejectionReason)}</p>
                  </div>
                ` : ''}

                <p><strong>What you can do next:</strong></p>
                <ul>
                  <li>Review the feedback provided above</li>
                  <li>Make the necessary improvements to your submission</li>
                  <li>Submit a new auction with updated information</li>
                  <li>Contact our support team if you need clarification</li>
                </ul>

                <p style="margin-top: 30px;">
                  <a href="${Deno.env.get('VITE_SUPABASE_URL')?.replace('supabase.co', 'lovable.app') || '#'}/submit-auction" class="cta-button">Submit Another Item</a>
                </p>

                <p style="margin-top: 30px;">We appreciate your interest in Crown Auctions and encourage you to submit again with the feedback in mind. Our team is committed to maintaining the highest standards for our auction platform.</p>

                <p>If you have any questions or need assistance, please contact our support team.</p>

                <p style="margin-top: 30px;">Best regards,<br><strong>Crown Auctions Team</strong></p>
              </div>
              <div class="footer">
                <p>Crown Auctions - Premium Luxury Auction House</p>
                <p style="font-size: 12px; color: #999;">This is an automated email. Please do not reply directly to this message.</p>
              </div>
            </div>
          </body>
        </html>
      `;
    }

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: "Crown Auctions <onboarding@resend.dev>",
      to: [userEmail],
      subject: subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: emailResponse 
      }), 
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-auction-status-email function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);
