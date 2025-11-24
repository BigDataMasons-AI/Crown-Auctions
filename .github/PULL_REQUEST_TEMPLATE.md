# Pull Request

## Description
<!-- Describe your changes in detail -->

## Type of Change
<!-- Mark the relevant option with an "x" -->

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Security fix (addresses a security vulnerability)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)

## Security Checklist
<!-- Verify security measures before submitting -->

- [ ] I have reviewed the code for potential security vulnerabilities
- [ ] All user inputs are properly sanitized
- [ ] XSS protection is maintained (no direct HTML insertion)
- [ ] All tests pass locally (`npx vitest` and `deno test`)
- [ ] No sensitive data (API keys, passwords) is committed
- [ ] Edge functions use `escapeHtml()` for user-provided data
- [ ] New user inputs have corresponding sanitization tests

## Testing
<!-- Describe the tests you ran -->

- [ ] Frontend tests pass (`npx vitest`)
- [ ] Edge function tests pass (`deno test --allow-env supabase/functions/_tests/`)
- [ ] Manual testing completed
- [ ] Tested in multiple browsers (if UI changes)
- [ ] Tested with malicious inputs (XSS payloads)

## Test Coverage
<!-- If you added new features, describe test coverage -->

**New Tests Added:**
- [ ] Unit tests for new functions
- [ ] Integration tests for new features
- [ ] XSS protection tests for new user inputs
- [ ] N/A - No new testable code

**Coverage Impact:**
<!-- Describe how this PR affects test coverage -->

## Screenshots (if applicable)
<!-- Add screenshots to help explain your changes -->

## Related Issues
<!-- Link related issues: Closes #123, Relates to #456 -->

## Additional Context
<!-- Add any other context about the PR here -->

---

## Reviewer Checklist
<!-- For reviewers -->

- [ ] Code follows project style guidelines
- [ ] Security measures are properly implemented
- [ ] All tests are passing
- [ ] Changes are well documented
- [ ] No sensitive information is exposed
- [ ] User inputs are sanitized appropriately
