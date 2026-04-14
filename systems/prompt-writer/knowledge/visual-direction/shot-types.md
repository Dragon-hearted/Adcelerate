# Shot Types & Camera Reference

Model-agnostic reference for camera shot types, angles, and movement. Use these as prompt-building vocabulary for any image or video generation model.

---

## Shot Sizes

| Shot | Abbreviation | Frame | Best For | Prompt Phrasing |
|------|-------------|-------|----------|-----------------|
| Extreme Wide Shot | EWS | Subject tiny in vast environment | Establishing location, scale, epic feel | "Extreme wide shot showing the full environment with [subject] small in the distance" |
| Wide Shot | WS | Full subject with surrounding environment | Context, setting the scene, establishing shots | "Wide shot capturing [subject] head-to-toe with the full environment visible" |
| Medium Wide | MWS | Subject from knees up | Walking shots, movement, full outfit visibility, lifestyle | "Medium wide shot, [subject] from the knees up, environment context visible" |
| Medium Shot | MS | Subject from waist up | Conversation scenes, product interaction, casual interaction | "Medium shot, waist-up, some environment visible around [subject]" |
| Medium Close-Up | MCU | Subject from chest up | Emotional beats, reactions, testimonials, transitions | "Medium close-up, chest-to-head framing of [subject]" |
| Close-Up | CU | Face or product fills frame | Brand reveals, emotional peaks, product hero, detail emphasis | "Close-up of [subject] filling the frame" |
| Extreme Close-Up | ECU | Single feature or detail fills frame | Texture shots, micro-details, dramatic emphasis, product labels | "Extreme close-up on [specific detail], filling the entire frame" |
| Insert Shot | INS | Object or detail relevant to the story | Product details, UI screens, hands interacting with objects | "Insert shot of [object], isolated from the wider scene" |
| Over-the-Shoulder | OTS | Camera behind one subject looking at another | Conversations, screen demos, POV setups | "Over-the-shoulder angle from behind [subject A] looking at [subject B]" |
| Point of View | POV | Camera IS the subject's eyes | Immersion, unboxing, tutorials, discovery moments | "Point-of-view shot — the camera is [subject]'s eyes, looking at [object/scene]" |

### Shot Size Selection Guide

```
Establishing a new location or showing scale?
  -> Extreme Wide or Wide Shot

Showing a character moving, walking, or wearing a full outfit?
  -> Medium Wide

Casual interaction, conversation, or standard narrative?
  -> Medium Shot

Emotional moment, reaction, or transition beat?
  -> Medium Close-Up

Brand reveal, product hero, or emotional peak?
  -> Close-Up

Texture, micro-detail, or dramatic emphasis?
  -> Extreme Close-Up
```

---

## Camera Angles

| Angle | Effect | Best For | Prompt Phrasing |
|-------|--------|----------|-----------------|
| Eye Level | Neutral, relatable, grounded | Most scenes, conversations, testimonials — the default choice | "Eye-level perspective", "Straight-on, relatable framing" |
| Low Angle | Power, dominance, heroic | Product reveals, brand authority, hero shots, making subject imposing | "Low angle looking up at [subject]", "Shot from below, [subject] appears powerful" |
| High Angle | Vulnerability, overview, intimacy | Flat lays, workspaces, food scenes, unboxing | "High angle looking down on [subject]", "Elevated perspective" |
| Bird's Eye / Overhead | Graphic, pattern, god-view | Product layouts, workspace organization, cooking, spatial awareness | "Overhead shot looking directly down", "Bird's eye view of [scene]" |
| Dutch Angle (tilted) | Tension, unease, energy, disruption | Dynamic ads, music videos, action sequences, creative campaigns | "Tilted frame", "Dutch angle creating visual tension" |
| Worm's Eye | Extreme power, towering, dramatic | Architecture, dramatic product shots, monumental scale | "Worm's eye view looking straight up at [subject]", "Extreme low angle" |

---

## Camera Movement Keywords

For **still image models**, describe the *feeling* of movement rather than literal motion. For **video models**, these translate directly to motion direction.

