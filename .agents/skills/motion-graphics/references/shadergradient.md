# ShaderGradient (@shadergradient/react) reference

Animated 3D shader gradients for backgrounds and textured backdrops, built on react-three-fiber.

Repo: https://github.com/ruucm/shadergradient

## Install

```bash
npm i @shadergradient/react @react-three/fiber three three-stdlib camera-controls
npm i -D @types/three
```

## Components

- **`ShaderGradientCanvas`** — the container/wrapper (the r3f canvas).
- **`ShaderGradient`** — the gradient renderer placed inside the canvas.

```jsx
import { ShaderGradientCanvas, ShaderGradient } from "@shadergradient/react";

function Background() {
  return (
    <ShaderGradientCanvas style={{ position: "absolute", inset: 0 }}>
      <ShaderGradient cDistance={32} cPolarAngle={125} />
    </ShaderGradientCanvas>
  );
}
```

## Key props (`ShaderGradient`)

**Animation & movement**
- `animate` — `"on" | "off"`
- `uTime` — current animation time (the master clock)
- `uSpeed` — animation speed
- `uStrength` — wave intensity
- `uFrequency` — wave frequency

**Colors**
- `color1`, `color2`, `color3` — hex strings

**Camera**
- `cDistance` — camera distance
- `cPolarAngle` — vertical angle
- `cAzimuthAngle` — horizontal angle
- `cameraZoom` — zoom

**Geometry**
- `type` — `"plane" | "sphere" | "waterPlane"`
- `positionX/Y/Z`, `rotationX/Y/Z`

**Rendering**
- `shader`, `reflection`, `wireframe`, `grain` (`"on" | "off"`)

Tip: design a look in the ShaderGradient web editor, then copy the prop values into code.

## ⚠️ Deterministic pattern for Remotion

With `animate="on"`, the gradient advances on **wall-clock time** — non-deterministic, so frames won't match across a Remotion render (which seeks frames out of order, in parallel).

**Drive `uTime` from the frame clock and set `animate="off"`:**

```jsx
import { useCurrentFrame, useVideoConfig } from "remotion";
import { ShaderGradientCanvas, ShaderGradient } from "@shadergradient/react";

export const GradientBg = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const uTime = frame / fps; // deterministic: a pure function of the frame number

  return (
    <ShaderGradientCanvas style={{ position: "absolute", inset: 0 }}>
      <ShaderGradient
        type="waterPlane"
        animate="off"        // ← disable internal clock
        uTime={uTime}        // ← we own the clock
        uSpeed={0.3}
        color1="#ff5005"
        color2="#dbba95"
        color3="#d0bce1"
        cDistance={3.6}
        cameraZoom={1}
      />
    </ShaderGradientCanvas>
  );
};
```

Because `uTime = frame / fps`, every frame is reproducible regardless of render order — the same requirement Hyperframes imposes on seekable timelines. Multiply `uTime` by a constant to taste; keep it a pure function of `frame`.

The same pattern works inside a Hyperframes HTML clip: compute `uTime` from `frameTime` in the seek callback rather than letting the shader self-animate.

## Notes

- ShaderGradient mounts an r3f canvas — it can be GPU-heavy. In Remotion renders, keep one gradient per composition and reasonable resolution; test render performance early.
- Place it as a full-frame absolutely-positioned background; layer text/clips above it. See [remotion-best-practices](../../remotion-best-practices/SKILL.md) `rules/3d.md` for r3f-in-Remotion guidance.
