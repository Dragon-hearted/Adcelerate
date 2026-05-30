# Platform Specifications Reference

## Composite Sheet Grid & Orientation

The platform's aspect ratio determines the **storyboard sheet's** aspect ratio and therefore the panel **grid orientation** (the sheet is one composite image per ≤15s block):

| Panels | Landscape 16:9 grid | Vertical 9:16 grid (rows × cols flipped) |
|---|---|---|
| 9 | 3×3 | 3×3 |
| 12 | 3×4 | 4×3 |
| 15 (default) | 3×5 | 5×3 |
| 20 | 4×5 | 5×4 |

- **16:9 platforms** (YouTube, LinkedIn, Twitter/X, Facebook 16:9) → landscape sheet, wide grid.
- **9:16 platforms** (Reels, TikTok, Shorts, Stories) → vertical sheet, flipped grid.
- **1:1 / 4:5** → square-ish sheet; use the closest grid that keeps panels roughly square (e.g. 15 → 4×4 with one blank, or drop to 12 → 3×4).

Each sheet covers **≤15 seconds**; longer videos split into N sheets (one per ≤15s block) with continuing timecodes. Panels are **variable duration** — timecodes within a sheet must sum to that sheet's ≤15s window. See SKILL.md "Composite Storyboard Sheet Model".

## Video Platforms

| Platform | Aspect Ratio | Min Duration | Max Duration | Recommended | Pacing |
|---|---|---|---|---|---|
| Instagram Reels | 9:16 | 3s | 90s | 15-30s | Fast-cut, hook in 1-2s |
| Instagram Stories | 9:16 | 1s | 60s | 15s | Quick, casual, swipe-up CTA |
| Instagram Feed | 1:1 or 4:5 | 3s | 60s | 15-30s | Thumb-stopping first frame |
| TikTok | 9:16 | 1s | 10min | 15-60s | Pattern interrupt, trend-aware |
| YouTube Shorts | 9:16 | 15s | 180s (3min) | 30-60s | Educational or entertaining |
| YouTube | 16:9 | any | any | 2-10min | Moderate to slow, narrative |
| LinkedIn | 16:9 or 1:1 | 3s | 10min | 30-90s | Professional, measured |
| Facebook Feed | 1:1 or 16:9 | 1s | 240min | 15-60s | Autoplay silent, caption-friendly |
| Facebook Reels | 9:16 | 3s | 90s | 15-30s | Similar to Instagram Reels |
| Twitter/X | 16:9 | 0.5s | 140s | 15-45s | Concise, punchy |
| Pinterest | 9:16 or 1:1 | 4s | 15min | 15-60s | Inspirational, aesthetic |

## Platform-Specific Guidelines

### Instagram Reels
- Hook MUST be in first 1-2 seconds
- Use trending audio when possible
- Captions essential (most watch with sound off)
- CTA in final 3-5 seconds
- Hashtags in caption, not in video
- Vertical (9:16) is non-negotiable

### TikTok
- Pattern interrupt in first 0.5-1 second
- Native/authentic feel outperforms polished production
- Duet/stitch-friendly structure is a bonus
- Green screen and text overlays are native to the platform
- Trend-aware content performs 2-3x better than generic
- Sound is more important here than any other platform

### YouTube
- First 5 seconds determine retention
- Chapters/timestamps for longer content
- End screen for CTA (last 20 seconds)
- Thumbnail is as important as the video itself
- SEO title and description matter for discovery
- 16:9 is standard; Shorts use 9:16

### YouTube Shorts
- Must be 3 minutes (180 seconds) or less
- Vertical (9:16) only
- Loop-friendly endings boost retention
- Simpler than TikTok — educational content performs well
- CTA should be spoken, not just shown

### LinkedIn
- Lead with value, not pitch
- Professional but not stiff — authenticity matters
- Thought leadership angle performs best
- Longer form acceptable if substance warrants it
- Square (1:1) gets more feed real estate
- Captions are essential (autoplay is silent)

### Facebook
- Autoplay without sound — design for silent viewing
- Square (1:1) gets more feed real estate than 16:9
- First 3 seconds are critical for stopping the scroll
- Captions are mandatory for engagement
- Longer videos OK but front-load the value
- Facebook Reels follow Instagram Reels conventions

### Twitter/X
- 140 second max — keep it tight
- Punchy, conversation-starting content
- Quote-tweet-friendly structure
- Text overlays help since autoplay is silent
- Controversy and strong opinions drive engagement (use wisely)

### Pinterest
- Inspirational, aspirational content
- Save-worthy is the key metric (not just views)
- Vertical (9:16) or square (1:1)
- Clean, aesthetic visuals perform best
- Tutorial/how-to format is highly effective
