package com.wash.laundry_app.carpettype;

import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@AllArgsConstructor
public class CarpetTypeController {

    private final CarpetTypeService carpetTypeService;

    // ─── ADMIN endpoints (secured by /admin/** prefix in SecurityConfig) ──────

    @GetMapping("/admin/carpet-types")
    public ResponseEntity<List<CarpetTypeDTO>> getAll() {
        return ResponseEntity.ok(carpetTypeService.getAll());
    }

    @PostMapping("/admin/carpet-types")
    public ResponseEntity<CarpetTypeDTO> create(@Valid @RequestBody CarpetTypeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(carpetTypeService.create(request));
    }

    @PutMapping("/admin/carpet-types/{id}")
    public ResponseEntity<CarpetTypeDTO> update(
            @PathVariable Long id,
            @Valid @RequestBody CarpetTypeRequest request) {
        return ResponseEntity.ok(carpetTypeService.update(id, request));
    }

    @DeleteMapping("/admin/carpet-types/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        carpetTypeService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ─── LIVREUR endpoint (secured by /livreur/** prefix in SecurityConfig) ───

    @GetMapping("/livreur/carpet-types/active")
    public ResponseEntity<List<CarpetTypeDTO>> getActive() {
        return ResponseEntity.ok(carpetTypeService.getActive());
    }
}
