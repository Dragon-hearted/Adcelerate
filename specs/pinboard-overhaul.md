# Pinboard App Overhaul - Implementation Plan

## Problem Statement

The Pinboard app currently uses fal.ai with NanoBanana Pro for image generation. It needs:
1. Switch to Google AI Studio API with the base "nanobanana" model
2. Image tagging system ([image 1], [image 2], etc.) for easy reference in prompts
3. Smart reference system distinguishing "prompt-only" references vs "generation" references
4. Complete UI redesign - premium creative tool aesthetic, not generic AI-generated look

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  Client (React + Tailwind)                              │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Tagged       │  │ Smart Prompt │  │ Reference     │  │
│  │ Gallery      │  │ Editor       │  │ Mode Toggle   │  │
│  │ [image 1]    │  │ parses tags  │  │ gen/prompt    │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
└───────────────────────┬─────────────────────────────────┘
                        │ POST /api/generate
                        │ { prompt, generationRefIds[], promptOnlyRefIds[] }
┌───────────────────────┴─────────────────────────────────┐
│  Server (Bun + Hono)                                    │
│  ┌──────────────────┐  ┌─────────────────────────────┐  │
│  │ GoogleAIProvider  │  │ Enhanced generate route     │  │
│  │ @google/genai     │  │ separates gen vs prompt     │  │
│  │ model: nanobanana │  │ reference images            │  │
│  └──────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 1: Google AI Studio Provider

### Files to change
- `server/src/providers/fal.ts` → **DELETE** (or keep as fallback)
- `server/src/providers/google.ts` → **CREATE**
- `server/src/providers/registry.ts` → **MODIFY**
- `server/package.json` → **MODIFY** (swap `@fal-ai/serverless-client` for `@google/generative-ai`)
- `.env.example` → **MODIFY**

### Implementation: `server/src/providers/google.ts`

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ImageProvider, ModelInfo, GenerationRequest } from "../types";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_STUDIO_KEY || "");

export class GoogleAIProvider implements ImageProvider {
  name = "google";

  models: ModelInfo[] = [
    {
      id: "nanobanana",
      name: "NanoBanana",
      description: "Fast image generation with reference support",
    },
  ];

  async generate(
    request: GenerationRequest,
    referenceImageBuffers: { buffer: Buffer; mimeType: string }[]
  ): Promise<{ imageBuffer: Buffer; mimeType: string }> {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // Build parts array: text prompt + inline reference images
    const parts: any[] = [{ text: request.prompt }];

    for (const ref of referenceImageBuffers) {
      parts.push({
        inlineData: {
          mimeType: ref.mimeType,
          data: ref.buffer.toString("base64"),
        },
      });
    }

    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseModalities: ["image", "text"],
      },
    });

    // Extract image from response
    const response = result.response;
    for (const candidate of response.candidates || []) {
      for (const part of candidate.content?.parts || []) {
        if (part.inlineData) {
          const imageBuffer = Buffer.from(part.inlineData.data, "base64");
          return { imageBuffer, mimeType: part.inlineData.mimeType || "image/png" };
        }
      }
    }

    throw new Error("No image returned from Google AI Studio");
  }
}
```

### Registry update

```typescript
import { GoogleAIProvider } from "./google";

const registry = new ProviderRegistry();
registry.register(new GoogleAIProvider());

