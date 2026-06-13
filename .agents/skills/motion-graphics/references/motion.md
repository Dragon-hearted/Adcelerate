# motion (motion.dev) reference

`motion` is a React animation library for production-grade UI animation. It was previously called **Framer Motion** — same library, renamed; imports moved to `motion/react`.

Docs: https://motion.dev

## Install

```bash
npm install motion
```

```javascript
import { motion } from "motion/react";
```

## The `motion` component

Prefix any HTML/SVG tag with `motion.` to make it animatable:

```jsx
<motion.div animate={{ scale: 2 }} />
```

### Core props

| Prop | Purpose |
|------|---------|
| `initial` | Starting values. On enter, animates `initial → animate`. Set `initial={false}` to skip the entry animation. |
| `animate` | Target values; Motion transitions to them automatically. |
| `transition` | How the animation runs: `duration`, `ease`, `delay`, `type` (`"spring"` / `"tween"`). |
| `exit` | Target values when leaving (requires `AnimatePresence`). |
| `whileHover` / `whileTap` / `whileInView` | Gesture/viewport-driven targets. |

Physical properties like `x` and `scale` use **spring physics** by default; visual properties like `opacity` use **tween** easing.

```jsx
<motion.button
  initial={{ scale: 0 }}
  animate={{ scale: 1 }}
  transition={{ duration: 2 }}
/>
```

### `useAnimate`

An imperative hook returning `[scope, animate]` for manual sequencing — useful when you need to drive animation from a timeline rather than declarative props.

## ⚠️ Placement inside Remotion

Motion's declarative `animate` runs on **wall-clock time** (`requestAnimationFrame`). Remotion renders by **seeking frames** (`useCurrentFrame()`), so wall-clock animation will **not** sync with the deterministic render — frames render out of order and in parallel during export.

**Inside a Remotion composition, do NOT use `motion`'s autoplay animation.** Use Remotion's `interpolate` / `spring` driven by `useCurrentFrame()` instead:

```jsx
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

const frame = useCurrentFrame();
const { fps } = useVideoConfig();
const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
const scale = spring({ frame, fps, config: { damping: 200 } });
return <div style={{ opacity, transform: `scale(${scale})` }} />;
```

See [remotion-best-practices](../../remotion-best-practices/SKILL.md) (`rules/timing.md`, `rules/text-animations.md`).

## ✅ Using motion inside Hyperframes HTML

Hyperframes renders by seeking **paused** timelines per frame, so it *does* provide a seekable clock. There you can use Motion One / WAAPI (or GSAP) — but they must be **paused** and exposed on `window.__timelines` so the engine can `seek(frameTime)`:

```javascript
// Hyperframes: paused, seekable — engine drives currentTime each frame
const a = el.animate([{ opacity: 0, transform: "translateY(40px)" },
                      { opacity: 1, transform: "translateY(0)" }],
                     { duration: 800, fill: "both" });
a.pause();
window.__timelines = window.__timelines || {};
window.__timelines.demo = { seek: (t) => { a.currentTime = Math.max(0, t * 1000); } };
```

See [hyperframes](../../hyperframes/SKILL.md).

## Rule of thumb

- **Web UI / interactive** → `motion` declarative props (its native home).
- **Remotion composition** → `interpolate`/`spring` off `useCurrentFrame()`.
- **Hyperframes HTML clip** → Motion One/GSAP **paused & seekable**.
