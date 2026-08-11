package com.quilore.sync;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/sync")
public class SyncController {

    private final SyncService syncService;

    public SyncController(SyncService syncService) {
        this.syncService = syncService;
    }

    @GetMapping("/{userId}/pull")
    public ResponseEntity<?> pull(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "0") long lastPulledAt
    ) {
        return ResponseEntity.ok(syncService.pull(userId, lastPulledAt));
    }

    @PostMapping("/{userId}/push")
    public ResponseEntity<?> push(@PathVariable UUID userId, @RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> mutations = (List<Map<String, Object>>) body.getOrDefault("mutations", List.of());
        return ResponseEntity.ok(syncService.push(userId, mutations));
    }

    @GetMapping("/{userId}/status")
    public ResponseEntity<?> status(@PathVariable UUID userId) {
        var last = syncService.lastSync(userId);
        return ResponseEntity.ok(Map.of(
                "userId", userId.toString(),
                "lastSuccessfulSync", last == null ? "" : last.toString()
        ));
    }
}
