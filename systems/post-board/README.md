<div align="center">

![PostBoard](images/hero.svg)

### Brand-aware social post & carousel studio

![Status](https://img.shields.io/badge/Status-active-brightgreen)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
![Hono](https://img.shields.io/badge/Hono-4-E36002?logo=hono&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-1-2EAD33?logo=playwright&logoColor=white)
[![Bun](https://img.shields.io/badge/Bun-Runtime-f9f1e1?logo=bun&logoColor=000)](https://bun.sh/)

</div>

---

## 📑 Table of Contents

- [✨ Features](#-features)
- [🏗 Architecture](#-architecture)
- [🛠 Tech Stack](#-tech-stack)
- [🚀 Getting Started](#-getting-started)
- [💻 Development](#-development)
- [📂 Project Structure](#-project-structure)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **social-post-generation** | Core task type |
| **carousel-generation** | Core task type |
| **brand-creative-editing** | Core task type |
| **copy-to-creative** | Core task type |
| **brief Input** | Supported input type |
| **copy-doc Input** | Supported input type |
| **reference-images Input** | Supported input type |
| **brand-package Input** | Supported input type |
| **editable-project-json Output** | Supported output type |
| **slide-png Output** | Supported output type |
| **carousel-pdf Output** | Supported output type |

---

## 🏗 Architecture

![Pipeline](images/pipeline.svg)

PostBoard processes data through a multi-stage pipeline.

---

## 🛠 Tech Stack

### Backend

| Technology | Purpose |
|------------|---------|
| **TypeScript 5.7** | Type safety |
| **Bun** | JavaScript runtime & package manager |
| **Hono 4** | Lightweight web framework |
| **Playwright 1** | Browser automation & scraping |
| **Zod 4** | Schema validation |

---

## 🚀 Getting Started

### Prerequisites

- [**Bun**](https://bun.sh/) v1.0+ — `curl -fsSL https://bun.sh/install | bash`

### Install

```bash
cd systems/post-board
bun install
```

### Run

```bash
bun run systems/post-board/src/cli.ts
```

---

## 💻 Development

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development mode |
| `bun run build` | Build for production |
| `bun test` | Run tests |
| `bun run lint` | Check code quality |

---

## 📂 Project Structure

```
post-board/
├── biome.json
├── editor
│   ├── .gitignore
│   ├── .gitkeep
│   ├── demo.html
│   ├── index.html
│   ├── src
│   │   ├── .gitkeep
│   │   ├── api.ts
│   │   ├── export-view.ts
│   │   ├── inspector.ts
│   │   ├── interactions.ts
│   │   ├── layer.ts
│   │   ├── main.ts
│   │   ├── modes.ts
│   │   ├── palette.ts
│   │   ├── slides.ts
│   │   ├── stage.ts
│   │   ├── store.ts
│   │   └── types.ts
│   ├── styles
│   │   ├── .gitkeep
│   │   ├── brand.css
│   │   └── editor.css
│   └── tsconfig.json
├── images
│   ├── hero.svg
│   └── pipeline.svg
├── justfile
├── knowledge
│   ├── acceptance-criteria.md
│   ├── dependencies.md
│   ├── domain.md
│   ├── execution.md
│   ├── history.md
│   └── index.md
├── logs
│   ├── 1eec3cef-6bc3-4ec6-8461-239e5dbfd7e1
│   │   ├── chat.json
│   │   ├── post_tool_use.json
│   │   ├── post_tool_use_failure.json
│   │   ├── pre_tool_use.json
│   │   └── stop.json
│   ├── 3908e9c3-b25b-47c3-9a17-8a5a799378b1
│   │   ├── chat.json
│   │   ├── post_tool_use.json
│   │   ├── post_tool_use_failure.json
│   │   ├── pre_tool_use.json
│   │   └── stop.json
│   ├── 398673f2-7bd8-4a3e-9748-b078629ca202
│   │   ├── chat.json
│   │   ├── post_tool_use.json
│   │   ├── pre_tool_use.json
│   │   └── stop.json
│   ├── 3ebfb298-1831-4378-b2c3-7e2cef6a8378
│   │   ├── post_tool_use.json
│   │   └── pre_tool_use.json
│   ├── e2e-server.log
│   ├── f7d7ccc2-9002-4886-ab1b-9fb6e4a8737a
│   │   ├── chat.json
│   │   ├── post_tool_use.json
│   │   ├── pre_tool_use.json
│   │   └── stop.json
│   ├── ffa2b4a3-d060-4615-b111-b96dfa2c5339
│   │   ├── chat.json
│   │   ├── post_tool_use.json
│   │   ├── pre_tool_use.json
│   │   └── stop.json
│   ├── pb-apply-copy.ts
│   ├── pb-edit.mjs
│   ├── pb-fix-cover.mjs
│   ├── pb-pdfcount.mjs
│   ├── pb-smoke.mjs
│   ├── pb-smoke2.mjs
│   ├── session_end.json
│   └── smoke-server.log
├── package.json
├── scripts
│   ├── apply-copy.ts
│   └── tsconfig.json
├── src
│   ├── .gitkeep
│   ├── brand-assets.ts
│   ├── brand-loader.test.ts
│   ├── brand-loader.ts
│   ├── cli.ts
│   ├── copy-contract.test.ts
│   ├── copy-contract.ts
│   ├── cover-prompt.test.ts
│   ├── cover-prompt.ts
│   ├── cover.ts
│   ├── export.test.ts
│   ├── export.ts
│   ├── formats.test.ts
│   ├── formats.ts
│   ├── image-client.ts
│   ├── index.ts
│   ├── mode-class.test.ts
│   ├── mode-class.ts
│   ├── project.test.ts
│   ├── project.ts
│   ├── root.ts
│   ├── seed.test.ts
│   ├── seed.ts
│   ├── server.test.ts
│   ├── server.ts
│   ├── templates
│   │   ├── .gitkeep
│   │   └── index.ts
│   └── types
│       ├── .gitkeep
│       └── index.ts
├── tests
│   ├── .gitkeep
│   └── fixtures
│       ├── .gitkeep
│       ├── sample-brief.txt
│       └── sample-copydoc.json
└── tsconfig.json
```

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes and ensure tests pass
4. Commit your changes and open a pull request

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

**Built with** 🧡 **using Bun, Hono, TypeScript**

</div>
