# Gemini Image Generation

Generate images using Google Gemini models with support for multiple aspect ratios and resolutions up to 4K.

> **Latest News:** `gemini-3.1-flash-image-preview` (Nano Banana 2) now available -- high-efficiency Gemini 3 Pro variant supporting up to 4K resolutions.

## Overview

WisGate provides access to Google's Gemini image generation models through a unified API endpoint at `https://api.wisgate.ai`, replacing the standard Google base URL (`generativelanguage.googleapis.com`).

> WisGate typically does not modify model responses outside of reverse format, ensuring you receive response content consistent with the original Gemini API provider.

## Authentication

- **Header**: `x-goog-api-key: $WISDOM_GATE_KEY`
- **Content-Type**: `application/json`
- Replace standard Gemini API keys with WisGate credentials

## Supported Models

| Model | Description | Resolutions | Aspect Ratios |
|-------|-------------|-------------|---------------|
| `gemini-3.1-flash-image-preview` (Nano Banana 2) | High-efficiency version optimized for speed | 0.5K, 1K, 2K, 4K | 1:1, 1:4, 1:8, 2:3, 3:2, 3:4, 4:1, 4:3, 4:5, 5:4, 8:1, 9:16, 16:9, 21:9 |
| `gemini-3-pro-image-preview` | Full-featured generation model | 1K, 2K, 4K | 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9 |
| `gemini-2.5-flash-image` | Fast and economical generation | 1K, 2K | 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9 |

> **Note:** Different Gemini models support varying resolutions and features. Consult the model catalog for complete parameter specifics for each variant.

> **Note:** `gemini-3.1-flash-image-preview` currently does not support the `imageSize` parameter in some configurations.

## Endpoint

```
POST /v1beta/models/{model}:generateContent
```

**Base URL:** `https://api.wisgate.ai`

**Full URL example:** `https://api.wisgate.ai/v1beta/models/gemini-3-pro-image-preview:generateContent`

## Key Features

### Multi-Image References

Combine multiple reference images in a single request for consistent character generation:

- Up to **6 object images** with high-fidelity
- Up to **5 human images** for character consistency
- **14 total reference images** maximum per request

### Image-to-Image

Submit base64-encoded input images alongside text prompts for modifications.

### Multi-Turn Editing

Maintain conversation context across iterations to refine outputs progressively.

### Force Image Output

Set `"responseModalities": ["IMAGE"]` (omitting TEXT) to prevent text-only responses and guarantee image generation.

---

## API Parameters Reference

### Request Parameters

**Required:**

- `contents` (array): Array of content parts constituting the conversation

**Optional:**

- `systemInstruction` (object): System instruction guiding model behavior
- `generationConfig` (object): Configuration for content generation
  - `temperature` (number, 0-2): Sampling temperature
  - `topP` (number, 0-1): Top-p sampling parameter
  - `topK` (integer, >=1): Top-k sampling parameter
  - `maxOutputTokens` (integer, >=1): Maximum tokens to generate
  - `stopSequences` (array): Sequences halting generation
  - `thinkingConfig` (object): Reasoning process configuration
    - `thinkingLevel` (enum): LOW or HIGH for Gemini 3 series
    - `thinkingBudget` (integer): Token budget for Gemini 2.5 series
  - `responseModalities` (array): TEXT, AUDIO, or IMAGE output types
  - `imageConfig` (object): Image generation settings
    - `aspectRatio` (enum): 1:1, 3:2, 2:3, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9
    - `imageSize` (enum): 1K, 2K, 4K
- `safetySettings` (array): Content filtering configuration
  - `category` (enum): HARM_CATEGORY_HARASSMENT, HARM_CATEGORY_HATE_SPEECH, HARM_CATEGORY_SEXUALLY_EXPLICIT, HARM_CATEGORY_DANGEROUS_CONTENT
  - `threshold` (enum): BLOCK_NONE, BLOCK_ONLY_HIGH, BLOCK_MEDIUM_AND_ABOVE, BLOCK_LOW_AND_ABOVE

### Response Fields

- `candidates` (array, required): Generated content candidates
  - `content` (object): Generated content with role and parts
  - `finishReason` (enum): STOP, MAX_TOKENS, SAFETY, RECITATION, OTHER
  - `safetyRatings` (array): Safety assessment ratings
