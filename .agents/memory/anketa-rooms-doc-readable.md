---
name: Anketa rooms doc is publicly readable
description: Confirms rooms/{roomId} allows public get (unlike viewKeys), so non-secret room config can be read from the public fill link.
---

Verified via direct Firestore REST calls (`GET .../documents/rooms/{roomId}`) that the `rooms` collection allows unauthenticated `get`/`list` — a nonexistent doc returns `404 NOT_FOUND`, not `PERMISSION_DENIED`, which is how Firestore distinguishes "rule allowed, doc missing" from "rule denied".

**Why:** The fill link only ever contains the roomId (no secret), so anything the fill page needs to read must live on `rooms/{roomId}` and must not require a secret to access. This is the opposite of `viewKeys`, which denies all reads (see anketa-firestore-viewkeys.md) and `responses`, which is create-only (see anketa-firestore-create-only-responses.md).

**How to apply:** Safe to add more public, non-secret fields to the room doc (e.g. the custom `questions` array) for the fill page to consume. Do not put anything secret there — it's reachable by anyone with just the roomId.
