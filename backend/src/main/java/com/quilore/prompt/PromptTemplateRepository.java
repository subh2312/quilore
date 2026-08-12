package com.quilore.prompt;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PromptTemplateRepository extends JpaRepository<PromptTemplateEntity, UUID> {
    List<PromptTemplateEntity> findByKeyOrderByVersionAsc(String key);
    Optional<PromptTemplateEntity> findByKeyAndVersion(String key, int version);
    Optional<PromptTemplateEntity> findByKeyAndActiveTrue(String key);
    Optional<PromptTemplateEntity> findTopByKeyOrderByVersionDesc(String key);
    List<PromptTemplateEntity> findAllByOrderByCreatedAtAsc();
}