- `usageMetadata` (object): Token usage statistics
  - `promptTokenCount` (integer): Tokens in prompt
  - `candidatesTokenCount` (integer): Tokens in response
  - `totalTokenCount` (integer): Combined token count
  - `thoughtsTokenCount` (integer): Tokens used for thinking
- `promptFeedback` (object): Prompt-level feedback including safety ratings

---

## Code Examples

### Basic Image Generation (cURL)

```bash
curl -s -X POST \
  "https://api.wisgate.ai/v1beta/models/gemini-3-pro-image-preview:generateContent" \
  -H "x-goog-api-key: $WISDOM_GATE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{
        "text": "Da Vinci style anatomical sketch of a dissected Monarch butterfly. Detailed drawings of the head, wings, and legs on textured parchment with notes in English."
      }]
    }],
    "tools": [{"google_search": {}}],
    "generationConfig": {
      "responseModalities": ["TEXT", "IMAGE"],
      "imageConfig": {
        "aspectRatio": "1:1",
        "imageSize": "1K"
      }
    }
  }' | jq -r '.candidates[0].content.parts[] | select(.inlineData) | .inlineData.data' | head -1 | base64 --decode > butterfly.png
```

### Basic Image Generation (Python)

```python
import requests
import base64
import json

url = "https://api.wisgate.ai/v1beta/models/gemini-3-pro-image-preview:generateContent"
headers = {
    "x-goog-api-key": "WISDOM_GATE_KEY",
    "Content-Type": "application/json"
}
data = {
    "contents": [{
        "parts": [{
            "text": "Da Vinci style anatomical sketch of a dissected Monarch butterfly. Detailed drawings of the head, wings, and legs on textured parchment with notes in English."
        }]
    }],
    "tools": [{"google_search": {}}],
    "generationConfig": {
        "responseModalities": ["TEXT", "IMAGE"],
        "imageConfig": {
            "aspectRatio": "1:1"
        }
    }
}

response = requests.post(url, headers=headers, json=data)
result = response.json()

for candidate in result.get("candidates", []):
    for part in candidate.get("content", {}).get("parts", []):
        if "inlineData" in part:
            image_data = part["inlineData"]["data"]
            with open("butterfly.png", "wb") as f:
                f.write(base64.b64decode(image_data))
            print("Image saved as butterfly.png")
```

### Basic Image Generation (JavaScript)

```javascript
const response = await fetch(
  "https://api.wisgate.ai/v1beta/models/gemini-3-pro-image-preview:generateContent",
  {
    method: "POST",
    headers: {
      "x-goog-api-key": "WISDOM_GATE_KEY",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: "Da Vinci style anatomical sketch of a dissected Monarch butterfly. Detailed drawings of the head, wings, and legs on textured parchment with notes in English.",
            },
          ],
        },
      ],
      tools: [{ google_search: {} }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio: "1:1",
        },
      },
    }),
  }
);

const result = await response.json();

for (const candidate of result.candidates || []) {
  for (const part of candidate.content?.parts || []) {
    if (part.inlineData) {
      const imageData = part.inlineData.data;
      const fs = require("fs");
      const buffer = Buffer.from(imageData, "base64");
      fs.writeFileSync("butterfly.png", buffer);
      console.log("Image saved as butterfly.png");
    }
  }
}
```

### Image-to-Image Generation (cURL)

```bash
curl -s -X POST \
  "https://api.wisgate.ai/v1beta/models/gemini-3-pro-image-preview:generateContent" \
  -H "x-goog-api-key: $WISDOM_GATE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "role": "user",
      "parts": [
        { "text": "cat" },
        {
          "inline_data": {
            "mime_type": "image/jpeg",
            "data": "BASE64_DATA_HERE"
          }
        }
      ]
    }],
    "generationConfig": {
      "responseModalities": ["TEXT", "IMAGE"]
    }
  }'
```

### Image-to-Image Generation (Python)

