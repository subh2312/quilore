package com.quilore.content;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@Service
public class ExerciseContentService {

    private static final Pattern HTTP_URL = Pattern.compile("^https?://.+", Pattern.CASE_INSENSITIVE);

    private final ExerciseRepository exerciseRepository;
    private final ExerciseRevisionRepository revisionRepository;
    private final ObjectMapper objectMapper;

    public ExerciseContentService(
            ExerciseRepository exerciseRepository,
            ExerciseRevisionRepository revisionRepository,
            ObjectMapper objectMapper
    ) {
        this.exerciseRepository = exerciseRepository;
        this.revisionRepository = revisionRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public ExerciseContent upsert(String slug, String name, String instructions, String coachingCues,
                                  String demoAssetUrl, boolean publish, String actor) {
        if (demoAssetUrl != null && !demoAssetUrl.isBlank() && !HTTP_URL.matcher(demoAssetUrl).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid demo asset URL");
        }
        ExerciseEntity entity = exerciseRepository.findBySlug(slug).orElseGet(ExerciseEntity::new);
        boolean creating = entity.getId() == null;
        if (creating) {
            entity.setSlug(slug);
            entity.setVersion(1);
        } else {
            entity.setVersion(entity.getVersion() + 1);
        }
        entity.setName(name);
        entity.setInstructions(instructions == null ? "" : instructions);
        entity.setCoachingCues(coachingCues == null ? "" : coachingCues);
        entity.setDemoAssetUrl(blankToNull(demoAssetUrl));
        entity.setPublished(publish);
        entity.setUpdatedBy(actor);
        entity.setUpdatedAt(Instant.now());
        ExerciseEntity saved = exerciseRepository.save(entity);

        ExerciseRevisionEntity revision = new ExerciseRevisionEntity();
        revision.setExerciseId(saved.getId());
        revision.setVersion(saved.getVersion());
        revision.setActor(actor);
        revision.setSnapshot(writeSnapshot(saved));
        revisionRepository.save(revision);

        return toContent(saved);
    }

    @Transactional(readOnly = true)
    public List<ExerciseContent> listPublished() {
        return exerciseRepository.findByPublishedTrue().stream().map(this::toContent).toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> auditTrail() {
        return revisionRepository.findAllByOrderByCreatedAtAsc().stream()
                .map(rev -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("exerciseId", rev.getExerciseId().toString());
                    row.put("version", rev.getVersion());
                    row.put("actor", rev.getActor());
                    row.put("published", readPublished(rev.getSnapshot()));
                    row.put("at", rev.getCreatedAt().toString());
                    return row;
                })
                .toList();
    }

    private ExerciseContent toContent(ExerciseEntity entity) {
        return new ExerciseContent(
                entity.getId(),
                entity.getSlug(),
                entity.getName(),
                entity.getInstructions(),
                entity.getCoachingCues(),
                entity.getDemoAssetUrl(),
                entity.isPublished(),
                entity.getVersion(),
                entity.getUpdatedBy(),
                entity.getUpdatedAt()
        );
    }

    private String writeSnapshot(ExerciseEntity entity) {
        try {
            return objectMapper.writeValueAsString(toContent(entity).toMap());
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to serialize exercise snapshot", ex);
        }
    }

    private boolean readPublished(String snapshot) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> map = objectMapper.readValue(snapshot, Map.class);
            return Boolean.TRUE.equals(map.get("published"));
        } catch (Exception ex) {
            return false;
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
