# The Substrate snapshots artifact bytes on ingest; Boards never reference a producing system's URL

A saved Board must survive for "future use," but the bytes it shows are produced and stored by the producing system. image-engine serves its images from `localhost:3002/api/gallery/{genId}/image`, on **local disk only**, durable *by accident* (no eviction has been written — but there is no retention contract either), and bound to image-engine being up. A Board that references that URL is not actually saved: it rots the moment the sibling server is down, the disk is pruned, or the machine changes.

**Decision:** on ingest, when a Step reaches `succeeded` with an artifact URL, the Substrate **fetches the bytes once and stores them in its own artifact store** (a command-center-owned `./artifacts/`-style store), keyed by Step/Branch id. Every Board references the **Substrate-owned URL**, never the producing system's. The producing system's copy is the source-at-generation-time; the Substrate's copy is canonical for anything saved. This extends the architecture's existing principle — *the Substrate owns the durable record, systems are transient producers* — from events to bytes.

Snapshot happens **eagerly at ingest**, not lazily at save time.

**Considered and rejected:**
- **Board references the producing system's URL (no snapshot).** Zero duplication, nothing to build — but it makes "saved" boards depend on another process staying alive, blocks portability/sharing, and turns any future `./uploads` cleanup into silent dead thumbnails.
- **Lazy snapshot at save time** (only copy bytes when a Board is saved). Avoids copying throwaway gens, but its failure mode *is* the rot we're preventing: if image-engine already pruned the source, the snapshot can't happen and the Board saves with holes. Eager-at-ingest also means live rendering and saved Boards resolve the **same** Substrate URL — one code path, no fragile "rebind URLs on save" step. Image bytes are small; the duplication is cheap insurance.

**Consequence:** the ingest path gains a byte-fetch + store-write per `succeeded` Step (cost paid even for gens never saved — accepted, given small image sizes). The Substrate grows an artifact store alongside its event store. The `Artifact` becomes a first-class Substrate concept (see `CONTEXT.md`), addressable independently of whichever system produced it.
