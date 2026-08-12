-- Align NUMERIC columns with Hibernate Double/double entity mappings (ddl-auto=validate).
-- Without this, startup fails: found numeric, expecting float(53).

ALTER TABLE body_metrics
    ALTER COLUMN weight_kg TYPE DOUBLE PRECISION USING weight_kg::double precision,
    ALTER COLUMN waist_cm TYPE DOUBLE PRECISION USING waist_cm::double precision;

ALTER TABLE user_profiles
    ALTER COLUMN height_cm TYPE DOUBLE PRECISION USING height_cm::double precision,
    ALTER COLUMN weight_kg TYPE DOUBLE PRECISION USING weight_kg::double precision;

ALTER TABLE macro_target_snapshots
    ALTER COLUMN weight_kg TYPE DOUBLE PRECISION USING weight_kg::double precision,
    ALTER COLUMN height_cm TYPE DOUBLE PRECISION USING height_cm::double precision,
    ALTER COLUMN target_protein_g TYPE DOUBLE PRECISION USING target_protein_g::double precision,
    ALTER COLUMN target_fat_g TYPE DOUBLE PRECISION USING target_fat_g::double precision,
    ALTER COLUMN target_carbs_g TYPE DOUBLE PRECISION USING target_carbs_g::double precision;
