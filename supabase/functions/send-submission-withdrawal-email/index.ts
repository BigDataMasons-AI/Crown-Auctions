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

interface WithdrawalEmailRequest {
  auctionTitle: string;
  auctionId: string;
  userEmail: string;
  userName?: string;
  submittedDate: string;
  category?: string;
  description?: string;
  startingPrice?: number;
  minimumIncrement?: number;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      auctionTitle, 
      auctionId,
      userEmail, 
      userName,
      submittedDate,
      category,
      description,
      startingPrice,
      minimumIncrement
    }: WithdrawalEmailRequest = await req.json();

    console.log(`Sending withdrawal confirmation email for ${auctionId} to ${userEmail}`);

    // Validate required fields
    if (!auctionTitle || !auctionId || !userEmail) {
      throw new Error("Missing required fields");
    }

    const displayName = userName || userEmail.split('@')[0];

    // Create resubmit URL with pre-filled data
    const baseUrl = Deno.env.get('VITE_SUPABASE_URL')?.replace('supabase.co', 'lovable.app') || '#';
    const resubmitParams = new URLSearchParams({
      prefill: 'true',
      originalId: auctionId,
      title: auctionTitle,
      ...(category && { category }),
      ...(description && { description }),
      ...(startingPrice && { startingPrice: startingPrice.toString() }),
      ...(minimumIncrement && { minimumIncrement: minimumIncrement.toString() })
    });
    const resubmitUrl = `${baseUrl}/submit-auction?${resubmitParams.toString()}`;

    const htmlContent = `
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
            .badge { display: inline-block; background: #6B7280; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 20px 0; }
            .auction-details { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .info-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 4px; }
            .cta-button { display: inline-block; background: #D4AF37; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Submission Withdrawn</h1>
            </div>
            <div class="content">
              <h2>Hello ${escapeHtml(displayName)},</h2>
              <p>This email confirms that you have successfully withdrawn your auction submission.</p>
              
              <div class="auction-details">
                <h3 style="margin-top: 0; color: #4B5563;">Withdrawn Submission</h3>
                <p><strong>Title:</strong> ${escapeHtml(auctionTitle)}</p>
                <p><strong>Submission ID:</strong> ${escapeHtml(auctionId)}</p>
                <p><strong>Originally Submitted:</strong> ${new Date(submittedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p><strong>Status:</strong> <span class="badge">✓ Withdrawn</span></p>
              </div>

              <div class="info-box">
                <h4 style="margin-top: 0; color: #1e40af;">What this means:</h4>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Your submission has been removed from our review queue</li>
                  <li>All associated images have been deleted from our system</li>
                  <li>You can submit a new auction at any time</li>
                  <li>This action is final and cannot be reversed</li>
                </ul>
              </div>

              <p><strong>Want to submit again?</strong></p>
              <p>If you've changed your mind or would like to submit a different item, we'd love to have you back. You can create a new submission anytime with updated information.</p>

              <p>We've made it easy for you to resubmit with your previous information pre-filled. Simply click the button below and make any adjustments you'd like before submitting.</p>

              <p style="margin-top: 30px; text-align: center;">
                <a href="${resubmitUrl}" class="cta-button">Resubmit with Pre-filled Data</a>
              </p>

              <p style="text-align: center; margin-top: 15px;">
                <a href="${Deno.env.get('VITE_SUPABASE_URL')?.replace('supabase.co', 'lovable.app') || '#'}/submit-auction" style="color: #666; text-decoration: underline; font-size: 14px;">Or submit a completely new item</a>
              </p>

              <p style="margin-top: 30px; color: #666; font-size: 14px;">
                If you withdrew this submission by mistake or have any questions, please contact our support team immediately and reference submission ID: <strong>${escapeHtml(auctionId)}</strong>
              </p>

              <p style="margin-top: 30px;">Best regards,<br><strong>Crown Auctions Team</strong></p>
            </div>
            <div class="footer">
              <p>Crown Auctions - Premium Luxury Auction House</p>
              <p style="font-size: 12px; color: #999;">This is an automated confirmation email. Please do not reply directly to this message.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: "Crown Auctions <onboarding@resend.dev>",
      to: [userEmail],
      subject: `Submission Withdrawn: ${auctionTitle}`,
      html: htmlContent,
    });

    console.log("Withdrawal confirmation email sent successfully:", emailResponse);

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
    console.error("Error in send-submission-withdrawal-email function:", error);
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
