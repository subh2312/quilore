package com.quilore.prompt;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class PromptTemplateController {

    private final PromptTemplateService service;

    public PromptTemplateController(PromptTemplateService service) {
        this.service = service;
    }

    @GetMapping("/admin/prompts/{key}/active")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> active(@PathVariable String key) {
        var p = service.getActive(key);
        return ResponseEntity.ok(Map.of(
                "key", p.key(),
                "version", p.version(),
                "modelHint", p.modelHint(),
                "body", p.body()
        ));
    }

    @PostMapping("/admin/prompts")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> create(@RequestBody Map<String, String> body, Authentication auth) {
        var p = service.create(body.get("key"), body.get("body"), body.get("modelHint"), auth.getName());
        return ResponseEntity.ok(Map.of("key", p.key(), "version", p.version()));
    }

    @PostMapping("/admin/prompts/{key}/activate/{version}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> activate(@PathVariable String key, @PathVariable int version, Authentication auth) {
        var p = service.activate(key, version, auth.getName());
        return ResponseEntity.ok(Map.of("key", p.key(), "version", p.version(), "active", true));
    }

    @PostMapping("/admin/prompts/{key}/rollback/{version}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> rollback(@PathVariable String key, @PathVariable int version, Authentication auth) {
        var p = service.rollback(key, version, auth.getName());
        return ResponseEntity.ok(Map.of("key", p.key(), "version", p.version(), "active", true));
    }

    @GetMapping("/admin/prompts/audit")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> audit() {
        return ResponseEntity.ok(service.auditTrail());
    }
}
