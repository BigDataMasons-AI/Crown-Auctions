import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.190.0/testing/asserts.ts";

// HTML sanitization function (same as in edge functions)
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

Deno.test("Email Sanitization - XSS Prevention", async (t) => {
  await t.step("should escape script tags in auction titles", () => {
    const maliciousTitle = 'Luxury Watch <script>alert("XSS")</script>';
    const sanitized = escapeHtml(maliciousTitle);
    
    assertEquals(sanitized.includes('<script>'), false);
    assertEquals(sanitized.includes('</script>'), false);
    assertStringIncludes(sanitized, '&lt;script&gt;');
    assertStringIncludes(sanitized, '&lt;/script&gt;');
  });

  await t.step("should escape img tags with onerror handlers", () => {
    const maliciousTitle = 'Diamond Ring <img src=x onerror=alert(1)>';
    const sanitized = escapeHtml(maliciousTitle);
    
    assertEquals(sanitized.includes('<img'), false);
    assertEquals(sanitized.includes('onerror='), false);
    assertStringIncludes(sanitized, '&lt;img');
  });

  await t.step("should escape SVG with onload handlers", () => {
    const maliciousTitle = 'Gold Necklace <svg/onload=alert(1)>';
    const sanitized = escapeHtml(maliciousTitle);
    
    assertEquals(sanitized.includes('<svg'), false);
    assertStringIncludes(sanitized, '&lt;svg');
  });

  await t.step("should escape rejection reasons with HTML", () => {
    const maliciousReason = 'Rejected because <b>quality</b> <script>alert(1)</script>';
    const sanitized = escapeHtml(maliciousReason);
    
    assertEquals(sanitized.includes('<b>'), false);
    assertEquals(sanitized.includes('<script>'), false);
    assertStringIncludes(sanitized, '&lt;b&gt;');
    assertStringIncludes(sanitized, '&lt;script&gt;');
  });

  await t.step("should escape user names with special characters", () => {
    const maliciousName = 'User<script>alert(1)</script>';
    const sanitized = escapeHtml(maliciousName);
    
    assertEquals(sanitized.includes('<script>'), false);
    assertStringIncludes(sanitized, '&lt;script&gt;');
  });

  await t.step("should handle empty and null values", () => {
    assertEquals(escapeHtml(''), '');
    assertEquals(escapeHtml(null as any), '');
    assertEquals(escapeHtml(undefined as any), '');
  });

  await t.step("should preserve safe content", () => {
    const safeTitle = 'Rolex Submariner - Excellent Condition';
    const sanitized = escapeHtml(safeTitle);
    
    assertEquals(sanitized, safeTitle);
  });

  await t.step("should escape all special HTML characters", () => {
    const text = '<div class="test" id=\'main\'>A & B</div>';
    const sanitized = escapeHtml(text);
    
    assertStringIncludes(sanitized, '&lt;');
    assertStringIncludes(sanitized, '&gt;');
    assertStringIncludes(sanitized, '&quot;');
    assertStringIncludes(sanitized, '&#39;');
    assertStringIncludes(sanitized, '&amp;');
  });
});

Deno.test("Email Template Integration", async (t) => {
  await t.step("outbid notification should sanitize auction title", () => {
    const auctionTitle = 'Watch <script>alert("XSS")</script>';
    const userName = 'John<script>alert(1)</script>';
    
    const emailHtml = `
      <h2>Hello ${escapeHtml(userName)},</h2>
      <h3>${escapeHtml(auctionTitle)}</h3>
    `;
    
    assertEquals(emailHtml.includes('<script>'), false);
    assertStringIncludes(emailHtml, '&lt;script&gt;');
  });

  await t.step("approval email should sanitize all user inputs", () => {
    const auctionTitle = 'Diamond <img src=x onerror=alert(1)>';
    const displayName = 'User<svg/onload=alert(1)>';
    const auctionId = 'abc123<script>';
    
    const emailHtml = `
      <h2>Hello ${escapeHtml(displayName)},</h2>
      <p><strong>Title:</strong> ${escapeHtml(auctionTitle)}</p>
      <p><strong>Auction ID:</strong> ${escapeHtml(auctionId)}</p>
    `;
    
    assertEquals(emailHtml.includes('<img'), false);
    assertEquals(emailHtml.includes('<svg'), false);
    assertEquals(emailHtml.includes('onerror='), false);
    assertEquals(emailHtml.includes('onload='), false);
  });

  await t.step("rejection email should sanitize rejection reason", () => {
    const rejectionReason = 'Poor quality <script>alert("admin")</script>';
    const auctionTitle = 'Test<iframe src="javascript:alert(1)">';
    
    const emailHtml = `
      <h3>${escapeHtml(auctionTitle)}</h3>
      <p>${escapeHtml(rejectionReason)}</p>
    `;
    
    assertEquals(emailHtml.includes('<script>'), false);
    assertEquals(emailHtml.includes('<iframe'), false);
    assertEquals(emailHtml.includes('javascript:'), false);
  });

  await t.step("withdrawal email should sanitize all fields", () => {
    const auctionTitle = 'Item<script>document.cookie</script>';
    const displayName = 'User<img src=x onerror=alert(1)>';
    const auctionId = 'id<svg>';
    
    const emailHtml = `
      <h2>Hello ${escapeHtml(displayName)},</h2>
      <p><strong>Title:</strong> ${escapeHtml(auctionTitle)}</p>
      <p><strong>Submission ID:</strong> ${escapeHtml(auctionId)}</p>
    `;
    
    assertEquals(emailHtml.includes('<script>'), false);
    assertEquals(emailHtml.includes('<img'), false);
    assertEquals(emailHtml.includes('<svg'), false);
    assertEquals(emailHtml.includes('onerror='), false);
  });
});
