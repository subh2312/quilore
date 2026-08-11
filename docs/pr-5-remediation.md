# PR #5 Remediation Tracker

**PR:** https://github.com/subh2312/quilore/pull/5  
**Branch:** `cursor` → `dev`  
**Source of truth:** review remediation plan (attached)  
**Rule:** Do not mark DONE without test, migration, or deployment evidence.

## Findings status

| ID | Severity | Status | Notes |
|---|---|---|---|
| B1 | Blocker | DONE | OAuth2 resource-server JWT; JPA users+refresh_sessions; JwtBearerAuthIntegrationTest |
| B2 | Blocker | DONE | CurrentUser.requireSelfOrAdmin on owned routes; ObjectLevelAuthorizationTest |
| B3 | Blocker | DONE | JPA repos for profiles/entitlements/sync/jobs/media/etc.; V6; PersistenceRestartIntegrationTest |
| B4 | Blocker | DONE | FieldEncryptor fail-closed; injuries encrypted at rest; FieldEncryptorTest + EncryptedInjuriesPersistenceTest |
| B5 | Blocker | DONE | Path B: invoke returns HTTP 503 unavailable/deferred; no accepted:true fake success |
| B6 | Blocker | DONE | Local Postgres+pgvector Flyway proof (`prove-pgvector-migrations.sh`); Testcontainers IT when Docker available |
| B7 | Blocker | DONE | Loopback binds + tunnel overlay; Caddy optional; `test_tunnel_overlay.sh` |
| H1 | High | DONE | Typed DTOs for auth/profile/media + AuthValidationTest |
| H2 | High | DONE | Covered by B3 |
| H3 | High | DONE | Covered by B2/B3 |
| H4 | High | DONE | Nutrition/pose disclaimers + provenance; non-medical labels |
| H5 | High | DONE | Feature matrix keeps MediaPipe/RAG/IFCT/push/Maestro partial |

## Feature classification (corrected)

| Feature | Classification | Reason |
|---|---|---|
| CI/CD publish/promote/rollback | production-ready (ops) | Workflows + script tests exist |
| Observability (logs/metrics/correlation) | production-ready (ops) | Endpoints + redaction tests exist |
| Bearer JWT + Spring Security | production-ready | Resource-server JWT + principal/roles tests |
| Object-level authorization | production-ready | Principal ownership + cross-user 403 tests |
| Domain persistence (users/sessions/profiles/etc.) | production-ready (data plane) | JPA + V2–V6; PersistenceRestartIntegrationTest |
| Field encryption | production-ready (injuries field) | Fail-closed keys; injuries encrypted at rest |
| AI invoke / live inference | deferred / unavailable | HTTP 503 explicit deferred envelope (Path B) |
| Postgres+pgvector migrations | proven (local PG); Testcontainers when Docker available | `prove-pgvector-migrations.sh` evidence |
| MinIO media | partial / deferred | DB metadata persisted; live upload deferred (`minio.enabled=false`) |
| VPS deploy path | production-ready (ops path) | Loopback + Cloudflare Tunnel; Caddy optional |
| MediaPipe on-device | partial | Landmark contract + server heuristics only |
| Live RAG / pgvector retrieval | partial | In-memory hybrid ranker + SQL reference |
| IFCT food resolution | partial | Seeded subset, not full IFCT 2017 |
| Push notifications | partial | Durable SENT records in DB; delivery channel still stub |
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
| 2026-08-11 | B1 | `./gradlew test --tests com.quilore.auth.JwtBearerAuthIntegrationTest` PASS; USER/ADMIN/missing/tampered/expired/iss/aud + refresh rotation |
| 2026-08-11 | B2 | `./gradlew test --tests com.quilore.security.ObjectLevelAuthorizationTest` PASS; cross-user 403 for profile/quota/sync/media/notifications |
| 2026-08-11 | B3 | `./gradlew test` PASS; ConcurrentHashMap domain stores → JPA; V6 sync/macro/micro/meal-log/media status; MinIO metadata deferred (`minio.enabled=false`); PersistenceRestartIntegrationTest |
| 2026-08-11 | B4 | FieldEncryptorTest + EncryptedInjuriesPersistenceTest PASS; staging-like all-zero/missing key fails |
| 2026-08-11 | B5 | `python3 -m pytest ai-service/tests/test_contracts.py` PASS; invoke → 503 unavailable/deferred |
| 2026-08-11 | B6 | `bash deploy/scripts/prove-pgvector-migrations.sh` PASS on local Postgres 16+pgvector (pgcrypto/vector, vector(768), HNSW) |
| 2026-08-11 | B7 | `bash deploy/tests/test_tunnel_overlay.sh` PASS; loopback host_ip + no Caddy on tunnel path |
| 2026-08-11 | H1/H4/H5 | AuthValidationTest PASS; pose disclaimer test PASS; partial labels retained in matrix |
| 2026-08-11 | Final | Local full suite PASS; CI green https://github.com/subh2312/quilore/actions/runs/31519723247 on `1b32dfe` |

## B3 notes

- Replaced in-memory ConcurrentHashMap/list stores with Spring Data JPA entities/repositories for: profiles/metrics/check-ins, plans/entitlements/quotas, sync records/mutations/last-sync, AI jobs/notifications, meal reminder prefs (+ `last_meal_log_at`), permission_audit, macro_target_snapshots, micronutrient_flags, prompt_templates, exercises/exercise_revisions, media_objects.
- Flyway `V6__domain_persistence.sql` adds sync_*, macro_target_snapshots, micronutrient_flags, meal last-log column, permission_audit.actor_label, media_objects.status.
- Public service method signatures / record DTOs preserved; services use `@Transactional`.
- H2 tests: Flyway disabled, `ddl-auto: create-drop`, quoted identifiers; entities avoid Postgres-only columnDefinition TEXT.
- MinIO: `minio.enabled` defaults false; register persists metadata with `status: deferred` (no fake successful private upload). Live SDK upload left for a follow-up when enabled.
- Evidence: `PersistenceRestartIntegrationTest` writes profile/quota/sync/notification/media, clears persistence context, reloads (same Spring context = restart simulation).
- Auth rate-limit ConcurrentHashMap retained (allowed).

## Blockers / follow-ups

_None recorded yet. If a blocker cannot be completed safely in this PR, document here, disable misleading paths, and propose the smallest follow-up PR._
