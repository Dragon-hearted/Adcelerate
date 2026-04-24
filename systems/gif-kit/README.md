# gif-kit

Branded GIF rendering for Adcelerate using Remotion. Produces loopable motion assets
from React compositions — design tokens from `design-system/adapters/remotion.ts`.

## What it is

gif-kit renders Remotion compositions to GIF files. Each composition is a React
component driven by Remotion's frame-based animation primitives (`interpolate`, `Sequence`).
Design tokens (colors, fonts) are pulled from the shared design-system adapter so brand
changes propagate automatically.

Current compositions:
- **BrandIntro** — 4s, 800×800, 30fps. Scene 1: wordmark fade-in on paper. Scene 2: hub-and-spoke on midnight-purple.

## Render a GIF

```bash
# From systems/gif-kit/
bun run gif:render
# Output: out/brand-intro.gif
```

Requires Chromium (Remotion uses it for rendering):
```bash
bunx remotion browser ensure
```

## Preview in Remotion Studio

```bash
bun run dev
# Opens http://localhost:3000
```

## Add a composition

1. Create `src/compositions/YourComp.tsx` — export a React component.
2. Register it in `src/Root.tsx` with a `<Composition>` entry.
3. Add render logic to `src/render.ts` or add a new script entry.
4. Add constants to `design-system/adapters/gif.ts` if needed.

## Scripts

| Script | What it does |
|---|---|
| `bun run dev` | Opens Remotion Studio (live preview) |
| `bun run gif:render` | Renders BrandIntro to `out/brand-intro.gif` |
| `bun run typecheck` | TypeScript type-check without emit |
| `bun run build` | Bundle src to dist/ |