// Default model changes to "nanobanana"
getDefaultModel(): string {
  return "nanobanana";
}
```

### Package changes
```diff
- "@fal-ai/serverless-client": "^0.15.0"
+ "@google/generative-ai": "^0.21.0"
```

### Env changes
```diff
- FAL_KEY=your_fal_api_key_here
+ GOOGLE_AI_STUDIO_KEY=your_google_ai_studio_key_here
PORT=3001
```

---

## Phase 2: Image Tagging System

### Concept
Each uploaded reference image gets a sequential tag displayed as an overlay badge: **[image 1]**, **[image 2]**, etc. Tags are assigned by upload order (array index + 1). When an image is removed, remaining images re-index.

### Files to change
- `client/src/components/ReferenceGallery.tsx` → **MODIFY** (add tag overlay + reference mode toggle)
- `client/src/types/index.ts` → **MODIFY** (add `referenceMode` to tracked state)
- `client/src/hooks/useReferenceImages.ts` → **MODIFY** (add mode tracking per image)

### Tagged image type (client)

```typescript
// Add to client types
export interface TaggedImage extends ImageRecord {
  tag: number;  // 1-based index
  referenceMode: 'generation' | 'prompt-only';  // default: 'generation'
}
```

### useReferenceImages changes

```typescript
export function useReferenceImages() {
  const [images, setImages] = useState<TaggedImage[]>([])

  // Tags auto-assigned by array position
  // When uploading, new images get tag = current length + 1
  // When removing, all images re-tag sequentially

  const toggleReferenceMode = useCallback((id: string) => {
    setImages(prev => prev.map(img =>
      img.id === id
        ? { ...img, referenceMode: img.referenceMode === 'generation' ? 'prompt-only' : 'generation' }
        : img
    ))
  }, [])

  // Re-tag after remove
  const removeImage = useCallback(async (id: string) => {
    await deleteImage(id)
    setImages(prev => prev
      .filter(img => img.id !== id)
      .map((img, i) => ({ ...img, tag: i + 1 }))
    )
  }, [])

  return { images, uploading, uploadFiles, removeImage, addImageRecord, toggleReferenceMode }
}
```

### ReferenceGallery UI for tags

Each thumbnail shows:
- **Tag badge** in top-left: e.g. `[image 1]` - monospace, semi-transparent dark bg
- **Mode indicator** in bottom: pill toggle between "Gen ref" (purple) and "Prompt only" (gray)
- Click the mode indicator to toggle

```
┌──────────────────┐
│ [image 1]    [X] │  ← tag badge top-left, remove top-right
│                  │
│   thumbnail      │
│                  │
│ ┌──────────────┐ │
│ │ ● Gen ref    │ │  ← mode toggle bottom (clickable)
│ └──────────────┘ │
└──────────────────┘
```

---

## Phase 3: Smart Prompt + Reference System

### Concept

The user writes natural language prompts that can reference tagged images:
> "Use the background from [image 1] with the pose from [image 2] but change the outfit to red"

The system needs to:
1. Parse `[image N]` references in the prompt text
2. Distinguish which images go to the API as actual reference images (mode: `generation`)
3. Which images are just for context in the prompt text (mode: `prompt-only`)
4. Only send `generation` mode images as reference buffers to the API

### API changes

**GenerationRequest** (both client and server types):

```typescript
export interface GenerationRequest {
  prompt: string;
  model: string;
  generationRefIds: string[];   // Images sent as actual references to the model
  promptOnlyRefIds: string[];   // Images referenced in prompt but NOT sent to model
  options?: Record<string, unknown>;
}
```

### Server generate route changes

```typescript
// In generate.ts POST handler:
// Only load generationRefIds as buffers
const referenceImageBuffers = [];
for (const refId of body.generationRefIds) {
  // ... load buffer (same as current referenceImageIds logic)
}

// Store both sets in the generation record
const generationRecord = {
  // ...
  referenceImageIds: JSON.stringify({
    generation: body.generationRefIds,
    promptOnly: body.promptOnlyRefIds,
  }),
};
```

### Client prompt editor enhancements

- As user types `[image `, show autocomplete dropdown with available tags
- Highlight `[image N]` tokens in the textarea with colored styling (use a contenteditable div or overlay approach)
- Show a small preview tooltip when hovering over a tag reference

### Client generation flow

```typescript
// In App.tsx handleGenerate:
const generationRefIds = ref.images
  .filter(img => img.referenceMode === 'generation')
  .map(img => img.id);

const promptOnlyRefIds = ref.images
  .filter(img => img.referenceMode === 'prompt-only')
  .map(img => img.id);

gen.generateImage(generationRefIds, promptOnlyRefIds, prompt, selectedModel);
```

---

## Phase 4: Complete UI Redesign

### Design Philosophy
- **Premium dark creative tool** - think Figma/Midjourney aesthetic
- **Glass morphism** with frosted panels and subtle borders
- **Gradient accents** - warm amber/orange palette instead of generic purple
- **Depth** via layered surfaces, subtle shadows, and blur
- **Micro-animations** - smooth transitions, hover reveals, spring physics
- **Typography** - Inter font, tight tracking on headings, generous whitespace

### Color Palette Change

Replace purple accent with warm amber/copper gradient:

```javascript
// tailwind.config.js
colors: {
  accent: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },
  surface: {
    DEFAULT: 'rgba(24, 24, 27, 0.8)',
    solid: '#18181b',
    elevated: 'rgba(39, 39, 42, 0.6)',
    overlay: 'rgba(0, 0, 0, 0.4)',
  }
}
```

### New Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌──────────┐                                    ┌───────────┐  │
│  │ Pinboard │  ← glass nav                       │ nanobanana│  │
│  └──────────┘                                    └───────────┘  │
├────────────────┬────────────────────────┬───────────────────────┤
│                │                        │                       │
│   REFERENCES   │    CANVAS / OUTPUT     │      HISTORY          │
│   ────────────  │    ────────────────    │     ─────────         │
│   [image 1] ●  │                        │     gen thumb 1       │
│   [image 2] ○  │    generated image     │     gen thumb 2       │
│   [image 3] ●  │    or placeholder      │     gen thumb 3       │
│                │                        │                       │
│   + Upload     │                        │                       │
│                │                        │                       │
│   ─────────── │                         │                       │
│   PROMPT       │                        │                       │
│   ┌──────────┐│                        │                       │
│   │ textarea ││                        │                       │
│   │          ││                        │                       │
│   └──────────┘│                        │                       │
│   [Generate ●]│                        │                       │
│                │                        │                       │
└────────────────┴────────────────────────┴───────────────────────┘
```