```python
import requests
import base64

url = "https://api.wisgate.ai/v1beta/models/gemini-3-pro-image-preview:generateContent"
headers = {
    "x-goog-api-key": "WISDOM_GATE_KEY",
    "Content-Type": "application/json"
}

with open("input.jpg", "rb") as image_file:
    encoded_string = base64.b64encode(image_file.read()).decode('utf-8')

data = {
    "contents": [{
        "role": "user",
        "parts": [
            { "text": "cat" },
            {
                "inline_data": {
                    "mime_type": "image/jpeg",
                    "data": encoded_string
                }
            }
        ]
    }],
    "generationConfig": {
        "responseModalities": ["TEXT", "IMAGE"]
    }
}

response = requests.post(url, headers=headers, json=data)
print(response.json())
```

### Image-to-Image Generation (JavaScript)

```javascript
const fs = require("fs");

const imageFile = fs.readFileSync("input.jpg");
const encodedString = Buffer.from(imageFile).toString("base64");

const response = await fetch(
  "https://api.wisgate.ai/v1beta/models/gemini-3-pro-image-preview:generateContent",
  {
    method: "POST",
    headers: {
      "x-goog-api-key": "WISDOM_GATE_KEY",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: [
          { text: "cat" },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: encodedString
            }
          }
        ]
      }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"]
      }
    }),
  }
);

const result = await response.json();
console.log(result);
```

### Multi-Image Generation (cURL)

```bash
curl -s -X POST \
  "https://api.wisgate.ai/v1beta/models/gemini-3-pro-image-preview:generateContent" \
  -H "x-goog-api-key: $WISDOM_GATE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "role": "user",
      "parts": [
        { "text": "An office group photo of these people, they are making funny faces." },
        { "inline_data": { "mime_type": "image/jpeg", "data": "BASE64_IMG_1" } },
        { "inline_data": { "mime_type": "image/jpeg", "data": "BASE64_IMG_2" } },
        { "inline_data": { "mime_type": "image/jpeg", "data": "BASE64_IMG_3" } },
        { "inline_data": { "mime_type": "image/jpeg", "data": "BASE64_IMG_4" } },
        { "inline_data": { "mime_type": "image/jpeg", "data": "BASE64_IMG_5" } }
      ]
    }],
    "generationConfig": {
      "responseModalities": ["TEXT", "IMAGE"],
      "imageConfig": {
        "aspectRatio": "5:4",
        "imageSize": "1K"
      }
    }
  }'
```

### Multi-Image Generation (Python)

```python
import requests
import base64

url = "https://api.wisgate.ai/v1beta/models/gemini-3-pro-image-preview:generateContent"
headers = {
    "x-goog-api-key": "WISDOM_GATE_KEY",
    "Content-Type": "application/json"
}

def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

parts = [{"text": "An office group photo of these people, they are making funny faces."}]
for i in range(1, 6):
    parts.append({
        "inline_data": {
            "mime_type": "image/jpeg",
            "data": encode_image(f"person{i}.jpg")
        }
    })

data = {
    "contents": [{"role": "user", "parts": parts}],
    "generationConfig": {
        "responseModalities": ["TEXT", "IMAGE"],
        "imageConfig": {
            "aspectRatio": "5:4",
            "imageSize": "1K"
        }
    }
}

response = requests.post(url, headers=headers, json=data)
print(response.json())
```

### Multi-Image Generation (JavaScript)

```javascript
const fs = require("fs");

function encodeImage(path) {
  const imageFile = fs.readFileSync(path);
  return Buffer.from(imageFile).toString("base64");
}

const parts = [
  { text: "An office group photo of these people, they are making funny faces." }
];

for (let i = 1; i <= 5; i++) {
  parts.push({
    inline_data: {
      mime_type: "image/jpeg",
      data: encodeImage(`person${i}.jpg`)
    }
  });
}

const response = await fetch(
  "https://api.wisgate.ai/v1beta/models/gemini-3-pro-image-preview:generateContent",
  {
    method: "POST",
    headers: {
      "x-goog-api-key": "WISDOM_GATE_KEY",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: parts
      }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio: "5:4",
          imageSize: "2K"
        }
      }
    }),
  }
);

const result = await response.json();
console.log(result);
```

### Aspect Ratio Configuration (cURL)

