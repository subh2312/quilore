package com.quilore.billing;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface UserEntitlementRepository extends JpaRepository<UserEntitlementEntity, UUID> {
}
