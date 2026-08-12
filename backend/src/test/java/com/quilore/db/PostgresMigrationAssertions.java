package com.quilore.db;

import java.sql.Connection;
import java.sql.ResultSet;

import static org.assertj.core.api.Assertions.assertThat;

final class PostgresMigrationAssertions {

    private PostgresMigrationAssertions() {
    }

    static void assertSchema(Connection conn) throws Exception {
        try (ResultSet ext = conn.createStatement().executeQuery(
                "SELECT extname FROM pg_extension WHERE extname IN ('vector','pgcrypto') ORDER BY 1")) {
            assertThat(ext.next()).isTrue();
            assertThat(ext.getString(1)).isEqualTo("pgcrypto");
            assertThat(ext.next()).isTrue();
            assertThat(ext.getString(1)).isEqualTo("vector");
        }

        try (ResultSet tables = conn.createStatement().executeQuery("""
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name IN (
                    'users','refresh_sessions','permission_audit','user_profiles',
                    'rag_chunks','media_objects','sync_records','ai_jobs'
                  )
                ORDER BY 1
                """)) {
            int count = 0;
            while (tables.next()) {
                count++;
            }
            assertThat(count).isGreaterThanOrEqualTo(8);
        }

        try (ResultSet vectorCol = conn.createStatement().executeQuery("""
                SELECT format_type(a.atttypid, a.atttypmod)
                FROM pg_attribute a
                JOIN pg_class c ON a.attrelid = c.oid
                JOIN pg_namespace n ON c.relnamespace = n.oid
                WHERE n.nspname = 'public' AND c.relname = 'rag_chunks' AND a.attname = 'embedding'
                """)) {
            assertThat(vectorCol.next()).isTrue();
            assertThat(vectorCol.getString(1)).contains("vector");
        }

        try (ResultSet idx = conn.createStatement().executeQuery("""
                SELECT indexname FROM pg_indexes
                WHERE tablename = 'rag_chunks' AND indexname = 'idx_rag_chunks_embedding_hnsw'
                """)) {
            assertThat(idx.next()).isTrue();
        }
    }
}
