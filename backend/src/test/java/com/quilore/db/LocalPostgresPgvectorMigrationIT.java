package com.quilore.db;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * B6 local Postgres+pgvector evidence when Docker/Testcontainers is unavailable.
 * Enable with QUILORE_TEST_PG=1 (see deploy/scripts/prove-pgvector-migrations.sh).
 */
class LocalPostgresPgvectorMigrationIT {

    @Test
    @EnabledIfEnvironmentVariable(named = "QUILORE_TEST_PG", matches = "1")
    void flywayCreatesPgvectorSchemaOnLocalPostgres() throws Exception {
        String url = System.getenv().getOrDefault(
                "QUILORE_TEST_PG_URL",
                "jdbc:postgresql://localhost:5432/quilore_migtest");
        String user = System.getenv().getOrDefault("QUILORE_TEST_PG_USER", "quilore");
        String password = System.getenv().getOrDefault("QUILORE_TEST_PG_PASSWORD", "quilore_dev_pass");

        Flyway.configure()
                .dataSource(url, user, password)
                .locations("classpath:db/migration")
                .load()
                .migrate();

        try (Connection conn = DriverManager.getConnection(url, user, password)) {
            PostgresMigrationAssertions.assertSchema(conn);
        }
    }
}
