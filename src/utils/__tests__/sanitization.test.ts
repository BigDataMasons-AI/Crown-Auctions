import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../sanitization';

describe('escapeHtml', () => {
  describe('XSS Prevention', () => {
    it('should escape script tags', () => {
      const malicious = '<script>alert("XSS")</script>';
      const result = escapeHtml(malicious);
      expect(result).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
    });

    it('should escape img tag with onerror handler', () => {
      const malicious = '<img src=x onerror=alert("XSS")>';
      const result = escapeHtml(malicious);
      expect(result).toBe('&lt;img src=x onerror=alert(&quot;XSS&quot;)&gt;');
      expect(result).not.toContain('<img');
      expect(result).not.toContain('onerror=');
    });

    it('should escape SVG with onload handler', () => {
      const malicious = '<svg/onload=alert("XSS")>';
      const result = escapeHtml(malicious);
      expect(result).toBe('&lt;svg/onload=alert(&quot;XSS&quot;)&gt;');
      expect(result).not.toContain('<svg');
    });

    it('should escape event handlers in attributes', () => {
      const malicious = 'text" onload="alert(\'XSS\')';
      const result = escapeHtml(malicious);
      expect(result).toBe('text&quot; onload=&quot;alert(&#39;XSS&#39;)');
      expect(result).not.toContain('onload="');
    });

    it('should escape iframe injection', () => {
      const malicious = '<iframe src="javascript:alert(\'XSS\')"></iframe>';
      const result = escapeHtml(malicious);
      expect(result).not.toContain('<iframe');
      expect(result).not.toContain('javascript:');
    });

    it('should escape mixed HTML and JavaScript', () => {
      const malicious = 'Luxury Watch <script>alert("XSS")</script> $5000';
      const result = escapeHtml(malicious);
      expect(result).toBe('Luxury Watch &lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt; $5000');
    });
  });

  describe('Special Characters', () => {
    it('should escape ampersands', () => {
      const text = 'Fish & Chips';
      expect(escapeHtml(text)).toBe('Fish &amp; Chips');
    });

    it('should escape less than and greater than', () => {
      const text = '5 < 10 > 3';
      expect(escapeHtml(text)).toBe('5 &lt; 10 &gt; 3');
    });

    it('should escape double quotes', () => {
      const text = 'He said "Hello"';
      expect(escapeHtml(text)).toBe('He said &quot;Hello&quot;');
    });

    it('should escape single quotes', () => {
      const text = "It's working";
      expect(escapeHtml(text)).toBe('It&#39;s working');
    });

    it('should escape all special characters together', () => {
      const text = '<div class="test" id=\'main\'>A & B</div>';
      const result = escapeHtml(text);
      expect(result).toBe('&lt;div class=&quot;test&quot; id=&#39;main&#39;&gt;A &amp; B&lt;/div&gt;');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('should handle null/undefined', () => {
      expect(escapeHtml(null as any)).toBe('');
      expect(escapeHtml(undefined as any)).toBe('');
    });

    it('should handle strings with no special characters', () => {
      const text = 'Regular text without special chars';
      expect(escapeHtml(text)).toBe(text);
    });

    it('should handle repeated special characters', () => {
      const text = '<<< >>> &&& """';
      expect(escapeHtml(text)).toBe('&lt;&lt;&lt; &gt;&gt;&gt; &amp;&amp;&amp; &quot;&quot;&quot;');
    });

    it('should handle unicode characters safely', () => {
      const text = 'Hello 世界 🌍';
      expect(escapeHtml(text)).toBe('Hello 世界 🌍');
    });

    it('should handle very long strings', () => {
      const malicious = '<script>alert("XSS")</script>'.repeat(100);
      const result = escapeHtml(malicious);
      expect(result).not.toContain('<script>');
      expect(result.split('&lt;script&gt;').length).toBe(101);
    });
  });

  describe('Real-world Auction Data', () => {
    it('should safely escape auction titles with HTML', () => {
      const title = 'Rolex <b>Submariner</b> - Rare Edition';
      const result = escapeHtml(title);
      expect(result).not.toContain('<b>');
      expect(result).toContain('&lt;b&gt;');
    });

    it('should escape auction descriptions with injections', () => {
      const description = 'Beautiful watch <img src=x onerror=alert(1)> certified authentic';
      const result = escapeHtml(description);
      expect(result).not.toContain('<img');
      expect(result).not.toContain('onerror=');
    });

    it('should preserve price formatting characters', () => {
      const text = 'Price: $1,500.00 - $2,000.00';
      expect(escapeHtml(text)).toBe('Price: $1,500.00 - $2,000.00');
    });
  });
});
