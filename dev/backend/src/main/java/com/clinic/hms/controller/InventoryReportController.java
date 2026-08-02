package com.clinic.hms.controller;

import com.clinic.hms.service.InventoryReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reports/inventory")
@RequiredArgsConstructor
@PreAuthorize("@authorizationService.hasAnyScope('inventory:read', 'inventory:edit') or hasAnyRole('SUPER_ADMIN', 'SUPERADMIN', 'ORG_HOSPITAL', 'ORG', 'DOCTOR')")
public class InventoryReportController {

    private final InventoryReportService inventoryReportService;

    @GetMapping("/low-stock")
    public List<Map<String, Object>> lowStock(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        return inventoryReportService.lowStock(fromDate, toDate);
    }

    @GetMapping("/consumption")
    public List<Map<String, Object>> consumption(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        return inventoryReportService.consumption(fromDate, toDate);
    }

    @GetMapping("/purchase")
    public List<Map<String, Object>> purchaseSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        return inventoryReportService.purchaseSummary(fromDate, toDate);
    }

    @GetMapping("/valuation")
    public Map<String, Object> valuation() {
        return inventoryReportService.valuation();
    }
}
