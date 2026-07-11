---
name: Anketa Firestore viewKeys read-blocked
description: The anketa app's private results page cannot load because Firestore security rules deny all reads on the viewKeys collection.
---

The `anketa` artifact (Firebase project `anketa-8fd17`) writes a room's private access secret into a `viewKeys/{viewKey}` document at creation time, and `results.tsx` validates the private results link by doing `getDoc(doc(db, 'viewKeys', viewKey))`.

Verified via direct Firestore REST calls (with a correctly matching Referer/Origin header, since the project's API key is referrer-restricted to the app's domain): a `get` *and* a `list` on `viewKeys` both return `PERMISSION_DENIED`, while `rooms/{roomId}` and `rooms/{roomId}/responses` read fine with the same headers. This proves it's a Firestore Security Rule denial scoped to the `viewKeys` collection specifically — not an API-key/referrer issue (those apply uniformly across all Firestore calls, not per collection).

**Why this matters:** results.tsx's `getDoc` call therefore always throws, and the page always falls into its catch block ("Не вдалося завантажити відповіді") — the results-viewing flow has likely never worked for any creator, independent of any of this app's own code.

**How to apply:** There is no `firestore.rules` / `firebase.json` checked into this repo — Firestore rules for this project are managed directly in the Firebase console, outside agent reach. Don't assume the rules match what's implied by app code/comments; if debugging anything read/write related in this app, verify actual Firestore behavior with a real REST call (with matching Referer header) rather than trusting the client SDK code path alone. A fix requires updating rules in the Firebase console to allow `get` (but not `list`, to prevent enumeration) on `viewKeys/{key}`.
