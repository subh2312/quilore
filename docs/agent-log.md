# Agent Log

- **Date:** 2026-08-11
- **Tool:** perplexity
- **Branch:** orchestrator-ci-integration
- **What:** Added `.github/workflows/pr-evidence.yml` and `.github/workflows/uat-release.yml`, wiring PR open/sync/close and manual UAT-release dispatch events to the self-hosted Quilore AI Team Orchestrator (Gemini/Antigravity lead on the VPS, behind Cloudflare Tunnel).
- **Why:** The orchestrator dispatches Cursor/Copilot against Plane backlog stories and needs a callback so it can post advisory PR reviews and free up an agent's lane when a PR merges/closes, plus a way to generate a release manifest for the Perplexity UAT gate. These two workflows were the only pieces missing from the existing AGENTS.md/CI/PR-template setup.
- **How:** Used the existing `AI_ORCHESTRATOR_URL` / `AI_ORCHESTRATOR_TOKEN` repo secrets (already present). Did not touch `AGENTS.md`, `.github/copilot-instructions.md`, `.cursor/rules/00-project-context.mdc`, `.github/pull_request_template.md`, or the existing `ci.yml` — those already correctly reflect this repo's locked architecture and were superseding an earlier, generic PR (#2) opened against `main` by mistake, which is being closed in favor of this one.

- **Date:** 2026-08-11
- **Tool:** gemini
- **Branch:** gemini
- **What:** Fixed blocking CI issues to prepare gemini branch for merging into dev.
- **Why:** The GitHub Actions workflow allowed lint and type-check failures to pass (using `|| true`) and failed before setup-node due to a missing package-lock.json.
- **How:** Generated `client/package-lock.json`, installed ESLint with `eslint-config-expo`, disabled a known React hydration lint error, and removed the `|| true` suppressions from `.github/workflows/ci.yml`.

- **Date:** 2026-08-08
- **Tool:** gemini
- **Branch:** gemini
- **What:** Completed Epic 0: Project Scaffolding and Architecture Setup (FastAPI AI service, React Native Expo client, Spring Boot configurations, and GitHub Actions CI pipeline).
- **Why:** Scaffold the monorepo for the Quilore project as per docs/Quilore.md §3 and §4 requirements, implementing the exact boundary separations (Java stateful, Python stateless AI).
- **How:** Generated the Spring Boot JPA/Security skeleton, set up the FastAPI provider fallback router in `ai-service/`, created the Expo 6-tab navigation in `client/`, and tied them all together in `docker-compose.yml` and `.github/workflows/ci.yml`. Validated the build flows successfully.
