-- V3: Content, prompts, plans, quotas, notifications, profile, metrics

-- Exercises / coaching content (Story 14.4)
CREATE TABLE IF NOT EXISTS exercises (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            VARCHAR(120) NOT NULL UNIQUE,
    name            VARCHAR(200) NOT NULL,
    instructions    TEXT NOT NULL DEFAULT '',
    coaching_cues   TEXT NOT NULL DEFAULT '',
    demo_asset_url  VARCHAR(512),
    published       BOOLEAN NOT NULL DEFAULT FALSE,
    version         INT NOT NULL DEFAULT 1,
    updated_by      VARCHAR(120),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT exercises_demo_asset_chk CHECK (
        demo_asset_url IS NULL OR demo_asset_url ~* '^https?://'
    )
);

CREATE TABLE IF NOT EXISTS exercise_revisions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id     UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    version         INT NOT NULL,
    snapshot        JSONB NOT NULL,
    actor           VARCHAR(120) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (exercise_id, version)
);

-- Prompt templates (Story 14.3)
CREATE TABLE IF NOT EXISTS prompt_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key             VARCHAR(120) NOT NULL,
    version         INT NOT NULL,
    model_hint      VARCHAR(120) NOT NULL DEFAULT 'default',
    body            TEXT NOT NULL,
    active          BOOLEAN NOT NULL DEFAULT FALSE,
    created_by      VARCHAR(120) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (key, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_prompt_templates_one_active
    ON prompt_templates (key) WHERE active = TRUE;

-- Plans / entitlements (Story 11.1)
CREATE TABLE IF NOT EXISTS plans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(64) NOT NULL UNIQUE,
    name            VARCHAR(120) NOT NULL,
    description     TEXT NOT NULL DEFAULT '',
    active          BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS plan_entitlements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id         UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    feature_key     VARCHAR(120) NOT NULL,
    enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (plan_id, feature_key)
);

CREATE TABLE IF NOT EXISTS user_entitlements (
    user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    plan_id         UUID NOT NULL REFERENCES plans(id),
    status          VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    valid_from      TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_to        TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI usage quotas (Story 11.3)
CREATE TABLE IF NOT EXISTS usage_quotas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id         UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    feature_key     VARCHAR(120) NOT NULL,
    limit_count     INT NOT NULL,
    period          VARCHAR(32) NOT NULL DEFAULT 'MONTHLY',
    UNIQUE (plan_id, feature_key)
);

CREATE TABLE IF NOT EXISTS usage_counters (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feature_key     VARCHAR(120) NOT NULL,
    period_start    DATE NOT NULL,
    used_count      INT NOT NULL DEFAULT 0,
    UNIQUE (user_id, feature_key, period_start)
);

-- Async AI jobs + notifications (Story 10.3)
CREATE TABLE IF NOT EXISTS ai_jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_type        VARCHAR(64) NOT NULL,
    status          VARCHAR(32) NOT NULL DEFAULT 'QUEUED',
    result_ref      VARCHAR(512),
    error_message   VARCHAR(512),
    deep_link       VARCHAR(512),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(200) NOT NULL,
    body            VARCHAR(500) NOT NULL,
    deep_link       VARCHAR(512),
    privacy_safe    BOOLEAN NOT NULL DEFAULT TRUE,
    delivery_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Meal reminders (Story 10.2)
CREATE TABLE IF NOT EXISTS meal_reminder_prefs (
    user_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    enabled             BOOLEAN NOT NULL DEFAULT FALSE,
    window_start_minute INT NOT NULL DEFAULT 480,
    window_end_minute   INT NOT NULL DEFAULT 1260,
    privacy_mode        BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Body metrics / check-ins (Story 9.1)
CREATE TABLE IF NOT EXISTS body_metrics (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recorded_on     DATE NOT NULL,
    weight_kg       NUMERIC(6,2),
    waist_cm        NUMERIC(6,2),
    photo_object_key VARCHAR(512),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS check_ins (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recorded_on     DATE NOT NULL,
    mood            INT CHECK (mood IS NULL OR (mood BETWEEN 1 AND 5)),
    recovery        INT CHECK (recovery IS NULL OR (recovery BETWEEN 1 AND 5)),
    hunger          INT CHECK (hunger IS NULL OR (hunger BETWEEN 1 AND 5)),
    energy          INT CHECK (energy IS NULL OR (energy BETWEEN 1 AND 5)),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profile baseline (Story 1.2)
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    age                 INT,
    sex                 VARCHAR(32),
    height_cm           NUMERIC(6,2),
    weight_kg           NUMERIC(6,2),
    training_experience VARCHAR(64),
    dietary_preferences TEXT,
    injuries_info       TEXT,
    equipment_access    TEXT,
    injuries_disclaimer VARCHAR(256) NOT NULL DEFAULT 'Informational only — not a medical diagnosis.',
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed free/premium plans
INSERT INTO plans (id, code, name, description, active)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'FREE', 'Free', 'Core logging features', TRUE),
    ('22222222-2222-2222-2222-222222222222', 'PREMIUM', 'Premium', 'AI coaching and scans', TRUE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO plan_entitlements (plan_id, feature_key, enabled)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'workout_logging', TRUE),
    ('11111111-1111-1111-1111-111111111111', 'meal_logging', TRUE),
    ('11111111-1111-1111-1111-111111111111', 'ai_meal_scan', FALSE),
    ('11111111-1111-1111-1111-111111111111', 'ai_advanced_coaching', FALSE),
    ('22222222-2222-2222-2222-222222222222', 'workout_logging', TRUE),
    ('22222222-2222-2222-2222-222222222222', 'meal_logging', TRUE),
    ('22222222-2222-2222-2222-222222222222', 'ai_meal_scan', TRUE),
    ('22222222-2222-2222-2222-222222222222', 'ai_advanced_coaching', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO usage_quotas (plan_id, feature_key, limit_count, period)
VALUES
    ('22222222-2222-2222-2222-222222222222', 'ai_meal_scan', 60, 'MONTHLY'),
    ('22222222-2222-2222-2222-222222222222', 'ai_advanced_coaching', 300, 'MONTHLY'),
    ('11111111-1111-1111-1111-111111111111', 'ai_meal_scan', 0, 'MONTHLY'),
    ('11111111-1111-1111-1111-111111111111', 'ai_advanced_coaching', 5, 'MONTHLY')
ON CONFLICT DO NOTHING;
