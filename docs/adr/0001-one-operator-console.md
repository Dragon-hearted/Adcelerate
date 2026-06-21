# One operator Console, not two separate surfaces

An earlier decision split the execution-visibility work into two separate surfaces (a Canvas for image flows and a Command Center for agent observability) over a shared Substrate. Once we mapped the actual operator flow — all system *building* stays in the CLI; this product exists only to *run* creative Flows — it became one screen: a left zone (chat, history, lightweight agent-activity summary, and a prompt box with model/param controls) and a right zone (the Canvas where generations land). We therefore build a **single Console with two zones over one Substrate**, with the dense agent telemetry (Spawn Tree) as an expandable panel inside the left zone rather than a separate surface.

**Why not two surfaces:** the original concern behind "separate" was (a) don't duplicate code and (b) don't cram agent telemetry into the image canvas. Both survive in the two-zone layout — the left zone *is* the command-center role, the right zone *is* the Canvas — so the split bought nothing but navigation overhead for an operator who always needs both at once.

_Supersedes the prior "separate surfaces, shared Substrate" decision._
