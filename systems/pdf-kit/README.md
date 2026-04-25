<div align="center">

![pdf-kit](images/hero.svg)

### Branded PDF rendering system — A4 cover-plus-content layouts using @react-pdf/renderer with Adcelerate design-system tokens (Archivo Black wordmark, Inter body, paper/ink palette)

![Status](https://img.shields.io/badge/Status-active-brightgreen)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=000)
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
| **pdf-generation** | Core task type |
| **document-rendering** | Core task type |
| **branded-output** | Core task type |
| **tsx-document-module Input** | Supported input type |
| **title-string Input** | Supported input type |
| **body-text Input** | Supported input type |
| **pdf-file Output** | Supported output type |

---

## 🏗 Architecture

![Pipeline](images/pipeline.svg)

pdf-kit processes data through a multi-stage pipeline.

---

## 🛠 Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| **React 19** | UI framework |

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
cd systems/pdf-kit
bun install
```

### Run

```bash
bun run systems/pdf-kit/src/render.ts
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
pdf-kit/
├── README.md
├── biome.json
├── justfile
├── package.json
├── src
│   ├── demo
│   │   └── system-doc.tsx
│   ├── render.ts
│   └── template.tsx
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

**Built with** 🧡 **using Bun, React, TypeScript**

</div>
