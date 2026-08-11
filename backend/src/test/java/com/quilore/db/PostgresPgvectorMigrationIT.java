package com.quilore.db;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.sql.Connection;
import java.sql.DriverManager;

/**
 * B6 Testcontainers path — skipped automatically when Docker is unavailable.
 */
@Testcontainers(disabledWithoutDocker = true)
class PostgresPgvectorMigrationIT {

    private static final DockerImageName PGVECTOR =
            DockerImageName.parse("pgvector/pgvector:pg16").asCompatibleSubstituteFor("postgres");

    @Container
    @SuppressWarnings("resource")
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(PGVECTOR)
            .withDatabaseName("quilore")
            .withUsername("quilore")
            .withPassword("quilore_test");

    @Test
    void flywayCreatesPgvectorSchemaOnTestcontainers() throws Exception {
        Assumptions.assumeTrue(
                DockerClientFactory.instance().isDockerAvailable(),
                "Docker unavailable — use LocalPostgresPgvectorMigrationIT / prove-pgvector-migrations.sh");

        Flyway.configure()
                .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                .locations("classpath:db/migration")
                .load()
                .migrate();

        try (Connection conn = DriverManager.getConnection(
                postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())) {
            PostgresMigrationAssertions.assertSchema(conn);
        }
    }
}
