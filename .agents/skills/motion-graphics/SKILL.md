---
name: motion-graphics
description: 'Use the motion library (motion.dev, the successor to Framer Motion) and @shadergradient/react for animated motion graphics and gradient/textured backgrounds. Use when adding animated text/UI motion, or shader gradient backgrounds, to a video or web composition — and especially when deciding WHERE animation belongs: Remotion (interpolate/spring) vs Hyperframes HTML (motion/GSAP) vs ShaderGradient driven deterministically by the frame clock. Triggers: "animated background", "shader gradient", "framer motion", "motion.dev", "gradient backdrop for the video", "animated lower third".'
metadata:
  tags: motion, motion-dev, framer-motion, shadergradient, animation, remotion, hyperframes
---

# Motion graphics

Two libraries, two jobs:

- **`motion`** (motion.dev, formerly Framer Motion) — declarative React animation for UI/text motion.
- **`@shadergradient/react`** — animated 3D shader gradients for backgrounds and textured backdrops.

The hard part isn't the API — it's **placing animation where a deterministic clock exists** so renders are reproducible.

## When to use

- Adding animated text, UI, or transitions to a composition.
- Adding a gradient or textured animated background behind video/text.
- Deciding which animation tool belongs in which layer of the auto-editor pipeline.

## The placement rule (read this first)

| Layer | Has a seekable clock? | Use |
|-------|----------------------|-----|
| **Remotion composition** | Yes — `useCurrentFrame()` | Prefer `interpolate`/`spring`. Do **not** use wall-clock animation (`motion`'s default autoplay) — it won't match the deterministic frame render. |
| **Hyperframes HTML clip** | Yes — engine seeks paused timelines | Use `motion`/GSAP/Anime **paused & seekable**. See [hyperframes](../hyperframes/SKILL.md). |
| **ShaderGradient background** | Depends | In Remotion: drive `uTime` from `useCurrentFrame()/fps` and set `animate="off"`. In Hyperframes: same — seek `uTime` per frame. |

In short: **inside Remotion, animate off the frame number, not the clock.** Reach for `motion`/GSAP only inside Hyperframes HTML, where the engine provides a seekable clock. See [remotion-best-practices](../remotion-best-practices/SKILL.md).

## motion (motion.dev)

```bash
npm install motion
```

```jsx
import { motion } from "motion/react";

<motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }} />
```

`motion` is the successor to Framer Motion (same library, renamed). Full API basics, the placement caveat, and the seekable pattern for Hyperframes are in [references/motion.md](references/motion.md).

## ShaderGradient

```bash
npm i @shadergradient/react @react-three/fiber three three-stdlib camera-controls
```

```jsx
import { ShaderGradientCanvas, ShaderGradient } from "@shadergradient/react";

<ShaderGradientCanvas style={{ position: "absolute", inset: 0 }}>
  <ShaderGradient type="waterPlane" color1="#ff5005" color2="#dbba95" color3="#d0bce1"
                  cDistance={32} animate="off" uTime={0} />
</ShaderGradientCanvas>
```

The key props (`type`, `uTime`, `uSpeed`, `color1/2/3`, `cDistance`, `cameraZoom`, `animate`) and the **deterministic Remotion pattern** (drive `uTime` from the frame number, `animate="off"`) are in [references/shadergradient.md](references/shadergradient.md).
