# AGENTS.md

This is the single source of truth for any AI coding agent working in this repo — Cursor, GitHub Copilot, Claude Code, Gemini CLI, or any future tool. `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`, and `.cursor/rules/*.mdc` all point back here. **Edit this file only** — do not fork the content into the other files, or they will drift out of sync.

## Project Overview

Quilore is a cross-platform fitness and nutrition app that replaces a human trainer's core functions — form correction, load recommendation, program design, macro tracking, and diet feedback — using voice, computer vision, and conversational AI, with specific accuracy for Indian/South Asian food and regional exercise needs.

Full product and technical spec (read the relevant section before touching related code):
- `docs/Quilore.md` — PRD (§1), Technical Design (§2), System Architecture (§3), Design System (§4).

## Locked Architecture — Do Not Violate

- **Spring Boot (Java)** owns all stateful product logic: auth, user profiles, workout/nutrition logs, meal entries, goal targets, sync, plans, progression rules, quotas. It is the source of truth.
- **FastAPI (Python)** owns stateless AI orchestration only: provider routing, OCR cleanup, prompt assembly, embeddings, food-image pipeline.
- **Hard boundary rule**: AI (FastAPI) must never write directly to the database. All AI output flows back through Spring Boot for business-rule validation before persistence. Do not introduce a code path that lets the AI layer bypass this.
- **On-device inference** (do not move to cloud): Whisper.cpp for voice, MediaPipe Pose for form/rep tracking, on-device OCR as first pass.
- **Cloud AI calls** go through FastAPI's priority routing/fallback matrix (Groq → OpenRouter → Hugging Face → NVIDIA NIM depending on task — see `docs/Quilore.md` §3.6). Never call a cloud AI provider directly from the mobile client or from Spring Boot.

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile client | React Native |
| Core backend | Java / Spring Boot |
| AI orchestration | Python / FastAPI |
| Data | PostgreSQL + pgvector + MinIO |
| Local cache/sync | WatermelonDB (SQLite) |
| Voice | Whisper.cpp (on-device) |
| Pose/form | MediaPipe Pose (on-device) |

## Repo Layout

Monorepo intended for single-VPS Docker deployment. Expected top-level structure (create as each service is scaffolded):

```
/client       React Native app
/backend      Spring Boot service (core product logic)
/ai-service   FastAPI service (AI orchestration)
/docs         PRD / TDD / architecture / design system source docs
```

## Git Workflow — Branch Per Agent

The remote has `main` and `dev` as protected integration branches, plus one branch per agent/tool (`cursor`, `copilot`, and so on).

**At the start of every session/task:**
1. `git fetch origin` and `git checkout main && git pull origin main`.
2. Determine your tool name (e.g. `cursor`, `copilot`, `claude`, `gemini`, `codex`). Check whether `origin/<tool-name>` exists.
   - If it exists: `git checkout <tool-name> && git merge origin/main` (or rebase) to bring it up to date before starting new work.
   - If it does not exist: create it fresh from the latest `main` — `git checkout -b <tool-name> origin/main`, then push it once (`git push -u origin <tool-name>`) so other tools/humans can see it exists.
3. Do all work for the task on that branch only. Never commit directly to `main` or `dev`.
4. When the task is ready for testing, open a PR/MR from `<tool-name>` → `dev` (never straight to `main`). Do not merge it yourself — leave it for review/testing, unless the user explicitly tells you to merge.
5. `main` and `dev` are only ever updated by an explicit human/user instruction to do so (e.g. promoting a tested `dev` to `main`, or fast-forwarding a hotfix). If you are not explicitly asked to touch `main` or `dev`, don't.

This means every agent/tool always starts from the latest shared `main`, but iterates in isolation on its own branch, and all cross-pollination happens through reviewed PRs into `dev` — never silent direct pushes.

## Task Documentation — Every PR Must Explain What/Why/How

Every PR into `dev` must include, in the PR description (use `.github/pull_request_template.md`):
- **What** changed (files/modules touched, in one or two lines).
- **Why** (which requirement, bug, or architecture note in `docs/Quilore.md` / `AGENTS.md` this addresses).
- **How** (the approach taken, and any alternatives you considered and rejected).

Also append a short entry to `docs/agent-log.md` (newest entry on top) with the same What/Why/How plus your tool name, branch, and PR link, before opening the PR. This is the one file every agent should skim at the start of a session to see what other tools have already done, so work doesn't get duplicated or contradicted across branches.

## Engineering Principles

- **Reuse before you build.** Before adding a new component, endpoint, service, or dependency, check `docs/agent-log.md`, `dev`, and the existing codebase for something that already does this or close to it. Extend it rather than duplicating.
- **Do not over-engineer.** Implement the smallest change that satisfies the current task and the locked architecture. Don't add abstraction layers, config options, or generalization the task doesn't need.
- **Stick to the architecture and design system.** Every change must respect the Locked Architecture boundary above and the patterns in `docs/Quilore.md` §3 (System Architecture) and §4 (Design System). If a task seems to require deviating from either, stop and flag it in the PR description rather than quietly working around it.

## Non-Negotiable Product Rules

- Never present AI output (dish detection, calorie estimate, form-check flag, injury triage) as final/authoritative — everything must be user-editable inline.
- Injury/muscle-map guidance is always a risk flag, never a diagnosis — label it as such in UI copy and API responses.
- Scanned-meal calorie/portion estimates are always a range with manual adjustment, never a single false-precision number. Manual meal entries are fully editable before save.
- v1 nutrition accuracy is scoped to Indian/South Asian cuisine (IFCT 2017 as the authoritative nutrient source) — don't add other-cuisine logic to core resolution paths.

## Dev Environment, Build, and Test Commands

_Not yet populated — this repo is pre-scaffold. When you add `/client`, `/backend`, or `/ai-service`, add their install/run/lint/test commands here so every agent (and every human) uses the same commands._

## PR / Commit Conventions

- Keep commits scoped to one service (`client`, `backend`, `ai-service`, `docs`) where possible.
- If a change touches the architecture boundary rule, the fallback matrix, or the data model in `docs/Quilore.md`, update that doc in the same PR.
- Note in the PR description which module owns the change (Fitness / Nutrition / Shared).

## Keeping Agent Context in Sync

This file is the only place project instructions should be authored. The mirrors below are intentionally thin:
- `CLAUDE.md` → `@AGENTS.md` import
- `GEMINI.md` → `@AGENTS.md` import
- `.github/copilot-instructions.md` → short pointer + hard constraints, since Copilot's file format doesn't support `@import`
- `.cursor/rules/00-project-context.mdc` → `alwaysApply` rule with the same pointer

If you add a new agent/tool that reads its own filename, add a one-line mirror for it here and in the table below rather than duplicating content.

| Tool | File it reads | How it gets this content |
|---|---|---|
| Claude Code | `CLAUDE.md` | `@AGENTS.md` import |
| Gemini CLI | `GEMINI.md` | `@AGENTS.md` import |
| GitHub Copilot | `.github/copilot-instructions.md` | Manual short pointer (keep in sync) |
| Cursor | `.cursor/rules/00-project-context.mdc` | `alwaysApply` rule, manual short pointer |
| OpenAI Codex / other AGENTS.md-native tools | `AGENTS.md` | Native, no mirror needed |

Other files that support this setup:
- `.github/pull_request_template.md` — enforces base branch `dev` and the What/Why/How format.
- `docs/agent-log.md` — running cross-agent activity log; append an entry per PR.
