# Testing Guide - XSS Protection & Security

This guide covers automated testing for XSS protection and HTML sanitization in the Crown Auctions platform.

## 🚀 Quick Start

### Frontend Tests (Vitest)

```bash
# Run all tests
npx vitest

# Run tests in watch mode (auto-rerun on file changes)
npx vitest --watch

# Run tests with UI (opens browser interface)
npx vitest --ui

# Run tests with coverage report
npx vitest --coverage
```

### Edge Function Tests (Deno)

```bash
# Install Deno (if not already installed)
# macOS/Linux:
curl -fsSL https://deno.land/install.sh | sh

# Windows (PowerShell):
irm https://deno.land/install.ps1 | iex

# Run edge function tests
deno test --allow-env supabase/functions/_tests/

# Run with verbose output
deno test --allow-env --trace-ops supabase/functions/_tests/

# Run specific test file
deno test --allow-env supabase/functions/_tests/email-sanitization.test.ts
```

## 📋 What's Being Tested

### ✅ XSS Attack Vectors

Our tests verify protection against:

| Attack Type | Example Payload | Expected Result |
|------------|----------------|-----------------|
| Script Injection | `<script>alert('XSS')</script>` | Escaped to `&lt;script&gt;...` |
| Image Onerror | `<img src=x onerror=alert(1)>` | Escaped, no execution |
| SVG Onload | `<svg/onload=alert(1)>` | Escaped, no execution |
| Event Handlers | `" onload="alert('XSS')` | Quotes escaped |
| Iframe JavaScript | `<iframe src="javascript:alert(1)">` | Fully escaped |

### ✅ Email Templates

All email notifications are tested:

1. **Outbid Notifications** - Sanitizes auction titles and user names
2. **Approval Emails** - Sanitizes auction details and display names
3. **Rejection Emails** - Sanitizes rejection reasons and auction info
4. **Withdrawal Confirmations** - Sanitizes all user-provided data

### ✅ Special Characters

- `&` → `&amp;`
- `<` → `&lt;`
- `>` → `&gt;`
- `"` → `&quot;`
- `'` → `&#39;`

## 📊 Test Results

After running tests, you'll see output like:

```
✓ src/utils/__tests__/sanitization.test.ts (45 tests) 892ms
  ✓ escapeHtml > XSS Prevention (6 tests)
  ✓ escapeHtml > Special Characters (5 tests)
  ✓ escapeHtml > Edge Cases (6 tests)
  ✓ escapeHtml > Real-world Auction Data (3 tests)

Test Files  1 passed (1)
     Tests  45 passed (45)
  Start at  10:30:00
  Duration  1.2s
```

## 🔧 Adding Package.json Scripts (Optional)

To make testing easier, you can manually add these scripts to your `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:edge": "deno test --allow-env supabase/functions/_tests/"
  }
}
```

Then you can run:
```bash
npm test
npm run test:watch
npm run test:ui
npm run test:coverage
npm run test:edge
```

## 🎯 Manual Testing Checklist

In addition to automated tests, perform these manual checks:

### 1. Create Malicious Auction
- [ ] Title: `Luxury Watch <script>alert('XSS')</script>`
- [ ] Description: `Beautiful <img src=x onerror=alert(1)> timepiece`
- [ ] Submit and verify data is stored safely

### 2. Approve as Admin
- [ ] Sign in as admin
- [ ] Approve the test auction
- [ ] Check approval email for escaped HTML

### 3. Email Verification
- [ ] Verify no JavaScript alerts appear in email client
- [ ] View email HTML source
- [ ] Confirm special characters are escaped (`&lt;`, `&gt;`, etc.)
- [ ] Test in multiple email clients (Gmail, Outlook, etc.)

### 4. Reject with Malicious Reason
- [ ] Reject an auction with: `Poor quality <script>alert(1)</script>`
- [ ] Verify rejection email escapes the reason

### 5. Withdrawal Test
- [ ] Withdraw a submission with malicious title
- [ ] Check withdrawal confirmation email

## 🚨 Expected Behavior

### ✅ PASS - Sanitization Working

```html
<!-- In email HTML source -->
Luxury Watch &lt;script&gt;alert('XSS')&lt;/script&gt;
```

```
<!-- Rendered in email client -->
Luxury Watch <script>alert('XSS')</script>
```
(Text is visible, but script doesn't execute)

### ❌ FAIL - Vulnerability Present

```html
<!-- In email HTML source -->
Luxury Watch <script>alert('XSS')</script>
```

```javascript
// Browser shows alert popup
alert('XSS')
```

## 🔍 Debugging Failed Tests

### Test fails: "Expected ... not to contain '<script>'"

**Problem:** Sanitization function not applied
**Solution:** Verify `escapeHtml()` is called on all user inputs in email templates

### Test fails: Edge function tests can't find Deno

**Problem:** Deno not installed or not in PATH
**Solution:** Install Deno following instructions above

### Test fails: Module not found errors

**Problem:** Dependencies not installed
**Solution:** Run `npm install` to install all test dependencies

## 📈 Coverage Reports

After running `npx vitest --coverage`, open the coverage report:

```bash
# Coverage report generated at: coverage/index.html
open coverage/index.html  # macOS
start coverage/index.html # Windows
xdg-open coverage/index.html # Linux
```

**Target Coverage:**
- Sanitization functions: 100%
- Email templates: 90%+
- Overall: 80%+

## 🔄 Continuous Integration

### GitHub Actions Example

Create `.github/workflows/test.yml`:

```yaml
name: Security Tests

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm install
    
    - name: Run frontend tests
      run: npx vitest --run
    
    - name: Setup Deno
      uses: denoland/setup-deno@v1
      with:
        deno-version: v1.x
    
    - name: Run edge function tests
      run: deno test --allow-env supabase/functions/_tests/
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      if: always()
      with:
        files: ./coverage/coverage-final.json
```

## 🛡️ Security Testing Workflow

1. **Before Coding**
   - Review security requirements
   - Identify all user input points

2. **During Development**
   - Write tests for new features
   - Run tests in watch mode: `npx vitest --watch`

3. **Before Committing**
   - Run full test suite: `npx vitest`
   - Run edge function tests: `deno test --allow-env supabase/functions/_tests/`
   - Verify all tests pass

4. **Before Deploying**
   - Run with coverage: `npx vitest --coverage`
   - Review coverage report
   - Perform manual testing checklist
   - Verify no security warnings

## 📚 Additional Resources

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [Vitest Documentation](https://vitest.dev/)
- [Deno Testing Documentation](https://deno.land/manual/testing)
- [Crown Auctions Security Documentation](./src/test/README.md)

## 🆘 Need Help?

If tests are failing or you need assistance:

1. Check the [Troubleshooting section](#-debugging-failed-tests)
2. Review test output for specific error messages
3. Verify all dependencies are installed
4. Check that edge functions are deployed
5. Review the test files for expected behavior

---

**Remember:** Security testing is not optional. All changes must pass security tests before deployment.
