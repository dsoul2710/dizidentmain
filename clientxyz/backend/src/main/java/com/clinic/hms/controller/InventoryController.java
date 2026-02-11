// src/main/java/com/clinic/hms/controller/InventoryController.java
package com.clinic.hms.controller;

import com.clinic.hms.dto.request.AutoStockAdjustmentRequest;
import com.clinic.hms.dto.request.InventoryItemCreateRequest;
import com.clinic.hms.dto.request.InventoryMovementRequest;
import com.clinic.hms.dto.request.TreatmentTemplateRequest;
import com.clinic.hms.dto.response.InventoryItemResponse;
import com.clinic.hms.dto.response.InventoryMovementResponse;
import com.clinic.hms.dto.response.TreatmentTemplateResponse;
import com.clinic.hms.dto.response.VendorResponse;
import com.clinic.hms.service.InventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class InventoryController {

    private final InventoryService inventoryService;

    // ---------- ITEMS ----------

    @GetMapping("/inventory/items")
    public ResponseEntity<List<InventoryItemResponse>> getItems() {
        return ResponseEntity.ok(inventoryService.getAllItems());
    }

    @PostMapping("/inventory/items")
    public ResponseEntity<InventoryItemResponse> createItem(
            @RequestBody InventoryItemCreateRequest request) {
        return ResponseEntity.ok(inventoryService.createItem(request));
    }

    @DeleteMapping("/inventory/items/{id}")
    public ResponseEntity<Void> deleteItem(@PathVariable Long id) {
        inventoryService.deleteItem(id);
        return ResponseEntity.noContent().build();
    }

    // ---------- MOVEMENTS (daily ledger) ----------

    // List all movements (optional, if you need it on UI)
    @GetMapping("/inventory/movements")
    public ResponseEntity<List<InventoryMovementResponse>> getMovements() {
        return ResponseEntity.ok(inventoryService.getAllMovements());
    }

    // 🔴 IMPORTANT: This must match your frontend URL
    // POST http://localhost:8080/api/inventory/movements
    @PostMapping("/inventory/movements")
    public ResponseEntity<InventoryItemResponse> recordMovement(
            @RequestBody InventoryMovementRequest request) {
        return ResponseEntity.ok(inventoryService.recordMovement(request));
    }

    // ---------- TREATMENT TEMPLATES ----------

    @GetMapping("/inventory/treatment-templates")
    public ResponseEntity<List<TreatmentTemplateResponse>> getTemplates() {
        return ResponseEntity.ok(inventoryService.getAllTemplates());
    }

    @PostMapping("/inventory/treatment-templates")
    public ResponseEntity<TreatmentTemplateResponse> saveTemplate(
            @RequestBody TreatmentTemplateRequest request) {
        return ResponseEntity.ok(inventoryService.saveTemplate(request));
    }

    @DeleteMapping("/inventory/treatment-templates/{id}")
    public ResponseEntity<Void> deleteTemplate(@PathVariable Long id) {
        inventoryService.deleteTemplate(id);
        return ResponseEntity.noContent().build();
    }

    // ---------- AUTO STOCK ADJUSTMENT (by template) ----------

    @PostMapping("/inventory/auto-adjustments")
    public ResponseEntity<Void> applyAutoAdjustment(
            @RequestBody AutoStockAdjustmentRequest request) {
        inventoryService.applyAutoAdjustment(request);
        return ResponseEntity.noContent().build();
    }

}
