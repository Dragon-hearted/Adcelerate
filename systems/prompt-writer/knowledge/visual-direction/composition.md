# Composition Principles

Model-agnostic reference for spatial composition in AI-generated images and video. These principles determine where elements sit in the frame, how the viewer's eye moves, and the overall visual architecture of a scene.

---

## Core Principles

### Rule of Thirds

Place the subject at the intersection of imaginary lines dividing the frame into a 3x3 grid. Creates dynamic, natural compositions.

**When to use:** Default for most narrative and lifestyle scenes. Walking shots, conversations, environmental portraits.

**Prompt phrasing:**
- "Subject positioned at the right third of the frame"
- "Off-center composition following the rule of thirds"
- "Eyes at the upper-third intersection point"

---

### Center Frame

Subject placed at the mathematical center of the frame. Creates intentional, symmetrical, powerful compositions.

**When to use:** Fashion editorials, brand hero moments, product reveals, power shots, gallery/museum settings.

**Prompt phrasing:**
- "Subject centered in frame"
- "Symmetrical center composition"
- "Centered medium-full framing, eye-level"

**Note:** Center framing works best with symmetrical environments (galleries, corridors, arched doorways) that reinforce the centered subject.

---

### Leading Lines

Environmental geometry that draws the viewer's eye toward the subject or focal point. Creates depth and visual flow.

**When to use:** Scenes with strong architectural or environmental lines — bleacher rows, hallways, roads, fences, railings, perspective grids.

**Prompt phrasing:**
- "The diagonal lines of the bleacher seat rows draw the eye toward the subject"
- "Converging corridor lines lead to the figure at the end"
- "The receding court lines create perspective depth pointing to the subject"

---

### Negative Space

Empty or unoccupied area in the frame that creates visual breathing room around the subject. Draws attention by contrast — the eye goes to the subject precisely because the surrounding space is empty.

**When to use:** Elegance, minimalism, contemplative moments, ad formats that need space for text overlay, aspirational imagery.

**Prompt phrasing:**
- "Generous negative space on the left as he walks into frame"
- "Subject small in the frame with expansive sky above"
- "Clean space around the product, minimalist composition"
- "Room to breathe — the subject occupies only the right third"

---

### Symmetry

Mirror-balanced composition where the left and right (or top and bottom) of the frame reflect each other. Communicates order, power, formality, and intentionality.

**When to use:** Architectural shots, formal settings, luxury/premium aesthetics, brand authority, gallery interiors.

**Prompt phrasing:**
- "Perfectly symmetrical composition"
- "Mirror-balanced frame with the subject at the axis of symmetry"
- "The doorway frames the subject with identical elements on either side"

---

### Frame Within Frame

An environmental element creates a secondary frame around the subject — doorways, windows, arches, foliage gaps, binocular circles.

**When to use:** Depth creation, voyeuristic moments, intimate scenes, transition reveals, POV through objects.

**Prompt phrasing:**
- "View through binoculars — circular frame with soft dark vignette edges"
- "Subject framed by the gallery doorway, seen from the adjacent room"
- "Natural frame of overhanging tree branches around the subject"
- "Shot through a window frame, subject visible inside"

---

### Depth Layers

Distinct foreground, midground, and background elements that create three-dimensional spatial depth. Prevents flat, poster-like compositions.

**When to use:** Any scene that needs to feel cinematic and spatially real. Especially important for environmental shots and establishing frames.

**Layer structure:**
```
Foreground:  Closest to camera — subject, immediate props, framing elements
Midground:   Primary scene — subject's context, floor/surface, nearby objects
Background:  Distant elements — soft focus figures, sky, architecture, horizon
```

**Prompt phrasing:**
- "Foreground: the model and a basketball nearby. Midground: court surface, bleacher rows. Background: distant figures, trees, warm sky — soft focus"
- "A small green plant and open notebook partially visible in soft focus in the foreground"
- "Background elements softer and more muted than the subject"

### Depth Cues

Specific techniques that reinforce the illusion of depth:

| Cue | Description | Prompt Phrasing |
|-----|-------------|-----------------|
| Receding lines | Geometric perspective creates depth | "Bleacher seat rows stretch out diagonally, creating strong receding lines" |
| Scale reference | Small distant elements establish distance | "A few blurred figures in the far background on the court" |
| Atmospheric perspective | Background softer, more muted | "Background buildings fade into warm haze" |
| Foreground elements | Objects between camera and subject | "Partially visible plant in soft focus between camera and subject" |
| Overlap | Elements overlapping at different distances | "Friend partially visible at the edge of the frame" |

---

### Diagonal

Subject or dominant lines placed on a diagonal across the frame. Creates energy, dynamism, and visual tension.

**When to use:** Action shots, dynamic movement, energetic campaigns, breaking the static feel of posed shots.

**Prompt phrasing:**
- "Subject positioned along the diagonal from lower-left to upper-right"
- "Dynamic diagonal composition — the staircase runs corner to corner"
- "Tilted energy in the composition, subject on the diagonal"

---

### Fill the Frame

Subject occupies nearly the entire frame with minimal or no background visible. Creates impact, intimacy, and forces the viewer to engage with the detail.

**When to use:** Product close-ups, texture shots, emotional portraits, hero shots where the subject IS the entire message.

**Prompt phrasing:**
- "Subject fills the entire frame edge to edge"
- "Extreme close-up — the fabric texture is all that's visible"
- "Product fills the frame, no background visible"

---

## Composition in Practice

### Combining Principles

Real prompts often combine multiple principles. Common combinations:

| Combination | Effect | Example |
|-------------|--------|---------|
| Rule of Thirds + Depth Layers | Dynamic composition with spatial reality | Subject at right third, foreground plant, background bokeh |
| Center Frame + Symmetry | Maximum intentionality and power | Centered subject in symmetrical gallery corridor |
| Negative Space + Leading Lines | Clean composition with eye direction | Subject with empty sky, road lines pointing toward them |
| Frame Within Frame + Shallow DOF | Voyeuristic intimacy | Binocular circle frame, subject sharp, edges soft vignette |
| Diagonal + Fill the Frame | Maximum dynamic energy | Extreme close-up of product at an angle |

### Composition Keywords Quick Reference

| Keyword | Effect |
|---------|--------|
| Negative space | Empty area creating visual breathing room |
| Shallow depth of field | Subject sharp, background bokeh |
| Leading lines | Environmental geometry draws eye to subject |
| Center-frame | Subject at mathematical center |
| Receding lines | Perspective depth (bleacher rows, hallways) |
| Foreground element | Something between camera and subject, depth layer |
| Soft bokeh | Out-of-focus areas rendered as smooth circular highlights |
| Tight framing | Subject fills most of the frame |
| Breathing room | Space around the subject, unhurried feel |
| Rule of thirds | Off-center placement for dynamic balance |