### Still Image Phrasing

| Movement Feel | Conveys | Prompt Phrasing (Still Images) |
|--------------|---------|-------------------------------|
| Static | Stability, focus, confidence | "Locked-off composition", "Steady, grounded frame" |
| Pan | Reveal, exploration, scope | "Sweeping horizontal view", "Panoramic perspective" |
| Tilt | Scale, grandeur, discovery | "Looking upward", "Towering vertical perspective" |
| Dolly In | Intimacy, focus, tension | "Drawing closer to subject", "Intimate proximity" |
| Pull Back | Context reveal, surprise | "Revealing wider environment", "Pulling back to show scale" |
| Tracking | Energy, movement, pursuit | "Dynamic angle alongside subject", "Movement energy" |
| Crane / Drone | Scale, production value | "Aerial perspective", "Elevated sweeping viewpoint" |
| Handheld | Authenticity, urgency, rawness | "Organic handheld feel", "Intimate documentary style", "Slight handheld drift quality" |

### Video Movement Phrasing

| Movement | Keyword | Prompt Phrasing (Video Models) |
|----------|---------|-------------------------------|
| Static | static | "Static camera, locked-off, no movement" |
| Slow Pan | slow pan | "Slow pan from left to right" |
| Tracking | tracking | "Camera tracks alongside the subject as they walk" |
| Dolly In | dolly in / push in | "Slow dolly in toward the subject's face" |
| Dolly Out | dolly out / pull back | "Camera pulls back to reveal the full environment" |
| Handheld Drift | handheld drift | "Handheld drift — subtle organic instability, documentary feel" |
| Crane Up | crane up | "Camera rises smoothly from ground level" |
| FPV Drone | fpv | "First-person drone shot sweeping through the scene" |
| Orbit | orbit | "Camera orbits slowly around the subject" |

---

## Framing Rules

| Rule | Effect | When to Use | Prompt Phrasing |
|------|--------|-------------|-----------------|
| Center-frame | Symmetrical, intentional, fashion-forward | Gallery fashion, brand moments, power shots | "Subject centered in frame", "Symmetrical center composition" |
| Rule of Thirds | Dynamic, narrative, natural | Walking shots, conversations, most scenes | "Subject at the right third of the frame", "Off-center composition following rule of thirds" |
| Negative Space | Breathing room, elegance, text overlay space | Minimalism, ad formats needing copy space, contemplative scenes | "Generous negative space on the left", "Subject with breathing room around them" |
| Leading Lines | Environmental geometry draws eye to subject | Architectural scenes, depth-heavy compositions | "The diagonal lines of [element] draw the eye toward the subject" |

---

## Depth of Field Guide

| DOF | Effect | When to Use | Prompt Phrasing |
|-----|--------|-------------|-----------------|
| Shallow | Subject sharp, background dissolved into bokeh | Product-hero moments, intimate close-ups, brand reveals | "Shallow depth of field — [subject] in crisp focus, background dissolved into warm bokeh" |
| Medium | Subject sharp, background recognizable but soft | Lifestyle context shots, medium shots with environment | "Medium depth of field — [subject] sharp, background soft but recognizable" |
| Deep | Everything in focus | Establishing shots, environment-first scenes, overhead shots | "Deep focus — everything from foreground to background in sharp focus" |

---

## Lens Feel

Describe the visual effect rather than technical focal lengths — generation models respond to the feeling, not the specs:

| Feel | Equivalent | Prompt Phrasing |
|------|-----------|-----------------|
| Intimate, compressed background | Telephoto (85-200mm) | "Intimate framing, compressed background", "Background feels close and compressed" |
| Natural, standard perspective | Normal (35-50mm) | "Natural perspective", "Standard lens feel" |
| Wide, showing full environment | Wide angle (16-35mm) | "Wide enough to capture the full [environment]", "Expansive perspective" |
| Distorted, immersive | Ultra-wide / fisheye | "Slight barrel distortion", "Immersive wide-angle perspective" |
| Documentary, candid | Longer lens, handheld | "Slight handheld drift quality", "Documentary feel, shot from a distance" |
