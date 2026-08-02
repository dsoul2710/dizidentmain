package com.clinic.hms.controller;

import com.clinic.hms.service.RevenueReportService;
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
@RequestMapping("/api/reports/revenue")
@RequiredArgsConstructor
@PreAuthorize("@authorizationService.hasAnyScope('billing:read', 'billing:manage') or hasAnyRole('SUPER_ADMIN', 'SUPERADMIN', 'ORG_HOSPITAL', 'ORG', 'DOCTOR')")
public class RevenueReportController {

    private final RevenueReportService revenueReportService;

    @GetMapping("/daywise")
    public Map<String, Object> daywiseCollections(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        return revenueReportService.daywiseCollections(fromDate, toDate);
    }

    @GetMapping("/doctor")
    public List<Map<String, Object>> doctorWiseRevenue(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        return revenueReportService.doctorWiseRevenue(fromDate, toDate);
    }

    @GetMapping("/treatments")
    public Map<String, Object> treatmentWiseRevenue(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) Long doctorId,
            @RequestParam(required = false) String categoryKey
    ) {
        return revenueReportService.treatmentWiseRevenue(fromDate, toDate, doctorId, categoryKey);
    }

    @GetMapping("/outstanding")
    public Map<String, Object> outstandingBills(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) Long doctorId
    ) {
        return revenueReportService.outstandingBills(fromDate, toDate, doctorId);
    }
}
