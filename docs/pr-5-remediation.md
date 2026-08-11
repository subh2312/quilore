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
| 2026-08-11 | B1 | `./gradlew test --tests com.quilore.auth.JwtBearerAuthIntegrationTest` PASS; USER/ADMIN/missing/tampered/expired/iss/aud + refresh rotation |
| 2026-08-11 | B2 | `./gradlew test --tests com.quilore.security.ObjectLevelAuthorizationTest` PASS; cross-user 403 for profile/quota/sync/media/notifications |
| 2026-08-11 | B3 | `./gradlew test` PASS; ConcurrentHashMap domain stores → JPA; V6 sync/macro/micro/meal-log/media status; MinIO metadata deferred (`minio.enabled=false`); PersistenceRestartIntegrationTest |

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
