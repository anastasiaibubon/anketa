---
name: Testing Firebase email-link auth end-to-end without a real inbox
description: How to complete a real Firebase passwordless sign-in from the sandbox/shell to get a genuine ID token, for verifying auth-gated Firestore rules.
---

To verify Firebase email-link (passwordless) auth and the security rules that depend on it, without needing a human to click an email:

1. Use a mailinator.com throwaway address (e.g. `some-name@mailinator.com`) as the test email.
2. Trigger the sign-in email via the app's normal flow (or directly via Identity Toolkit REST `accounts:sendOobCode` with `requestType: EMAIL_SIGNIN`).
3. Fetch `https://www.mailinator.com/api/v2/domains/public/inboxes/<name>` (public, no auth) to list messages, then fetch the specific message by id to get its HTML body containing the sign-in link (with `oobCode=...`).
4. Extract the `oobCode` from that link and call Identity Toolkit REST `accounts:signInWithEmailLink` (POST, body `{ email, oobCode }`) to get a real `idToken`, `refreshToken`, and `localId` (uid) — this is a genuine authenticated session, not a mock.
5. Use that `idToken` as a `Bearer` header on Firestore REST calls (`https://firestore.googleapis.com/v1/projects/<project>/databases/(default)/documents/...`) to test authenticated reads/writes against real security rules. Refresh with `securetoken.googleapis.com/v1/token` (`grant_type=refresh_token`) if the idToken expires mid-session.

**Why:** this gives high-confidence verification of auth-gated Firestore rules (create/read/list permission checks tied to `request.auth.uid`) without waiting on a human or building throwaway test UI — and it exercises the real auth provider, not a stub.

**How to apply:** only works because mailinator inboxes are public by design (fine for disposable test addresses, never for real user data). Combine with plain REST calls (no token) to assert the anonymous-denied side of the same rule.
