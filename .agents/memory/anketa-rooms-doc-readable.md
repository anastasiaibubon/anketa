---
name: Anketa rooms doc access model (get public, list/create owner-gated)
description: Current Firestore rule shape for the rooms collection — single-doc get is public, but list and create require auth + ownerUid match.
---

Firebase project `anketa-8fd17`. Verified via direct Firestore REST calls against the live rules:

- `GET rooms/{roomId}` (single doc) — public, no auth needed → 200. Needed because the friend-facing fill page reads a room's custom `questions` field via just the roomId in the URL, with no login and no secret.
- `LIST rooms` (collection query) — requires `request.auth != null` → anonymous query returns 403. Prevents enumerating every anketa ever created.
- `CREATE rooms/{roomId}` — requires `request.auth != null && request.resource.data.ownerUid == request.auth.uid` → anonymous or wrong-uid create returns 403.
- `rooms/{roomId}/responses` — `create` stays open to anyone (friends fill anonymously, no login); `read`/`list` requires the caller's auth uid to match the parent room's `ownerUid` (checked via a `get()` on the room doc inside the rule).

**Why:** the product intentionally requires login to create/view-owned anketas (Firebase email-link auth), but filling out someone else's anketa must stay fully anonymous — so `get` (single doc, needed to load questions) stays public while `list`/`create`/response-reads are gated to the owner.

**How to apply:** don't assume `rooms` is fully public — only single-doc `get` is. Any feature that needs to enumerate/query the `rooms` collection (not fetch one known id) requires a signed-in user. Any feature reading `responses` requires the signed-in caller to be the room's owner.
