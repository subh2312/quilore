"""Hybrid search helpers for pgvector + keyword/JSONB filtering."""

from __future__ import annotations

import math
from dataclasses import dataclass


@dataclass
class Chunk:
    id: str
    content: str
    metadata: dict
    embedding: list[float]


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if len(a) != len(b) or not a:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b, strict=True))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def hybrid_search(
    chunks: list[Chunk],
    query_embedding: list[float],
    *,
    keyword: str | None = None,
    metadata_filter: dict | None = None,
    limit: int = 5,
) -> list[dict]:
    """Combine cosine similarity with keyword + metadata filters (pgvector hybrid pattern)."""
    results: list[dict] = []
    kw = keyword.lower().strip() if keyword else None
    for chunk in chunks:
        if metadata_filter:
            if any(chunk.metadata.get(k) != v for k, v in metadata_filter.items()):
                continue
        if kw and kw not in chunk.content.lower():
            continue
        score = cosine_similarity(query_embedding, chunk.embedding)
        results.append(
            {
                "id": chunk.id,
                "content": chunk.content,
                "metadata": chunk.metadata,
                "score": round(score, 4),
            }
        )
    results.sort(key=lambda row: row["score"], reverse=True)
    return results[:limit]


# SQL reference used by Spring/FastAPI repositories against Postgres+pgvector.
HYBRID_SQL = """
SELECT id, content, metadata,
       1 - (embedding <=> %(query_embedding)s::vector) AS semantic_score
FROM rag_chunks
WHERE (%(doc_type)s::text IS NULL OR metadata->>'doc_type' = %(doc_type)s)
  AND (%(keyword)s::text IS NULL OR content ILIKE '%%' || %(keyword)s || '%%')
ORDER BY embedding <=> %(query_embedding)s::vector
LIMIT %(limit)s;
"""
