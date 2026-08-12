package com.quilore.security;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PermissionAuditRepository extends JpaRepository<PermissionAuditEntity, UUID> {
    List<PermissionAuditEntity> findTop200ByOrderByCreatedAtAsc();
}
