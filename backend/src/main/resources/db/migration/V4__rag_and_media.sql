-- V4: RAG hybrid search storage + media metadata (pgvector / MinIO)

CREATE TABLE IF NOT EXISTS rag_chunks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content         TEXT NOT NULL,
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
    embedding       vector(768),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- HNSW for static corpus recall; IVFFlat can be added for large dynamic partitions later.
CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding_hnsw
    ON rag_chunks USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_rag_chunks_metadata_gin
    ON rag_chunks USING gin (metadata jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_rag_chunks_content_trgm
    ON rag_chunks USING gin (content gin_trgm_ops);

CREATE TABLE IF NOT EXISTS media_objects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    bucket          VARCHAR(128) NOT NULL,
    object_key      VARCHAR(512) NOT NULL,
    content_type    VARCHAR(128),
    size_bytes      BIGINT,
    checksum_sha256 VARCHAR(64),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (bucket, object_key)
);
