# pdf-kit

Branded PDF rendering for Adcelerate. Builds A4 documents with cover pages, content layouts, and design-system tokens — powered by `@react-pdf/renderer` and the shared `design-system/adapters/pdf.ts` adapter.

## What it is

- **Branded templates** — Archivo Black wordmark, Inter body, paper/ink color scheme from DS tokens
- **Cover + content layout** — dark ink cover page + light paper content area in one A4 document
- **CLI renderer** — `bun run pdf:render <input.tsx> <output.pdf>` with zero config

## How to render

```bash
# From this directory
bun run pdf:render src/demo/system-doc.tsx out/sample.pdf

# Or via just
just demo

# Custom input / output
just render src/my-doc.tsx out/my-doc.pdf
```

## How to add a new template

1. Create `src/templates/my-template.tsx` — export a `default` React element using `BrandedDoc` or composing DS primitives directly.
2. Use `registerFonts()` and `pdfStyles` from `../../design-system/adapters/pdf`.
3. Render: `bun run pdf:render src/templates/my-template.tsx out/my-template.pdf`.

## File layout

```
systems/pdf-kit/
  src/
    template.tsx         # BrandedDoc component (cover + content)
    render.ts            # CLI entry — reads args, calls renderToFile
    demo/
      system-doc.tsx     # Smoke-test doc, default-exports BrandedDoc instance
  out/                   # Generated PDFs (git-ignored)
  justfile
  package.json
  tsconfig.json
```

## Dependencies

- `@react-pdf/renderer` — PDF rendering engine
- `react` — peer dep required by react-pdf
- `../../design-system/adapters/pdf` — font registration + DS StyleSheet (no extra install needed)