```bash
curl -s -X POST \
  "https://api.wisgate.ai/v1beta/models/gemini-2.5-flash-image:generateContent" \
  -H "x-goog-api-key: $WISDOM_GATE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{
        "text": "A beautiful sunset over mountains"
      }]
    }],
    "generationConfig": {
      "responseModalities": ["IMAGE"],
      "imageConfig": {
        "aspectRatio": "16:9"
      }
    }
  }'
```

### Aspect Ratio Configuration (Python)

```python
import requests

url = "https://api.wisgate.ai/v1beta/models/gemini-2.5-flash-image:generateContent"
headers = {
    "x-goog-api-key": "WISDOM_GATE_KEY",
    "Content-Type": "application/json"
}
data = {
    "contents": [{
        "parts": [{
            "text": "A beautiful sunset over mountains"
        }]
    }],
    "generationConfig": {
        "responseModalities": ["IMAGE"],
        "imageConfig": {
            "aspectRatio": "16:9"
        }
    }
}

response = requests.post(url, headers=headers, json=data)
print(response.json())
```

### Multi-Turn Image Editing - Turn 1 (cURL)

```bash
curl -s -X POST \
  "https://api.wisgate.ai/v1beta/models/gemini-3-pro-image-preview:generateContent" \
  -H "x-goog-api-key: $WISDOM_GATE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "role": "user",
      "parts": [{
        "text": "Create a vibrant infographic that explains photosynthesis as if it were a recipe for a plants favorite food. Show the \"ingredients\" (sunlight, water, CO2) and the \"finished dish\" (sugar/energy). The style should be like a page from a colorful kids cookbook, suitable for a 4th grader."
      }]
    }],
    "generationConfig": {
      "responseModalities": ["TEXT", "IMAGE"]
    }
  }' > turn1_response.json
```

### Multi-Turn Image Editing - Turn 2 (Python)

```python
import requests
import base64
import json

url = "https://api.wisgate.ai/v1beta/models/gemini-3-pro-image-preview:generateContent"
headers = {
    "x-goog-api-key": "WISDOM_GATE_KEY",
    "Content-Type": "application/json"
}

data_turn1 = {
    "contents": [{
        "role": "user",
        "parts": [{
            "text": "Create a vibrant infographic that explains photosynthesis as if it were a recipe for a plants favorite food. Show the \"ingredients\" (sunlight, water, CO2) and the \"finished dish\" (sugar/energy). The style should be like a page from a colorful kids cookbook, suitable for a 4th grader."
        }]
    }],
    "generationConfig": {
        "responseModalities": ["TEXT", "IMAGE"]
    }
}

response1 = requests.post(url, headers=headers, json=data_turn1)
result1 = response1.json()

for candidate in result1.get("candidates", []):
    for part in candidate.get("content", {}).get("parts", []):
        if "inlineData" in part:
            image_data = part["inlineData"]["data"]
            with open("photosynthesis.png", "wb") as f:
                f.write(base64.b64decode(image_data))

data_turn2 = {
    "contents": [
        {
            "role": "user",
            "parts": [{
                "text": "Create a vibrant infographic that explains photosynthesis..."
            }]
        },
        {
            "role": "model",
            "parts": result1["candidates"][0]["content"]["parts"]
        },
        {
            "role": "user",
            "parts": [{
                "text": "Make it more colorful and add more visual elements"
            }]
        }
    ],
    "generationConfig": {
        "responseModalities": ["TEXT", "IMAGE"]
    }
}

response2 = requests.post(url, headers=headers, json=data_turn2)
result2 = response2.json()
```

### Force Image-Only Output (Python)

```python
data = {
    "contents": [{
        "parts": [{
            "text": "A serene mountain landscape at dawn"
        }]
    }],
    "generationConfig": {
        "responseModalities": ["IMAGE"],
        "imageConfig": {
            "aspectRatio": "16:9"
        }
    }
}
```

### Extract Images from Response (Python)

```python
import base64

response = requests.post(url, headers=headers, json=data)
result = response.json()

for candidate in result.get("candidates", []):
    for part in candidate.get("content", {}).get("parts", []):
        if "inlineData" in part:
            image_data = part["inlineData"]["data"]
            mime_type = part["inlineData"]["mimeType"]
            
            image_bytes = base64.b64decode(image_data)
            extension = mime_type.split("/")[1]
            filename = f"generated_image.{extension}"
            
            with open(filename, "wb") as f:
                f.write(image_bytes)
            print(f"Image saved as {filename}")
```

