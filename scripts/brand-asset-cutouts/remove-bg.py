#!/usr/bin/env python3
"""
Brand-asset cutout pipeline for Dragonhearted Labs.

Produces transparent, individually-cropped cutouts from the brand's logos and
the grouped element "contact sheets" — ADDITIVELY. Originals are never touched.

What it does
------------
1. Background-removes the logos (rembg / U2Net) -> logos/<name>-transparent.png
2. Splits each grouped element sheet into its constituent marks on a known grid,
   keys each cell to transparency, and tight-crops to the alpha bounding box ->
   elements/<sheet-slug>/<n>.png
3. Writes a machine-readable manifest (_manifest.json) + INDEX.md.

Keying strategy (per asset, chosen for fidelity):
  - rembg  : ML salient-object cutout. Used for full-render logos and the
             chrome starbursts (metallic mid-tones rembg handles well).
  - luma   : "screen-out-white" key, alpha = 255 - min(R,G,B), gamma-shaped.
             Used for dark/line-art on white (barcodes, wireframe globes) and
             the texture fields — preserves crisp fine detail rembg would erode.

Isolated install (do NOT add rembg to any system's package.json):
    cd scripts/brand-asset-cutouts
    uv venv
    uv pip install rembg onnxruntime pillow numpy
    uv run python remove-bg.py            # first run downloads U2Net (~170MB)

Idempotent: re-running overwrites only files under assets/cutouts/.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
# scripts/brand-asset-cutouts/remove-bg.py -> repo root is two parents up.
REPO_ROOT = Path(__file__).resolve().parents[2]
BRAND_ROOT = REPO_ROOT / "client/dragonhearted_labs/brand-identity"
ASSETS = BRAND_ROOT / "assets"
OUT_ROOT = ASSETS / "cutouts"
OUT_LOGOS = OUT_ROOT / "logos"
OUT_ELEMENTS = OUT_ROOT / "elements"

ALPHA_THRESHOLD = 16  # alpha below this counts as transparent for bbox/empty checks
CROP_PAD = 8          # px padding kept around a tight crop


# ---------------------------------------------------------------------------
# Keying helpers
# ---------------------------------------------------------------------------
def luma_key(img: Image.Image, floor: int = 14, gamma: float = 0.85) -> Image.Image:
    """Screen white to transparent; alpha = 255 - min(R,G,B), gamma-shaped.

    Keeps original RGB, keys out the paper ground while preserving crisp dark
    marks and saturated line-art (any saturated/dark pixel keeps high alpha).
    """
    rgb = np.asarray(img.convert("RGB")).astype(np.float32)
    mn = rgb.min(axis=2)                       # white paper -> ~255
    alpha = 255.0 - mn                          # white -> 0, ink -> high
    alpha = np.clip((alpha - floor) / (255.0 - floor), 0.0, 1.0)
    alpha = np.power(alpha, gamma) * 255.0
    out = np.dstack([rgb, alpha]).astype(np.uint8)
    return Image.fromarray(out, mode="RGBA")


_REMBG_SESSION = None


def rembg_key(img: Image.Image) -> Image.Image:
    """ML background removal (lazy import so luma-only runs need no model)."""
    global _REMBG_SESSION
    from rembg import new_session, remove

    if _REMBG_SESSION is None:
        _REMBG_SESSION = new_session("u2net")
    return remove(img.convert("RGBA"), session=_REMBG_SESSION).convert("RGBA")


def alpha_bbox(img: Image.Image, threshold: int = ALPHA_THRESHOLD):
    """Bounding box of pixels with alpha > threshold, or None if empty."""
    a = np.asarray(img.convert("RGBA"))[:, :, 3]
    ys, xs = np.where(a > threshold)
    if xs.size == 0:
        return None
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def tight_crop(img: Image.Image, pad: int = CROP_PAD) -> Image.Image | None:
    bbox = alpha_bbox(img)
    if bbox is None:
        return None
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(img.width, x1 + pad)
    y1 = min(img.height, y1 + pad)
    return img.crop((x0, y0, x1, y1))


def coverage(img: Image.Image) -> float:
    a = np.asarray(img.convert("RGBA"))[:, :, 3]
    return float((a > ALPHA_THRESHOLD).mean())


# ---------------------------------------------------------------------------
# Sheet config
# ---------------------------------------------------------------------------
# rows x cols grids confirmed against the assets/elements/_preview-*.png siblings.
SHEETS = [
    {
        "slug": "barcode-marks",
        "src": ASSETS / "elements/barcode-marks-sheet.png",
        "rows": 2, "cols": 3, "method": "luma", "tight": True,
        "name": "Barcode marks",
        "usage": "Authenticity stamp at an edge/corner; ONE per composition (per brand_elements 'barcode').",
    },
    {
        "slug": "starbursts-chrome",
        "src": ASSETS / "elements/starbursts-chrome-sheet.png",
        "rows": 2, "cols": 3, "method": "rembg", "tight": True,
        "name": "Chrome starbursts",
        "usage": "Cut-out accent/punctuation in chrome modes; 1-3 max; highlight a stat or headline.",
    },
    {
        "slug": "wireframe-globes",
        "src": ASSETS / "elements/wireframe-globes-sheet.png",
        "rows": 2, "cols": 2, "method": "luma", "tight": True,
        "name": "Wireframe globes",
        "usage": "Low-opacity background motif behind type (Electric Blue / Silver linework).",
    },
    {
        "slug": "texture-fields",
        "src": ASSETS / "elements/texture-fields-sheet.png",
        "rows": 2, "cols": 2, "method": "luma", "tight": False,
        "name": "Halftone / texture fields",
        "usage": "Full-bleed background texture overlay at <=15% opacity; transparent grunge/halftone tile.",
    },
]

LOGOS = [
    {
        "name": "logo-dragonhearted",
        "src": ASSETS / "logo-dragonhearted.png",
        "note": "chrome master; container-free use TBD (chrome-on-light still needs Graphite container per logo.rules)",
    },
    {
        "name": "logo-riso-graphite",
        "src": ASSETS / "logo-variants/logo-riso-graphite.png",
        "note": "single-color riso plate; container-free use TBD",
    },
    {
        "name": "logo-riso-electric-blue",
        "src": ASSETS / "logo-variants/logo-riso-electric-blue.png",
        "note": "single-color riso plate; container-free use TBD",
    },
]


# ---------------------------------------------------------------------------
# Processing
# ---------------------------------------------------------------------------
def rel(path: Path) -> str:
    """Repo-root-relative POSIX path (matches brand.json convention)."""
    return path.relative_to(REPO_ROOT).as_posix()


def process_logos() -> list[dict]:
    OUT_LOGOS.mkdir(parents=True, exist_ok=True)
    results = []
    for logo in LOGOS:
        src: Path = logo["src"]
        if not src.exists():
            print(f"  ! missing logo: {src}", file=sys.stderr)
            continue
        print(f"  rembg {src.name} ...", flush=True)
        cut = rembg_key(Image.open(src))
        cropped = tight_crop(cut) or cut
        out = OUT_LOGOS / f"{logo['name']}-transparent.png"
        cropped.save(out)
        print(f"    -> {rel(out)}  ({cropped.width}x{cropped.height})")
        results.append({
            "id": f"{logo['name']}-transparent",
            "source": rel(src),
            "file": rel(out),
            "size": [cropped.width, cropped.height],
            "method": "rembg",
            "note": logo["note"],
        })
    return results


def process_sheet(sheet: dict) -> dict:
    src: Path = sheet["src"]
    out_dir = OUT_ELEMENTS / sheet["slug"]
    out_dir.mkdir(parents=True, exist_ok=True)
    img = Image.open(src).convert("RGBA")
    W, H = img.size
    rows, cols = sheet["rows"], sheet["cols"]
    # Small inset to avoid gutter lines bleeding between cells.
    inset_x = int(W / cols * 0.015)
    inset_y = int(H / rows * 0.015)

    files = []
    n = 0
    for r in range(rows):
        for c in range(cols):
            cx0 = int(c * W / cols) + inset_x
            cy0 = int(r * H / rows) + inset_y
            cx1 = int((c + 1) * W / cols) - inset_x
            cy1 = int((r + 1) * H / rows) - inset_y
            cell = img.crop((cx0, cy0, cx1, cy1))

            keyed = rembg_key(cell) if sheet["method"] == "rembg" else luma_key(cell)
            cov = coverage(keyed)
            if cov < 0.002:
                print(f"    . skip empty cell r{r}c{c} ({sheet['slug']})")
                continue

            final = (tight_crop(keyed) or keyed) if sheet["tight"] else keyed
            n += 1
            out = out_dir / f"{n}.png"
            final.save(out)
            files.append({
                "file": rel(out),
                "size": [final.width, final.height],
                "coverage": round(cov, 4),
            })
            print(f"    -> {rel(out)}  ({final.width}x{final.height}, cov {cov:.2%})")

    return {
        "id": sheet["slug"],
        "name": sheet["name"],
        "source_sheet": rel(src),
        "method": sheet["method"],
        "grid": [rows, cols],
        "count": len(files),
        "usage": sheet["usage"],
        "files": files,
    }


def write_index(logos: list[dict], elements: list[dict]) -> None:
    lines = [
        "# Brand-Asset Cutouts — INDEX",
        "",
        "Transparent, individually-cropped cutouts generated **additively** by",
        "`scripts/brand-asset-cutouts/remove-bg.py`. Originals under `assets/elements/`",
        "and `assets/logo-variants/` are untouched, and `logo.rules` is unchanged.",
        "",
        "Registered in `brand.json` under the additive top-level `cutouts` key.",
        "",
        "## Logos (`cutouts/logos/`)",
        "",
        "> Brand-rule guard: the chrome logo's Graphite-container rule (`logo.rules`)",
        "> still applies. These transparent logo cutouts are tagged",
        "> **\"container-free use TBD\"** — provided for layering convenience, not yet",
        "> blessed for container-free placement without an explicit rule change.",
        "",
        "| File | Source | Size | Note |",
        "| --- | --- | --- | --- |",
    ]
    for l in logos:
        lines.append(
            f"| `{Path(l['file']).name}` | `{Path(l['source']).name}` | "
            f"{l['size'][0]}×{l['size'][1]} | {l['note']} |"
        )
    lines += ["", "## Element cutouts (`cutouts/elements/<sheet>/`)", ""]
    for e in elements:
        lines += [
            f"### {e['name']} — `{e['id']}/` ({e['count']} marks)",
            "",
            f"- Source sheet: `{Path(e['source_sheet']).name}` · key: `{e['method']}` · grid: {e['grid'][0]}×{e['grid'][1]}",
            f"- Usage: {e['usage']}",
            "- Files: " + ", ".join(f"`{Path(f['file']).name}`" for f in e["files"]),
            "",
        ]
    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    (OUT_ROOT / "INDEX.md").write_text("\n".join(lines))
    print(f"  -> {rel(OUT_ROOT / 'INDEX.md')}")


def main() -> int:
    if not BRAND_ROOT.exists():
        print(f"brand root not found: {BRAND_ROOT}", file=sys.stderr)
        return 1
    OUT_ROOT.mkdir(parents=True, exist_ok=True)

    print("Logos (background removal):")
    logos = process_logos()

    print("\nElement sheets (grid split + key + crop):")
    elements = [process_sheet(s) for s in SHEETS]

    manifest = {
        "generated_by": "scripts/brand-asset-cutouts/remove-bg.py",
        "additive": True,
        "logos": logos,
        "elements": elements,
        "totals": {
            "logos": len(logos),
            "element_marks": sum(e["count"] for e in elements),
        },
    }
    (OUT_ROOT / "_manifest.json").write_text(json.dumps(manifest, indent=2))
    print(f"\n  -> {rel(OUT_ROOT / '_manifest.json')}")

    write_index(logos, elements)

    total = manifest["totals"]["logos"] + manifest["totals"]["element_marks"]
    print(f"\nDone. {manifest['totals']['logos']} logo cutouts + "
          f"{manifest['totals']['element_marks']} element marks = {total} cutouts.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
