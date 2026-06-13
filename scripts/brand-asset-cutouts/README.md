# brand-asset-cutouts

Isolated Python pipeline that produces **transparent, individually-cropped**
cutouts from the Dragonhearted Labs brand logos and the grouped element
"contact sheets". Output is **additive** — originals are never modified.

## Why isolated?

`rembg` + `onnxruntime` are heavy ML deps and must **not** be added to any
system's `package.json`. They live only in this script's local `uv` venv.

## Setup & run

```bash
cd scripts/brand-asset-cutouts
uv venv
uv pip install rembg onnxruntime pillow numpy
uv run python remove-bg.py        # first run downloads U2Net (~170MB)
```

## Output

```
client/dragonhearted_labs/brand-identity/assets/cutouts/
├─ logos/<name>-transparent.png          # rembg cutouts of the 3 logos
├─ elements/
│  ├─ barcode-marks/<n>.png              # 6 marks (luma key)
│  ├─ starbursts-chrome/<n>.png          # 6 marks (rembg)
│  ├─ wireframe-globes/<n>.png           # 4 marks (luma key)
│  └─ texture-fields/<n>.png             # 4 tiles (luma key, full-bleed)
├─ INDEX.md                              # human index + usage
└─ _manifest.json                        # machine-readable manifest
```

Cutouts are registered in `brand.json` under the additive top-level `cutouts`
key. `logo.rules` and existing `brand_elements` entries are left unchanged.

## Keying strategy

- **rembg** — ML salient-object cutout; used for the full-render logos and the
  chrome starbursts (metallic mid-tones it handles well).
- **luma** — "screen-out-white" key (`alpha = 255 - min(R,G,B)`, gamma-shaped);
  used for dark/line-art on white (barcodes, wireframe globes) and the texture
  fields, preserving crisp fine detail that rembg would erode.

Grid splits (rows×cols) were confirmed against the `assets/elements/_preview-*.png`
siblings: barcode 2×3, starbursts 2×3, wireframe-globes 2×2, texture-fields 2×2.
