# PR #5 Remediation Tracker

**PR:** https://github.com/subh2312/quilore/pull/5  
**Branch:** `cursor` → `dev`  
**Source of truth:** review remediation plan (attached)  
**Rule:** Do not mark DONE without test, migration, or deployment evidence.

## Findings status

| ID | Severity | Status | Notes |
|---|---|---|---|
| B1 | Blocker | TODO | JWT must establish Spring Security principal/roles at runtime |
| B2 | Blocker | TODO | Object-level authz; no client-chosen userId ownership |
| B3 | Blocker | TODO | Replace ConcurrentHashMap production state with PostgreSQL |
| B4 | Blocker | TODO | Remove all-zero AES fallback outside tests; fail closed in staging/prod |
| B5 | Blocker | TODO | AI invoke must not fake success — adapters or explicit unavailable |
| B6 | Blocker | TODO | Prove Flyway on real Postgres+pgvector (Testcontainers) |
| B7 | Blocker | TODO | VPS path = loopback + Cloudflare Tunnel (Caddy optional/non-default) |
| H1 | High | TODO | Typed DTOs + validation on public request bodies |
| H2 | High | TODO | Covered by B3 (durable sessions/quotas/audits/sync/notifications) |
| H3 | High | TODO | Covered by B2/B3 (media ownership + metadata) |
| H4 | High | TODO | Explicit non-medical / provenance boundaries |
| H5 | High | TODO | Honest partial classification; baseline integration coverage |

## Feature classification (corrected)

| Feature | Classification | Reason |
|---|---|---|
| CI/CD publish/promote/rollback | production-ready (ops) | Workflows + script tests exist |
| Observability (logs/metrics/correlation) | production-ready (ops) | Endpoints + redaction tests exist |
| Bearer JWT + Spring Security | scaffold → **must become production-ready** | Issued tokens not wired into SecurityContext |
| Object-level authorization | scaffold → **must become production-ready** | Routes accept arbitrary userId |
| Domain persistence (users/sessions/profiles/etc.) | implemented but not persisted | ConcurrentHashMap stores |
| Field encryption | scaffold → **must become production-ready** | All-zero key fallback unsafe |
| AI invoke / live inference | scaffold → **must become unavailable/deferred or real** | Placeholder success-like response |
| Postgres+pgvector migrations | scaffold → **must be proven** | Schema present; no live Testcontainers proof |
| MinIO media | scaffold / partial | Metadata helper + public URL construction; no real client upload authz |
| VPS deploy path | incorrect for current ops → **must match tunnel/loopback** | Caddy/80/443 overlay not the VPS model |
| MediaPipe on-device | partial | Landmark contract + server heuristics only |
| Live RAG / pgvector retrieval | partial | In-memory hybrid ranker + SQL reference |
| IFCT food resolution | partial | Seeded subset, not full IFCT 2017 |
| Push notifications | partial | In-memory SENT records only |
| Device E2E (Maestro) | scaffold/contract only | YAML present; not run in CI/device |

## Implementation plan (ordered)

1. **Phase 0** — This tracker + agent-log + PR classification update.
2. **B1** — JWT resource-server/filter, principal/roles, fail-closed secrets, refresh-token persistence, executable auth tests.
3. **B2** — Principal-derived identity; remove/reject client userId ownership; cross-user tests for all owned resources.
4. **B3/B4/B6** — JPA/repositories for critical domains; secure FieldEncryptor; Testcontainers Postgres+pgvector Flyway + restart persistence; MinIO real or explicit defer.
5. **B5** — Path B preferred for merge safety: explicit `503`/`501` unavailable/deferred AI invoke (no fake success).
6. **B7** — Loopback-only ports + Cloudflare Tunnel overlay; Caddy optional/docs-only.
7. **H1/H4/H5** — Typed DTOs, health/nutrition disclaimer boundaries, honest partial labels.
8. **Final verification** — Full test matrix + evidence in PR description + handoff table.

## Evidence log

| Date | Finding | Evidence |
|---|---|---|
| 2026-08-11 | Phase 0 | Tracker created; classification corrected |

## Blockers / follow-ups

_None recorded yet. If a blocker cannot be completed safely in this PR, document here, disable misleading paths, and propose the smallest follow-up PR._
