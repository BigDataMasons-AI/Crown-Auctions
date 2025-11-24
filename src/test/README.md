# Automated Testing for XSS Protection

This directory contains automated tests to verify HTML sanitization and XSS protection across the application.

## Test Structure

### Frontend Tests (Vitest)
Located in `src/utils/__tests__/`

**Sanitization Tests** (`sanitization.test.ts`)
- XSS prevention for common attack vectors
- Special character escaping
- Edge cases (empty strings, unicode, long strings)
- Real-world auction data scenarios

### Edge Function Tests (Deno)
Located in `supabase/functions/_tests/`

**Email Sanitization Tests** (`email-sanitization.test.ts`)
- Email template XSS prevention
- Integration tests for all email functions:
  - Outbid notifications
  - Approval emails
  - Rejection emails
  - Withdrawal confirmations

## Running Tests

### Frontend Tests (Vitest)

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Run tests with UI
npm test:ui

# Run tests with coverage
npm test:coverage
```

### Edge Function Tests (Deno)

```bash
# Run all edge function tests
deno test --allow-env supabase/functions/_tests/

# Run specific test file
deno test --allow-env supabase/functions/_tests/email-sanitization.test.ts

# Run with coverage
deno test --allow-env --coverage=coverage supabase/functions/_tests/
```

## Test Coverage

### XSS Attack Vectors Tested

✅ Script tag injection: `<script>alert('XSS')</script>`
✅ Image onerror handler: `<img src=x onerror=alert(1)>`
✅ SVG onload handler: `<svg/onload=alert(1)>`
✅ Iframe JavaScript: `<iframe src="javascript:alert(1)">`
✅ Event handler injection: `" onload="alert('XSS')`
✅ HTML tag injection: `<b>text</b>`

### Special Characters Tested

✅ Ampersand: `&` → `&amp;`
✅ Less than: `<` → `&lt;`
✅ Greater than: `>` → `&gt;`
✅ Double quote: `"` → `&quot;`
✅ Single quote: `'` → `&#39;`

## Continuous Integration

Add to your CI pipeline:

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      # Frontend tests
      - run: npm install
      - run: npm test
      
      # Edge function tests
      - uses: denoland/setup-deno@v1
        with:
          deno-version: v1.x
      - run: deno test --allow-env supabase/functions/_tests/
```

## Writing New Tests

### Adding Frontend Tests

```typescript
import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../sanitization';

describe('New Feature', () => {
  it('should sanitize user input', () => {
    const malicious = '<script>alert("XSS")</script>';
    const result = escapeHtml(malicious);
    expect(result).not.toContain('<script>');
  });
});
```

### Adding Edge Function Tests

```typescript
import { assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";

Deno.test("New Edge Function Test", async (t) => {
  await t.step("should handle XSS in new field", () => {
    const malicious = '<script>alert(1)</script>';
    const sanitized = escapeHtml(malicious);
    assertEquals(sanitized.includes('<script>'), false);
  });
});
```

## Security Best Practices

1. **Always test new user inputs** - Any field that accepts user input should have sanitization tests
2. **Test edge cases** - Empty strings, null values, very long strings
3. **Test real-world scenarios** - Use actual data patterns from your application
4. **Run tests before deployment** - Never deploy without passing all security tests
5. **Update tests when adding features** - New email templates or user inputs need new tests

## Troubleshooting

### Tests failing locally but passing in CI
- Check Node/Deno versions match
- Verify all dependencies are installed
- Clear cache: `npm clean-cache --force`

### Edge function tests not running
- Ensure Deno is installed: `deno --version`
- Check file permissions: `chmod +x supabase/functions/_tests/*.ts`
- Verify test files use `.test.ts` extension

### Coverage not generating
- Run with coverage flag: `npm test:coverage`
- Check `.gitignore` doesn't exclude coverage directory
- Ensure `@vitest/coverage-v8` is installed
