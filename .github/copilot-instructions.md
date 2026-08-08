<!--
This file lives at .github/copilot-instructions.md in the repo.
Copilot's format doesn't support @-imports, so this is a short, manually-kept-in-sync
pointer to the real source of truth. If you change project rules, edit AGENTS.md first,
then update this file's bullets only if a hard constraint changed.
-->

# Copilot Instructions — Quilore

Before doing any non-trivial task, read `AGENTS.md` at the repo root and the relevant section of `docs/Quilore.md` (PRD §1, Technical Design §2, Architecture §3, Design System §4).

Hard constraints (do not violate even without re-reading AGENTS.md):
- Spring Boot owns all stateful data and business rules; FastAPI only does stateless AI orchestration and must never write to the database directly.
- On-device inference (Whisper.cpp for voice, MediaPipe Pose for form) stays on-device — do not move it to a cloud call.
- Cloud AI calls must go through FastAPI's provider fallback matrix (`docs/Quilore.md` §3.6), never called directly from the mobile client.
- All AI-derived output (dish detection, calorie estimates, form-check flags, injury triage) must remain user-editable and never presented as final/diagnostic.

Git workflow (see `AGENTS.md` for full detail):
- Work only on your tool's own branch (e.g. `copilot`). Fetch and pull `main` first; if your branch doesn't exist yet, branch it off latest `main`.
- Never commit directly to `main` or `dev`. Open PRs from your branch into `dev` only, never into `main`.
- Before opening a PR, add a What/Why/How entry to `docs/agent-log.md` and fill in `.github/pull_request_template.md`.
- Reuse existing code/components before adding new ones. Don't over-engineer — smallest change that satisfies the task and the locked architecture/design system.

For tech stack, repo layout, build/test commands, and full PR conventions, see `AGENTS.md`.
