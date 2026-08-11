-- V2: RBAC roles + permission audit (Story 15.1)

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role VARCHAR(32) NOT NULL DEFAULT 'USER';

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS disabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS permission_audit (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id   UUID,
    actor_role      VARCHAR(32) NOT NULL,
    action          VARCHAR(64) NOT NULL,
    target_user_id  UUID,
    detail          VARCHAR(512),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_permission_audit_created_at ON permission_audit (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
