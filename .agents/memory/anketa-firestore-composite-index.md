---
name: Anketa dashboard needs a Firestore composite index
description: The dashboard's rooms-by-owner query requires a composite index (ownerUid + createdAt) that isn't defined anywhere in code, so it must be created manually per-environment.
---

The anketa dashboard lists a creator's anketas via a Firestore query: `rooms` where `ownerUid == uid`, ordered by `createdAt desc`. This requires a composite index. There is no `firestore.indexes.json` in the repo, so the index only exists if someone created it by hand in the Firebase console (or clicked through the auto-generated link in a `FAILED_PRECONDITION` error).

**Why this matters:** the failure is deterministic and unrelated to data volume — if the index is missing, the dashboard query fails for *every* user, immediately, not just at scale. Verified live: creating a room writes instantly (independent of any `responses`), but listing rooms by owner returned `FAILED_PRECONDITION: The query requires an index` until a matching composite index was created in the Firebase console.

**How to apply:** if a new Firestore query is added anywhere in anketa with more than one filter/order clause, check whether it needs a composite index before assuming "it works because the code is right." If moving to a new Firebase project/environment (e.g. a fresh prod project), this index must be recreated there too — nothing in the codebase provisions it automatically.
