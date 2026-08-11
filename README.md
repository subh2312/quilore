# Quilore

Cross-platform fitness and nutrition app powered by AI — form correction, load recommendation, program design, macro tracking, and diet feedback with accuracy for Indian/South Asian cuisine.

## Architecture

| Layer | Technology |
|---|---|
| Mobile client | React Native (Expo) |
| Core backend | Java 21 / Spring Boot 3.x |
| AI orchestration | Python / FastAPI |
| Data | PostgreSQL 16 + pgvector + MinIO |
| Local cache/sync | WatermelonDB (SQLite) |

## Repository Layout

```
/client       React Native (Expo) mobile app
/backend      Spring Boot service (core product logic)
/ai-service   FastAPI service (AI orchestration)
/docs         PRD / TDD / architecture / design system docs
```

## Prerequisites

- **Docker** and **Docker Compose** v2+
- **Java 21** (for backend development)
- **Python 3.12+** (for ai-service development)
- **Node.js 20+** and **npm** (for client development)
- **Expo CLI** (`npm install -g expo-cli`)

## Quick Start (Local Development)

### 1. Clone and configure

```bash
git clone https://github.com/subh2312/quilore.git
cd quilore
cp .env.example .env
```

### 2. Start infrastructure services

```bash
docker compose up -d postgres minio
```

This starts:
- **PostgreSQL 16** with pgvector on port `5432`
- **MinIO** (S3-compatible storage) on port `9000` (API) / `9001` (console)

### 3. Run the backend

```bash
cd backend
./gradlew bootRun
```

The Spring Boot API starts on `http://localhost:8080`. Health check: `GET /api/health`

### 4. Run the AI service

```bash
cd ai-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The FastAPI service starts on `http://localhost:8000`. Health check: `GET /health`

### 5. Run the mobile client

```bash
cd client
npm install
npx expo start
```

Scan the QR code with Expo Go on your device, or press `i` for iOS simulator / `a` for Android emulator.

## Dev Environment Commands

| Service | Install | Run | Test | Lint |
|---|---|---|---|---|
| backend | `./gradlew build` | `./gradlew bootRun` | `./gradlew test` | `./gradlew spotlessCheck` |
| ai-service | `pip install -r requirements.txt` | `uvicorn app.main:app --reload` | `pytest` | `ruff check .` |
| client | `npm install` | `npx expo start` | `npm test` | `npx eslint .` |

## Documentation

- [Product Requirements Document](docs/quilore_document_set.md#1-product-requirements-document-prd)
- [Technical Design Document](docs/quilore_document_set.md#2-technical-design-document-tdd)
- [System Architecture](docs/quilore_document_set.md#3-system-architecture)
- [Design System](docs/quilore_document_set.md#4-design-system)
- [Agent Activity Log](docs/agent-log.md)

## Git Workflow

Each AI agent/tool works on its own branch (`gemini`, `cursor`, `copilot`, etc.). All PRs target `dev` for testing before promotion to `main`. See [AGENTS.md](AGENTS.md) for full workflow details.
