-- V8: Workout session lifecycle + set logging (Wave 1A gym UAT)

CREATE TABLE IF NOT EXISTS workout_sessions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status            VARCHAR(32) NOT NULL DEFAULT 'in_progress',
    started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at          TIMESTAMPTZ,
    duration_minutes  BIGINT,
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_started
    ON workout_sessions (user_id, started_at DESC);

CREATE TABLE IF NOT EXISTS workout_sets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    exercise_name   VARCHAR(255) NOT NULL,
    set_index       INTEGER NOT NULL,
    reps            INTEGER,
    load_kg         DOUBLE PRECISION,
    unit            VARCHAR(16) DEFAULT 'kg',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workout_sets_session
    ON workout_sets (session_id, set_index);
