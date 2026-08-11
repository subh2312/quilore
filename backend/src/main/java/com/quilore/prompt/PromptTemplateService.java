package com.quilore.prompt;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class PromptTemplateService {

    public record PromptVersion(String key, int version, String modelHint, String body, String createdBy, Instant createdAt) {}

    private final PromptTemplateRepository repository;

    public PromptTemplateService(PromptTemplateRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public PromptVersion create(String key, String body, String modelHint, String actor) {
        int nextVersion = repository.findTopByKeyOrderByVersionDesc(key)
                .map(e -> e.getVersion() + 1)
                .orElse(1);
        PromptTemplateEntity entity = new PromptTemplateEntity();
        entity.setKey(key);
        entity.setVersion(nextVersion);
        entity.setModelHint(modelHint == null ? "default" : modelHint);
        entity.setBody(body);
        entity.setActive(false);
        entity.setCreatedBy(actor);
        return toVersion(repository.save(entity));
    }

    @Transactional
    public PromptVersion activate(String key, int version, String actor) {
        PromptTemplateEntity target = repository.findByKeyAndVersion(key, version)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Prompt version not found"));
        for (PromptTemplateEntity entity : repository.findByKeyOrderByVersionAsc(key)) {
            entity.setActive(entity.getVersion() == version);
        }
        return toVersion(target);
    }

    @Transactional
    public PromptVersion rollback(String key, int version, String actor) {
        return activate(key, version, actor + " (rollback)");
    }

    @Transactional(readOnly = true)
    public PromptVersion getActive(String key) {
        return repository.findByKeyAndActiveTrue(key)
                .map(this::toVersion)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No active prompt"));
    }

    @Transactional(readOnly = true)
    public List<PromptVersion> history(String key) {
        return repository.findByKeyOrderByVersionAsc(key).stream().map(this::toVersion).toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> auditTrail() {
        List<Map<String, Object>> audit = new ArrayList<>();
        for (PromptTemplateEntity entity : repository.findAllByOrderByCreatedAtAsc()) {
            Map<String, Object> create = new LinkedHashMap<>();
            create.put("actor", entity.getCreatedBy());
            create.put("action", "CREATE");
            create.put("key", entity.getKey());
            create.put("version", entity.getVersion());
            create.put("at", entity.getCreatedAt().toString());
            audit.add(create);
            if (entity.isActive()) {
                Map<String, Object> activate = new LinkedHashMap<>();
                activate.put("actor", entity.getCreatedBy());
                activate.put("action", "ACTIVATE");
                activate.put("key", entity.getKey());
                activate.put("version", entity.getVersion());
                activate.put("at", entity.getCreatedAt().toString());
                audit.add(activate);
            }
        }
        return audit;
    }

    private PromptVersion toVersion(PromptTemplateEntity entity) {
        return new PromptVersion(
                entity.getKey(),
                entity.getVersion(),
                entity.getModelHint(),
                entity.getBody(),
                entity.getCreatedBy(),
                entity.getCreatedAt()
        );
    }
}
