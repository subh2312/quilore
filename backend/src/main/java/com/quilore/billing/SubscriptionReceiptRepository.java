package com.quilore.billing;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SubscriptionReceiptRepository extends JpaRepository<SubscriptionReceiptEntity, UUID> {

    Optional<SubscriptionReceiptEntity> findByStoreAndTransactionId(String store, String transactionId);

    List<SubscriptionReceiptEntity> findByUserIdAndStatusOrderByCreatedAtDesc(UUID userId, String status);
}
