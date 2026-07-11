---
name: Anketa dropped the viewKey / secret-link results model
description: The old "secret viewKey in the URL" design (viewKeys collection, then a viewKey field on rooms, then a /results/:roomId/:key page) is gone. Results are now viewed only through the owner-gated dashboard.
---

Anketa went through three designs for "how does the creator see responses":
1. A separate `viewKeys/{viewKey}` collection — Firestore rules denied all access to it (read AND write), so this never worked at all.
2. A `viewKey` field stored directly on the `rooms/{roomId}` doc, checked by a `/results/:roomId/:key` page — worked, but was a bearer-token-in-URL design.
3. **Current design**: Firebase email-link auth + an `ownerUid` field on `rooms/{roomId}`. Creating a room requires login; the dashboard queries `rooms` filtered by `ownerUid == auth.uid` and reads `responses` inline (gated by the same ownership check). There is no `viewKey` field, no `/results` route, and no `results.tsx` file anymore — all removed.

**Why:** the product explicitly moved from "anonymous creation, optional login for convenience" to "login required to create and view your own anketas," making a separate secret-link mechanism redundant — ownership + auth already answers "who can see this."

**How to apply:** if old references to `viewKey`, `viewKeys`, or a `/results/:roomId/:key` route surface anywhere (docs, screenshots, old links shared by users), treat them as belonging to a retired design — don't reintroduce that pattern or assume it still exists in the code. See `anketa-rooms-doc-readable.md` for the current access model.
