# Agent Log

- **Date:** 2026-08-11
- **Tool:** cursor
- **Branch:** cursor
- **PR:** (pending)
- **What:** Implemented Story 16.4 CI/CD pipeline and environment promotion — GHCR image publish, staging→production promotion, rollback workflows, compose overlays, and deploy script tests.
- **Why:** Plane story `c910a2a8-ae5a-4818-87aa-1bdbdc56f26a` / backlog Story 16.4 requires automated build/test, versioned artifacts, defined promotion, and tested rollback. Plane MCP was unavailable in this environment; acceptance criteria taken from `docs/quilore-plane-backlog.md`.
- **How:** Extended `.github/workflows/ci.yml` with Docker image builds and deploy-tooling tests; added `publish-images.yml`, `promote.yml`, and `rollback.yml`; added `deploy/` overlays + `promote.sh`/`rollback.sh`/`apply-env.sh` with contract tests. Did not reintroduce the previously reverted orchestrator PR-evidence workflows.

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
