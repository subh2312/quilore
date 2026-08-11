package com.quilore.notify;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AiJobRepository extends JpaRepository<AiJobEntity, UUID> {
}
