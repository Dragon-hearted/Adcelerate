# PromptWriter
set dotenv-load := true

# List all recipes
default:
  @just --list

# Run in development mode (watch)
dev:
  bun run dev

# Run tests
test:
  bun test

# Build for production
build:
  bun run build

# Lint code
lint:
  bun run lint

# Check and fix formatting
check:
  bun run check

# List all registered models
list-models:
  bun run src/cli.ts list

# Validate registry and model files
validate:
  bun run src/cli.ts validate

# Add a new model from schema template
add-model name type:
  bun run src/cli.ts add {{name}} --type {{type}}
