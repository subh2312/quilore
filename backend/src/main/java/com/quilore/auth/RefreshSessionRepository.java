package com.quilore.auth;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface RefreshSessionRepository extends JpaRepository<RefreshSessionEntity, UUID> {
    Optional<RefreshSessionEntity> findByTokenHash(String tokenHash);
}
