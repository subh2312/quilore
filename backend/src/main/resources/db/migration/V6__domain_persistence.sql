-- V6: Sync, macro/micro snapshots, meal last-log, permission audit label (B3)

-- Pull-push sync records (Story 12.2)
CREATE TABLE IF NOT EXISTS sync_records (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    collection          VARCHAR(120) NOT NULL,
    record_id           VARCHAR(120) NOT NULL,
    updated_at_epoch_ms BIGINT NOT NULL,
    data_json           TEXT NOT NULL DEFAULT '{}',
    deleted             BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (user_id, collection, record_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_records_user_updated
    ON sync_records (user_id, updated_at_epoch_ms);

CREATE TABLE IF NOT EXISTS sync_mutations (
    mutation_id VARCHAR(128) PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_mutations_user ON sync_mutations (user_id);

CREATE TABLE IF NOT EXISTS sync_user_state (
    user_id               UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    last_successful_sync  TIMESTAMPTZ
);

-- Meal reminder last log (Story 10.2)
ALTER TABLE meal_reminder_prefs
    ADD COLUMN IF NOT EXISTS last_meal_log_at TIMESTAMPTZ;

-- Macro target history (Story nutrition macros)
CREATE TABLE IF NOT EXISTS macro_target_snapshots (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_type        VARCHAR(64) NOT NULL,
    weight_kg        NUMERIC(8,2) NOT NULL,
    height_cm        NUMERIC(8,2) NOT NULL,
    age              INT NOT NULL,
    sex              VARCHAR(32) NOT NULL,
    activity_level   VARCHAR(64) NOT NULL,
    target_calories  INT NOT NULL,
    target_protein_g NUMERIC(8,2) NOT NULL,
    target_fat_g     NUMERIC(8,2) NOT NULL,
    target_carbs_g   NUMERIC(8,2) NOT NULL,
    policy_version   VARCHAR(64) NOT NULL,
    effective_from   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_macro_snapshots_user ON macro_target_snapshots (user_id, effective_from);

-- Micronutrient shortfall flags
CREATE TABLE IF NOT EXISTS micronutrient_flags (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nutrient    VARCHAR(64) NOT NULL,
    window_label VARCHAR(32) NOT NULL,
    message     VARCHAR(512) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    dismissed   BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_micro_flags_user ON micronutrient_flags (user_id, created_at DESC);

-- Optional human-readable actor label when actor_user_id is unset
ALTER TABLE permission_audit
    ADD COLUMN IF NOT EXISTS actor_label VARCHAR(128);

-- Media upload status (deferred vs uploaded)
ALTER TABLE media_objects
    ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'deferred';
