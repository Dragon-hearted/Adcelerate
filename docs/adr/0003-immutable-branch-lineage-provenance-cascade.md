# Immutable Branch lineage with provenance and a provenance-aware cascade

Editing or re-running a Step never mutates it in place: it creates an immutable **Branch** of that Step's output, and the original plus all sibling Branches are preserved (Flora-style lineage). Every Branch carries a **provenance** flag — *agent-generated* or *human-authored* — and exactly one Branch per Step is **active**; the Flow always resumes from the active Branch. A human can override any gate by supplying a replacement artifact, which becomes a human-authored Branch marked active — preserving, not destroying, the agent's version.

**The cascade is provenance-aware.** When an upstream Branch changes and you re-run, downstream *agent-generated* Branches auto-regenerate, but downstream *human-authored* Branches are left untouched and marked **Stale** ("upstream changed") for the operator to resolve per-node (regenerate vs keep-and-reconcile). 

**Why:** the two naive cascade rules both fail — auto-regenerating everything silently destroys hand-made work, while keeping everything silently propagates work that no longer matches its inputs. Provenance is the minimum state needed to do the safe thing automatically and pause only where human judgment is actually required. This is net-new orchestration layered above scene-board's native linear `[A]/[M]/[R]` gates, which only flow forward.
