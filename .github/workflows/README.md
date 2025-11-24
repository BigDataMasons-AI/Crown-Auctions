# GitHub Actions Workflows

This directory contains CI/CD workflows for automated testing and security validation.

## Workflows

### 1. Security & XSS Protection Tests (`security-tests.yml`)

**Triggers:**
- Push to `main`, `master`, or `develop` branches
- Pull requests to `main`, `master`, or `develop` branches

**Jobs:**
- **Frontend Tests**: Runs Vitest tests for client-side XSS protection
- **Edge Function Tests**: Runs Deno tests for email sanitization
- **Security Summary**: Aggregates results and posts to PR

**Features:**
- ✅ Runs 45+ security tests automatically
- ✅ Generates coverage reports
- ✅ Posts results as PR comments
- ✅ Uploads coverage to Codecov (if configured)
- ✅ Blocks merging if tests fail

### 2. Scheduled Security Tests (`test-on-schedule.yml`)

**Triggers:**
- Daily at 2 AM UTC
- Manual trigger via GitHub Actions UI

**Purpose:**
- Catch security regressions over time
- Verify dependencies haven't introduced vulnerabilities
- Automatic issue creation on failure

## Status Badges

Add these to your README.md:

```markdown
![Security Tests](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/security-tests.yml/badge.svg)
![Scheduled Tests](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/test-on-schedule.yml/badge.svg)
```

## Configuration

### Required Secrets

No secrets required for basic functionality. Optional:

- `CODECOV_TOKEN`: For coverage upload (optional)

### Branch Protection

Recommended settings in GitHub > Settings > Branches:

1. ✅ Require status checks to pass before merging
2. ✅ Require branches to be up to date before merging
3. ✅ Status checks required:
   - `Frontend Tests (Vitest)`
   - `Edge Function Tests (Deno)`
   - `Security Test Summary`

## Running Workflows Manually

### Via GitHub UI:
1. Go to **Actions** tab
2. Select workflow
3. Click **Run workflow**
4. Choose branch
5. Click **Run workflow**

### Via GitHub CLI:
```bash
gh workflow run security-tests.yml
gh workflow run test-on-schedule.yml
```

## Viewing Results

### In Pull Requests:
- Automatic comments with test results
- Status checks at bottom of PR
- Click "Details" for full logs

### In Actions Tab:
- Complete workflow history
- Downloadable logs
- Coverage reports
- Timing information

## Troubleshooting

### Tests failing in CI but passing locally

**Possible causes:**
1. **Node version mismatch**: Ensure local Node matches CI (18.x)
2. **Dependencies**: Run `npm ci` instead of `npm install`
3. **Environment differences**: Check for platform-specific code
4. **Cache issues**: Clear GitHub Actions cache

**Solutions:**
```bash
# Locally replicate CI environment
nvm use 18
rm -rf node_modules package-lock.json
npm install
npm ci
npx vitest
```

### Deno tests not running

**Check:**
1. Test files exist in `supabase/functions/_tests/`
2. Files use `.test.ts` extension
3. Deno is properly set up in workflow

### Coverage not uploading

**Verify:**
1. Codecov token is set (if using private repo)
2. Coverage files are generated before upload
3. `codecov/codecov-action` version is up to date

## Customization

### Change test schedule:

Edit `test-on-schedule.yml`:
```yaml
schedule:
  - cron: '0 2 * * *'  # Change time/frequency
```

Cron examples:
- `0 * * * *` - Every hour
- `0 0 * * 0` - Weekly (Sundays)
- `0 0 1 * *` - Monthly

### Add more test jobs:

Add to `security-tests.yml`:
```yaml
jobs:
  custom-tests:
    name: Custom Security Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run custom tests
        run: npm run test:custom
```

### Require specific tests for PRs:

In `.github/workflows/security-tests.yml`, add:
```yaml
if: github.event_name == 'pull_request'
```

## Best Practices

1. **Never skip security tests** - They're mandatory for deployment
2. **Fix failing tests immediately** - Don't merge broken tests
3. **Review test output** - Check what's being tested
4. **Keep workflows updated** - Update actions regularly
5. **Monitor scheduled tests** - Respond to failure notifications

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vitest Documentation](https://vitest.dev/)
- [Deno Testing](https://deno.land/manual/testing)
- [Crown Auctions Testing Guide](../../TESTING.md)