Three-column layout:
1. **Left panel (320px)**: References + Upload + Prompt editor (all creative inputs together)
2. **Center canvas (flex)**: Large generated image display with action bar
3. **Right panel (280px)**: Generation history (collapsible)

### globals.css additions

```css
/* Glass morphism base */
.glass {
  background: rgba(24, 24, 27, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.glass-elevated {
  background: rgba(39, 39, 42, 0.4);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* Gradient text for branding */
.gradient-text {
  background: linear-gradient(135deg, #fbbf24, #f59e0b, #d97706);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Glow effects */
.glow-amber {
  box-shadow: 0 0 20px rgba(245, 158, 11, 0.15),
              0 0 60px rgba(245, 158, 11, 0.05);
}

/* Smooth micro-animations */
@keyframes slideUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.animate-slide-up { animation: slideUp 0.3s ease-out; }
.animate-scale-in { animation: scaleIn 0.2s ease-out; }
```

### Component-by-Component Redesign

#### Layout.tsx
- Three-column with glass panels
- Frosted top navbar with gradient logo
- Subtle grid/noise background texture on the base layer
- Panels separated by `border-white/5` dividers

#### ImageUploader.tsx
- Compact inline button within the references panel (not a big drop zone)
- Drag-over state: panel border glows amber
- Small "+" icon button that expands on hover

#### ReferenceGallery.tsx
- Vertical list layout (not grid) since it's in a narrow left panel
- Each image: rounded thumbnail + tag badge + mode toggle pill
- Tag badge: `[image 1]` in monospace on frosted dark overlay
- Mode toggle: small clickable pill, amber = "Gen ref", zinc = "Prompt only"
- Subtle hover lift effect with shadow
- Drag to reorder (stretch goal)

#### PromptEditor.tsx
- Textarea with subtle inner glow on focus
- `[image N]` references highlighted inline (amber color)
- Character count + reference count in footer
- Generate button: gradient amber with subtle glow, icon + text
- Keyboard shortcut hint: `Cmd+Enter` shown faded

#### GeneratedImage.tsx (now Canvas.tsx)
- Full center panel, image centered with subtle shadow
- Loading: skeleton shimmer with amber pulse
- Empty state: beautiful illustration or gradient placeholder
- Image appears with scale-in animation
- Floating action buttons overlaid at bottom of image (not separate section)

#### ActionBar.tsx
- Merged into canvas as floating overlay buttons
- Glass morphism buttons floating at bottom of generated image
- Icons-first with text on hover/larger screens

#### GenerationHistory.tsx
- Right sidebar, collapsible
- Masonry-style thumbnails or compact list
- Active item has amber left border glow
- Timestamps in relative format
- Model badge per item

#### ModelSelector.tsx
- Simplified since there's only one model now (nanobanana)
- Could become a simple badge/indicator instead of a dropdown
- Or keep as dropdown for future model additions

---

## Step-by-Step Implementation Order

### Step 1: Server - Google AI Provider
1. Remove `@fal-ai/serverless-client` from `server/package.json`
2. Add `@google/generative-ai` to `server/package.json`
3. Create `server/src/providers/google.ts` implementing `ImageProvider`
4. Update `server/src/providers/registry.ts` to use `GoogleAIProvider`
5. Update `.env.example` with `GOOGLE_AI_STUDIO_KEY`
6. Delete `server/src/providers/fal.ts`
7. Run `cd pinboard/server && bun install`

