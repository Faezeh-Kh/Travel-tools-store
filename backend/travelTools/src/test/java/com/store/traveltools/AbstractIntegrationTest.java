package com.store.traveltools;

import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Deliberately does not use {@code @Testcontainers}/{@code @Container}: those annotations stop the
 * container in each test class's {@code afterAll}, which breaks it for every other test class that
 * shares this static field and whose Spring context (cached by identical {@code @DataJpaTest} config)
 * keeps pointing at the now-dead container's port. Starting it once here and never stopping it — the
 * documented Testcontainers "singleton container" pattern — keeps one Postgres instance alive for the
 * whole test run; Ryuk (Testcontainers' own reaper container) removes it once the JVM exits.
 */
public abstract class AbstractIntegrationTest {

    @ServiceConnection
    static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18-alpine");

    static {
        postgres.start();
    }
}
