-- Feature flags, consent, goals, privacy, admin queues, analytics, workout reminders

CREATE TABLE IF NOT EXISTS feature_flags (
    flag_key            VARCHAR(64) PRIMARY KEY,
    description         TEXT NOT NULL,
    enabled_globally    BOOLEAN NOT NULL DEFAULT FALSE,
    rollout_percent     INT NOT NULL DEFAULT 0,
    environment         VARCHAR(32) NOT NULL DEFAULT 'all',
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feature_flag_cohorts (
    id                  UUID PRIMARY KEY,
    flag_key            VARCHAR(64) NOT NULL REFERENCES feature_flags(flag_key) ON DELETE CASCADE,
    user_id             UUID NOT NULL,
    enabled             BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (flag_key, user_id)
);

CREATE TABLE IF NOT EXISTS user_consents (
    id                  UUID PRIMARY KEY,
    user_id             UUID NOT NULL,
    consent_type        VARCHAR(64) NOT NULL,
    version             VARCHAR(32) NOT NULL,
    accepted            BOOLEAN NOT NULL,
    app_version         VARCHAR(32),
    accepted_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, consent_type, version)
);

CREATE TABLE IF NOT EXISTS user_goals (
    id                  UUID PRIMARY KEY,
    user_id             UUID NOT NULL,
    primary_goal        VARCHAR(64) NOT NULL,
    secondary_prefs     JSONB NOT NULL DEFAULT '[]'::jsonb,
    coaching_tone       VARCHAR(32) NOT NULL DEFAULT 'supportive',
    schedule_prefs      JSONB NOT NULL DEFAULT '{}'::jsonb,
    version             INT NOT NULL DEFAULT 1,
    effective_from      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_goals_user ON user_goals(user_id, effective_from DESC);

CREATE TABLE IF NOT EXISTS privacy_preferences (
    user_id             UUID PRIMARY KEY,
    analytics_opt_in    BOOLEAN NOT NULL DEFAULT FALSE,
    crash_reporting_opt_in BOOLEAN NOT NULL DEFAULT TRUE,
    privacy_mode_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS data_export_requests (
    id                  UUID PRIMARY KEY,
    user_id             UUID NOT NULL,
    status              VARCHAR(32) NOT NULL,
    format              VARCHAR(16) NOT NULL DEFAULT 'json',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at        TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS account_deletion_requests (
    id                  UUID PRIMARY KEY,
    user_id             UUID NOT NULL,
    status              VARCHAR(32) NOT NULL,
    reason              TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at        TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS food_alias_reviews (
    id                  UUID PRIMARY KEY,
    raw_name            VARCHAR(255) NOT NULL,
    candidate_code      VARCHAR(64),
    status              VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    reviewer            VARCHAR(128),
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at         TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS meal_scan_reviews (
    id                  UUID PRIMARY KEY,
    user_id             UUID,
    media_object_id     UUID,
    model_output        JSONB NOT NULL DEFAULT '{}'::jsonb,
    user_correction     JSONB,
    status              VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    reviewer            VARCHAR(128),
    decision            VARCHAR(32),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at         TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS analytics_events (
    id                  UUID PRIMARY KEY,
    user_id             UUID,
    event_name          VARCHAR(128) NOT NULL,
    properties          JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events(event_name, created_at DESC);

CREATE TABLE IF NOT EXISTS workout_reminder_prefs (
    user_id             UUID PRIMARY KEY,
    enabled             BOOLEAN NOT NULL DEFAULT TRUE,
    preferred_hour      INT NOT NULL DEFAULT 7,
    preferred_minute    INT NOT NULL DEFAULT 0,
    timezone            VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
    deep_link           VARCHAR(128) NOT NULL DEFAULT 'quilore://workout',
    privacy_mode        BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workout_reminder_dedupe (
    id                  UUID PRIMARY KEY,
    user_id             UUID NOT NULL,
    planned_session_id  VARCHAR(128) NOT NULL,
    sent_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, planned_session_id)
);

CREATE TABLE IF NOT EXISTS subscription_receipts (
    id                  UUID PRIMARY KEY,
    user_id             UUID NOT NULL,
    store               VARCHAR(32) NOT NULL,
    product_id          VARCHAR(128) NOT NULL,
    transaction_id      VARCHAR(255) NOT NULL,
    status              VARCHAR(32) NOT NULL,
    raw_payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (store, transaction_id)
);

CREATE TABLE IF NOT EXISTS injury_triage_events (
    id                  UUID PRIMARY KEY,
    user_id             UUID NOT NULL,
    muscle_region       VARCHAR(64) NOT NULL,
    pain_descriptors    JSONB NOT NULL DEFAULT '[]'::jsonb,
    risk_flag           VARCHAR(32) NOT NULL,
    message             TEXT NOT NULL,
    disclaimer          TEXT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meal_log_entries (
    id                  UUID PRIMARY KEY,
    user_id             UUID NOT NULL,
    source_type         VARCHAR(32) NOT NULL,
    meal_type           VARCHAR(32) NOT NULL,
    logged_at           TIMESTAMPTZ NOT NULL,
    notes               TEXT,
    totals              JSONB NOT NULL DEFAULT '{}'::jsonb,
    items               JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meal_log_user_day ON meal_log_entries(user_id, logged_at DESC);

INSERT INTO feature_flags (flag_key, description, enabled_globally, rollout_percent, environment)
VALUES
    ('meal_scan', 'Food photo scan pipeline', FALSE, 0, 'all'),
    ('advanced_coaching', 'Advanced AI coaching chat', TRUE, 100, 'all'),
    ('program_generation', 'Personalized program generation', FALSE, 10, 'staging'),
    ('voice_logging', 'On-device voice workout logging', TRUE, 100, 'all')
ON CONFLICT (flag_key) DO NOTHING;
