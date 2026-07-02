package com.clinic.hms.controller;

import com.clinic.hms.service.PatientReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/reports/patients")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class PatientReportController {

    private final PatientReportService patientReportService;

    @GetMapping("/age")
    public Map<String, Object> ageReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) String ageGroup,
            @RequestParam(required = false) Long doctorId,
            @RequestParam(required = false) String gender
    ) {
        return patientReportService.ageReport(fromDate, toDate, ageGroup, doctorId, gender);
    }

    @GetMapping("/area")
    public Map<String, Object> areaReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) String area,
            @RequestParam(required = false) Long doctorId,
            @RequestParam(required = false, defaultValue = "all") String newExisting
    ) {
        return patientReportService.areaReport(fromDate, toDate, area, doctorId, newExisting);
    }

    @GetMapping("/birthdays")
    public Map<String, Object> birthdayReport(
            @RequestParam(defaultValue = "month") String scope,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String ageRange,
            @RequestParam(required = false, defaultValue = "true") boolean activeOnly
    ) {
        return patientReportService.birthdayReport(scope, date, ageRange, activeOnly);
    }

    @GetMapping("/gender")
    public Map<String, Object> genderReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) String ageRange,
            @RequestParam(required = false) String area
    ) {
        return patientReportService.genderReport(fromDate, toDate, ageRange, area);
    }

    @GetMapping("/active")
    public Map<String, Object> activeReport(
            @RequestParam(defaultValue = "12") int windowMonths,
            @RequestParam(required = false) Long doctorId,
            @RequestParam(required = false) String area,
            @RequestParam(required = false) String ageRange,
            @RequestParam(required = false) String gender
    ) {
        return patientReportService.activeReport(windowMonths, doctorId, area, ageRange, gender);
    }

    @GetMapping("/inactive")
    public Map<String, Object> inactiveReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate lastVisitBefore,
            @RequestParam(required = false) Long doctorId,
            @RequestParam(required = false) String area,
            @RequestParam(required = false) String ageRange,
            @RequestParam(required = false) String gender
    ) {
        return patientReportService.inactiveReport(lastVisitBefore, doctorId, area, ageRange, gender);
    }

    @GetMapping("/referrals")
    public Map<String, Object> referralReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) String source,
            @RequestParam(required = false, defaultValue = "all") String newExisting,
            @RequestParam(required = false) Long doctorId
    ) {
        return patientReportService.referralReport(fromDate, toDate, source, newExisting, doctorId);
    }

    @GetMapping("/new")
    public Map<String, Object> newPatientsReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) Long doctorId,
            @RequestParam(required = false) String referral,
            @RequestParam(required = false) String area,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String ageRange
    ) {
        return patientReportService.newPatientsReport(fromDate, toDate, doctorId, referral, area, gender, ageRange);
    }

    @GetMapping("/master")
    public Map<String, Object> masterReport(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String ageRange,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String area,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate firstVisitFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate firstVisitTo,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate lastVisitFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate lastVisitTo,
            @RequestParam(required = false) String referral,
            @RequestParam(required = false, defaultValue = "all") String status
    ) {
        return patientReportService.masterReport(search, ageRange, gender, area,
                firstVisitFrom, firstVisitTo, lastVisitFrom, lastVisitTo, referral, status);
    }
}