### Step 2: Server - Enhanced Generation Route
1. Update `server/src/types.ts` - add `generationRefIds` and `promptOnlyRefIds` to `GenerationRequest`
2. Update `server/src/routes/generate.ts` - handle new request shape, only send generation refs to provider
3. Keep backward compat: if old `referenceImageIds` field is present, treat all as generation refs

### Step 3: Client - Types & Hooks
1. Update `client/src/types/index.ts` - add `TaggedImage`, update `GenerationRequest`
2. Update `client/src/hooks/useReferenceImages.ts` - add tagging, mode toggle, re-indexing
3. Update `client/src/hooks/useImageGeneration.ts` - accept split ref IDs
4. Update `client/src/api/client.ts` - send new request shape

### Step 4: Client - UI Redesign (all components)
1. Update `client/tailwind.config.js` - new color palette, animations, glass utilities
2. Update `client/src/styles/globals.css` - glass morphism, gradients, animations
3. Rewrite `client/src/components/Layout.tsx` - three-column glass layout
4. Rewrite `client/src/components/ReferenceGallery.tsx` - vertical list with tags + mode toggles
5. Rewrite `client/src/components/ImageUploader.tsx` - compact inline upload
6. Rewrite `client/src/components/PromptEditor.tsx` - tag highlighting, enhanced UX
7. Rewrite `client/src/components/GeneratedImage.tsx` - full canvas with floating actions
8. Merge `ActionBar.tsx` into `GeneratedImage.tsx` as floating overlay
9. Rewrite `client/src/components/GenerationHistory.tsx` - right panel design
10. Simplify `client/src/components/ModelSelector.tsx` - badge style
11. Update `client/src/App.tsx` - wire new props, split ref IDs

### Step 5: Integration & Polish
1. Test full flow: upload → tag → set modes → write prompt with refs → generate
2. Verify only "generation" ref images are sent to API
3. Verify "prompt-only" images are referenced in prompt text but not sent as buffers
4. Polish animations, transitions, edge cases
5. Test responsive behavior

---

## Key Design Decisions

1. **Tag assignment**: Sequential by upload order (1-based). Re-indexes on removal to avoid gaps.
2. **Default reference mode**: `generation` (all uploaded images sent to API by default). User explicitly opts images into `prompt-only` mode.
3. **Prompt parsing**: Client-side regex `/\[image\s+(\d+)\]/gi` highlights tags. No server parsing needed.
4. **Three-column layout**: Creative inputs left, output center, history right. All inputs in one panel reduces context switching.
5. **Color palette**: Warm amber/copper replaces generic purple. Feels premium and creative, not corporate.

---

## Testing Strategy

1. **Provider test**: Verify Google AI Studio API call with reference images returns an image buffer
2. **Tagging test**: Upload 3 images, verify tags [image 1-3]. Remove [image 2], verify re-index to [image 1-2]
3. **Mode toggle test**: Toggle image to prompt-only, generate, verify it's NOT in the API request body's generation refs
4. **Prompt reference test**: Type `[image 1]`, verify it highlights. Type `[image 5]` with only 3 images, verify no match
5. **UI test**: Visual regression on all states (empty, loading, with results, error)

## Success Criteria

- [ ] App uses Google AI Studio API with `GOOGLE_AI_STUDIO_KEY` env var
- [ ] Only "nanobanana" model available (no pro/2)
- [ ] Uploaded images show sequential [image N] tags
- [ ] Tags re-index when images are removed
- [ ] Each image has a toggleable mode: generation ref vs prompt-only
- [ ] Prompt editor highlights [image N] references
- [ ] Only generation-mode images sent as reference buffers to API
- [ ] UI is visually distinct - glass morphism, warm palette, smooth animations
- [ ] Three-column layout with all creative inputs in left panel
- [ ] No generic AI-generated feel - premium creative tool aesthetic

---

<!-- Plan-template aliases — this spec predates the standard plan format. The canonical headers below alias the existing sections; do not duplicate content. -->

## Task Description
See the top of this file (intro + numbered requirements under **Problem Statement**).

## Objective
See **Success Criteria** below — each checkbox is an objective.

## Relevant Files
See the **Files to change** subsections under each Phase (1–4).

## Step by Step Tasks
See **Step-by-Step Implementation Order** (Steps 1–5).

## Acceptance Criteria
See **Success Criteria**.

## Team Orchestration

### Team Members
N/A — single-author execution; no agent team.

