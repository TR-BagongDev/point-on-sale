# E2E Tests

This directory contains end-to-end tests for the Point of Sale application.

## Setup

### Authentication

Authenticated tests require a valid session. To set up authentication:

1. Ensure the dev server is running: `npm run dev`
2. Run the auth setup script: `npx tsx scripts/setup-auth.ts`

This will create `e2e/.auth/admin.json` with the authenticated session state.

### Running Tests

Run all E2E tests:
```bash
npx playwright test
```

Run specific test file:
```bash
npx playwright test e2e/create-order.spec.ts
```

Run tests in headed mode (to see the browser):
```bash
npx playwright test --headed
```

Run tests with UI mode:
```bash
npx playwright test --ui
```

## Test Files

- `login.spec.ts` - Tests for the login flow
- `create-order.spec.ts` - Tests for the create order flow (cashier page)

## Notes

- Tests use Playwright's `storageState` to preserve authentication
- Mock API responses are used where appropriate to avoid dependency on database state
- Tests are configured to run against the local dev server on `http://localhost:3000`
