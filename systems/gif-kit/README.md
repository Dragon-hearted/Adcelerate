<div align="center">

![GifKit](images/hero.svg)

### Branded GIF rendering system using Remotion — composable React motion compositions compiled to loopable GIF assets with design-system token integration

![Status](https://img.shields.io/badge/Status-building-lightgrey)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=000)
![Remotion](https://img.shields.io/badge/Remotion-4-0B84F3?logo=remotion&logoColor=white)
[![Bun](https://img.shields.io/badge/Bun-Runtime-f9f1e1?logo=bun&logoColor=000)](https://bun.sh/)

</div>

---

## 📑 Table of Contents

- [✨ Features](#features)
- [🏗 Architecture](#architecture)
- [🛠 Tech Stack](#tech-stack)
- [🚀 Getting Started](#getting-started)
- [💻 Development](#development)
- [📂 Project Structure](#project-structure)
- [🤝 Contributing](#contributing)
- [📄 License](#license)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **gif-rendering** | Core task type |
| **motion-asset-generation** | Core task type |
| **brand-animation** | Core task type |
| **remotion-composition Input** | Supported input type |
| **design-tokens Input** | Supported input type |
| **gif Output** | Supported output type |
| **animated-brand-asset Output** | Supported output type |

---

## 🏗 Architecture

![Pipeline](images/pipeline.svg)

GifKit processes data through a multi-stage pipeline.

---

## 🛠 Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| **@remotion/cli 4** | Remotion CLI |
| **React 19** | UI framework |
| **React-dom 19** | React DOM renderer |
| **Remotion 4** | Programmatic video rendering |

### Backend

| Technology | Purpose |
|------------|---------|
| **TypeScript 6.0** | Type safety |
| **Bun** | JavaScript runtime & package manager |

---

## 🚀 Getting Started

### Prerequisites

- [**Bun**](https://bun.sh/) v1.0+ — `curl -fsSL https://bun.sh/install | bash`

### Install

```bash
cd systems/gif-kit
bun install
```

### Run

```bash
bun run systems/gif-kit/src/index.ts
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
gif-kit/
├── README.md
├── justfile
├── package.json
├── remotion.config.ts
├── src
│   ├── Root.tsx
│   ├── compositions
│   │   └── BrandIntro.tsx
│   ├── index.ts
│   └── render.ts
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

**Built with** 🧡 **using Bun, React, Remotion, TypeScript**

</div>