### Extract Images from Response (JavaScript)

```javascript
const result = await response.json();

for (const candidate of result.candidates || []) {
  for (const part of candidate.content?.parts || []) {
    if (part.inlineData) {
      const imageData = part.inlineData.data;
      const mimeType = part.inlineData.mimeType;
      
      const buffer = Buffer.from(imageData, "base64");
      const extension = mimeType.split("/")[1];
      const filename = `generated_image.${extension}`;
      
      const fs = require("fs");
      fs.writeFileSync(filename, buffer);
      console.log(`Image saved as ${filename}`);
    }
  }
}
```

---

## OpenAPI Schema Request Examples

### Basic Text Generation

```json
{
  "contents": [
    {
      "parts": [
        {
          "text": "How does AI work?"
        }
      ]
    }
  ]
}
```

### Conversation Example

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "What is Python?"
        }
      ]
    },
    {
      "role": "model",
      "parts": [
        {
          "text": "Python is a programming language..."
        }
      ]
    },
    {
      "role": "user",
      "parts": [
        {
          "text": "What are its advantages?"
        }
      ]
    }
  ]
}
```

### Gemini 3 with Thinking

```json
{
  "contents": [
    {
      "parts": [
        {
          "text": "Explain quantum physics simply."
        }
      ]
    }
  ],
  "generationConfig": {
    "thinkingConfig": {
      "thinkingLevel": "LOW"
    }
  }
}
```

### Flash Image Generation

```json
{
  "contents": [
    {
      "parts": [
        {
          "text": "A beautiful sunset over mountains"
        }
      ]
    }
  ],
  "generationConfig": {
    "responseModalities": [
      "IMAGE"
    ],
    "imageConfig": {
      "aspectRatio": "16:9"
    }
  }
}
```

---

## OpenAPI Schema Response Examples

### Basic Response

```json
{
  "candidates": [
    {
      "content": {
        "role": "model",
        "parts": [
          {
            "text": "AI, or artificial intelligence, works by using algorithms and data to enable machines to learn from experience, adapt to new inputs, and perform tasks that typically require human intelligence."
          }
        ]
      },
      "finishReason": "STOP",
      "index": 0
    }
  ],
  "usageMetadata": {
    "promptTokenCount": 5,
    "candidatesTokenCount": 25,
    "totalTokenCount": 30
  }
}
```

### Response with Thinking Tokens

```json
{
  "candidates": [
    {
      "content": {
        "role": "model",
        "parts": [
          {
            "text": "Quantum physics is a branch of physics that studies matter and energy at the smallest scales..."
          }
        ]
      },
      "finishReason": "STOP",
      "index": 0
    }
  ],
  "usageMetadata": {
    "promptTokenCount": 8,
    "candidatesTokenCount": 35,
    "totalTokenCount": 43,
    "thoughtsTokenCount": 150
  },
  "promptFeedback": {
    "safetyRatings": []
  }
}
```

### Image Generation Response

```json
{
  "candidates": [
    {
      "content": {
        "role": "model",
        "parts": [
          {
            "text": "I've generated an anatomical sketch of a Monarch butterfly in Da Vinci style."
          },
          {
            "inlineData": {
              "mimeType": "image/png",
              "data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
            }
          }
        ]
      },
      "finishReason": "STOP",
      "index": 0
    }
  ],
  "usageMetadata": {
    "promptTokenCount": 25,
    "candidatesTokenCount": 15,
    "totalTokenCount": 40
  },
  "promptFeedback": {
    "safetyRatings": []
  }
}
```

---

## Error Handling

- **400**: Invalid parameters/malformed requests
- **401**: Missing/invalid API credentials
- **429**: Rate limits exceeded

---

## Cost Optimization

- All aspect ratios for Gemini 2.5 Flash Image consume 1,290 tokens by default
- Choose economical models: `gemini-3.1-flash-image-preview` and `gemini-2.5-flash-image` consume fewer resources
- Use lower resolutions: 1K and 2K use fewer tokens than 4K
- Monitor token consumption via `usageMetadata` field in responses
