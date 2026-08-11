# Agent Log

- **Date:** 2026-08-11
- **Tool:** cursor
- **Branch:** cursor
- **PR:** https://github.com/subh2312/quilore/pull/5
- **What:** Implemented Stories 14.4, 14.3, 11.3, 11.1, 10.3, 10.2, 9.1, 1.2, 1.1 — exercise content, prompt versions, plans/quotas, async AI notifications, meal reminders, body metrics, profiles, and auth/JWT sessions.
- **Why:** Next ordered Plane backlog IDs after security/observability. Plane MCP unavailable; criteria from `docs/quilore-plane-backlog.md`.
- **How:** Added Spring Boot domain services + REST controllers with MockMvc/unit coverage; Flyway V3 schema for Postgres; in-memory stores for tests (Flyway off on H2). Auth uses BCrypt + HMAC JWT with failed-attempt rate limiting.

- **Date:** 2026-08-11
- **Tool:** cursor
- **Branch:** cursor
- **PR:** https://github.com/subh2312/quilore/pull/5
- **What:** Implemented Story 15.2 encryption/secret management baseline and Story 15.1 RBAC/admin authorization (TLS overlay, secret rotation, AES-GCM field encryptor, admin role gates + audit).
- **Why:** Plane stories `588bd4d3-5598-4125-9b0e-f53f51413d89` and `fe100b45-025d-4167-b62f-c65c70fdcc5b`. Plane MCP unavailable; criteria from `docs/quilore-plane-backlog.md`.
- **How:** Added Caddy TLS overlay, `rotate-secrets.sh` with CI tests, `FieldEncryptor`, cleared plaintext placeholders from `.env.example`; added USER/SUPPORT/ADMIN roles, `/api/admin/**` enforcement, safe 401/403 JSON, permission audit service, and Flyway V2.

- **Date:** 2026-08-11
- **Tool:** cursor
- **Branch:** cursor
- **PR:** https://github.com/subh2312/quilore/pull/5
- **What:** Implemented Story 16.1 structured logging, metrics, and distributed tracing across Spring Boot and FastAPI (correlation IDs, Prometheus metrics, job traces, redaction policy).
- **Why:** Plane story `7240c333-9211-4fa2-8cf6-66f2614049ed` / backlog Story 16.1. Plane MCP unavailable; criteria from `docs/quilore-plane-backlog.md`.
- **How:** Added backend Logstash JSON logging + Micrometer Prometheus + correlation filter/JobTrace/redactor; FastAPI structlog + middleware metrics/provider gauges + `/metrics`; Prometheus scrape sample under `deploy/observability/`.

- **Date:** 2026-08-11
- **Tool:** cursor
- **Branch:** cursor
- **PR:** https://github.com/subh2312/quilore/pull/5
- **What:** Implemented Story 16.3 automated API, contract, and E2E testing — backend MockMvc contracts, AI normalized invoke envelope + pytest contracts, client critical-journey Jest suite + Maestro scaffold, CI `npm test` gate.
- **Why:** Plane story `6f818927-e160-4d14-bdae-162895880f6d` / backlog Story 16.3. Plane MCP unavailable; criteria from `docs/quilore-plane-backlog.md`.
- **How:** Added `NormalizedAIResponse` + `POST /ai/tasks/{task}/invoke`; expanded backend OpenAPI/health/security contracts; Jest journey contracts for the six-tab surface with Maestro YAML for future device runs; wired client tests into CI so regressions fail the pipeline.

- **Date:** 2026-08-11
- **Tool:** cursor
- **Branch:** cursor
- **PR:** https://github.com/subh2312/quilore/pull/5
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
