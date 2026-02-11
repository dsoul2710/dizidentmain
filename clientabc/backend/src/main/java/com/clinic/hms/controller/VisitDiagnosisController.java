// src/main/java/com/clinic/hms/controller/VisitDiagnosisController.java
package com.clinic.hms.controller;

import com.clinic.hms.dto.request.VisitDiagnosisRequest;
import com.clinic.hms.dto.response.VisitDiagnosisResponse;
import com.clinic.hms.entity.Visit;
import com.clinic.hms.repository.VisitRepository;
import com.clinic.hms.service.VisitDiagnosisService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class VisitDiagnosisController {

    private final VisitDiagnosisService visitDiagnosisService;
    private final VisitRepository visitRepository;   // ✅ add this

    @Value("${file.upload.base-dir}")
    private String baseUploadDir;

    // ---------------- EXISTING SAVE DIAGNOSIS ----------------
    @PostMapping("/visits/diagnosis")
    public ResponseEntity<VisitDiagnosisResponse> saveDiagnosis(
            @RequestBody VisitDiagnosisRequest request) {

        Visit visit = visitDiagnosisService.saveDiagnosis(request);
        return ResponseEntity.ok(new VisitDiagnosisResponse(visit.getId()));
    }

    // ---------------- DIAGNOSIS DETAIL FOR FRONTEND ----------------
    @GetMapping("/visits/{visitId}/diagnosis-detail")
    public ResponseEntity<VisitDiagnosisRequest> getDiagnosisDetail(@PathVariable Long visitId) {
        Optional<Visit> visitOpt = visitRepository.findById(visitId);
        if (visitOpt.isEmpty()) {
            // Return empty payload so frontend doesn’t see a 404
            return ResponseEntity.ok(new VisitDiagnosisRequest());
        }

        Visit visit = visitOpt.get();

        VisitDiagnosisRequest dto = new VisitDiagnosisRequest();
        dto.setVisitId(visit.getId());
        dto.setPatientUserId(visit.getPatient().getId());
        dto.setOdontogramMode(visit.getOdontogramMode());
        dto.setSelectedTeeth(parseCsv(visit.getOdontogramTeethJson()));
        dto.setFreeDescription(visit.getDiagnosisFreeText());
        dto.setFinalDescription(visit.getDiagnosisFinalText());
        dto.setReportType(visit.getDiagnosisReportType());
        dto.setReportNote(visit.getDiagnosisReportNote());

        return ResponseEntity.ok(dto);
    }

    // ---------------- UPLOAD DIAGNOSIS REPORT FILES (already had) ----------------
    @PostMapping(value = "/visits/{visitId}/diagnosis-report", consumes = "multipart/form-data")
    public ResponseEntity<Void> uploadDiagnosisReports(
            @PathVariable Long visitId,
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam(value = "reportType", required = false) String reportType,
            @RequestParam(value = "reportNote", required = false) String reportNote
    ) throws IOException {

        if (files == null || files.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        Path diagnosisRoot = Paths.get(baseUploadDir, "Diagnosisreport");
        Path visitDir = diagnosisRoot.resolve("visit-" + visitId);

        Files.createDirectories(visitDir);

        long existingCount = 0;
        try (Stream<Path> stream = Files.list(visitDir)) {
            existingCount = stream.filter(Files::isRegularFile).count();
        }
        long newCount = files.stream().filter(f -> f != null && !f.isEmpty()).count();
        if (existingCount + newCount > 5) {
            return ResponseEntity.badRequest().build();
        }

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss");

        for (MultipartFile file : files) {
            if (file.isEmpty()) continue;

            String originalName = StringUtils.cleanPath(file.getOriginalFilename());
            String ext = "";
            int dot = originalName.lastIndexOf('.');
            if (dot >= 0) {
                ext = originalName.substring(dot);
            }

            String prefix = "diag_" + LocalDateTime.now().format(fmt);
            if (reportType != null && !reportType.isBlank()) {
                prefix += "_" + reportType;
            }

            Path target = visitDir.resolve(prefix + ext);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        }

        // later you can persist metadata (reportType/reportNote) in DB if needed
        return ResponseEntity.ok().build();
    }

    // ---------------- LIST EXISTING REPORT FILES ----------------
    @GetMapping("/visits/{visitId}/diagnosis-report-files")
    public ResponseEntity<List<String>> listDiagnosisReportFiles(@PathVariable Long visitId) throws IOException {
        Path visitDir = Paths.get(baseUploadDir, "Diagnosisreport", "visit-" + visitId);

        if (!Files.exists(visitDir)) {
            // No uploads yet; respond with empty list (200)
            return ResponseEntity.ok(Collections.emptyList());
        }

        try (Stream<Path> stream = Files.list(visitDir)) {
            List<String> names = stream
                    .filter(Files::isRegularFile)
                    .map(p -> p.getFileName().toString())
                    .collect(Collectors.toList());
            return ResponseEntity.ok(names);
        }
    }

    // ---------------- VIEW SINGLE REPORT FILE (like your id-file example) ----------------
    @GetMapping("/visits/{visitId}/diagnosis-report-file")
    public ResponseEntity<Resource> viewDiagnosisReportFile(
            @PathVariable Long visitId,
            @RequestParam("fileName") String fileName
    ) throws IOException {

        Path filePath = Paths.get(baseUploadDir, "Diagnosisreport", "visit-" + visitId, fileName);

        if (!Files.exists(filePath)) {
            return ResponseEntity.notFound().build();
        }

        Resource resource = new UrlResource(filePath.toUri());
        String contentType = Files.probeContentType(filePath);
        if (contentType == null) {
            contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"" + filePath.getFileName().toString() + "\""
                )
                .body(resource);
    }

    // ---------------- HELPER: parseCsv ----------------
    private List<String> parseCsv(String csv) {
        if (csv == null || csv.isBlank()) {
            return Collections.emptyList();
        }
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
    }
}
