---
name: Anketa Firestore responses collection is create-only
description: The anketa app's rooms/{roomId}/responses collection allows create but denies update and delete via Firestore security rules — edits must be modeled as new documents, not in-place updates.
---

Verified directly against the live Firestore REST API (project `anketa-8fd17`, with a matching Referer/Origin header): `POST` (create) on `rooms/{roomId}/responses` succeeds, but both `PATCH` (update) and `DELETE` on an existing response document return `PERMISSION_DENIED`. `get`/`list` on the same collection work fine (confirmed separately).

**Why this matters:** any feature that needs to modify or remove an existing response document (e.g. letting a friend fix a typo in their submitted answer) cannot use `updateDoc`/`deleteDoc` from the client — it will always fail with `FirebaseError: Missing or insufficient permissions`. The working pattern used for the "edit response" feature: give each responder a stable secret (`editKey`) stored on their response doc; an "edit" creates a *new* document carrying the same `editKey` and a fresh `ts`; readers (results page, edit-link loader) always resolve to the document with the highest `ts` for a given `editKey`, effectively deduping to the latest version client-side.

**How to apply:** Before implementing any edit/delete-style feature on this Firestore project, verify actual rule behavior with a real REST call (as above) rather than assuming standard CRUD works — this project's rules are managed outside the repo (Firebase console) and are stricter/different per-collection (see the separate `viewKeys`-collection note). If a feature genuinely requires updating/deleting existing documents, it will need a server-side path (e.g. a Cloud Function using the Firebase Admin SDK, which bypasses client security rules) since the client is permanently blocked.
