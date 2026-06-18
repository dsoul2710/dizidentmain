package com.clinic.hms.controller;

import com.clinic.hms.dto.request.VisitCreateRequest;
import com.clinic.hms.dto.request.VisitUpdateRequest;
import com.clinic.hms.dto.request.VisitDiagnosisRequest;
import com.clinic.hms.dto.request.VisitExamItemRequest;
import com.clinic.hms.dto.response.VisitResponse;
import com.clinic.hms.dto.response.VisitDiagnosisResponse;
import com.clinic.hms.dto.response.VisitExamItemResponse;
import com.clinic.hms.entity.Visit;
import com.clinic.hms.repository.VisitRepository;
import com.clinic.hms.service.VisitService;
import com.clinic.hms.service.VisitDiagnosisService;
import com.clinic.hms.service.VisitExamService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

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
public class VisitController extends BaseController {

    private final VisitService visitService;
    private final VisitDiagnosisService visitDiagnosisService;
    private final VisitExamService visitExamService;
    private final VisitRepository visitRepository;

    @Value("${file.upload.base-dir}")
    private String baseUploadDir;

    // GET /api/patients/{patientUserId}/visits
    @GetMapping("/patients/{patientUserId}/visits")
    public List<VisitResponse> listForPatient(@PathVariable Long patientUserId) {
        return visitService.listVisitsForPatient(patientUserId);
    }

    // POST /api/patients/{patientUserId}/visits/auto-create
    @PostMapping("/patients/{patientUserId}/visits/auto-create")
    public VisitResponse autoCreateVisit(@PathVariable Long patientUserId) {
        return visitService.autoCreateVisit(patientUserId);
    }

    // POST /api/visits
    @PostMapping("/visits")
    @ResponseStatus(HttpStatus.CREATED)
    public VisitResponse createVisit(@RequestBody VisitCreateRequest req) {
        return visitService.createVisit(req);
    }

    // PUT /api/visits/{visitId}
    @PutMapping("/visits/{visitId}")
    public VisitResponse updateVisit(
            @PathVariable Long visitId,
            @RequestBody VisitUpdateRequest req
    ) {
        return visitService.updateVisit(visitId, req);
    }

    // ---------------- DIAGNOSIS ENDPOINTS ----------------

    @PostMapping("/visits/diagnosis")
    public ResponseEntity<VisitDiagnosisResponse> saveDiagnosis(
            @RequestBody VisitDiagnosisRequest request) {
        Visit visit = visitDiagnosisService.saveDiagnosis(request);
        return ResponseEntity.ok(new VisitDiagnosisResponse(visit.getId()));
    }

    @GetMapping("/visits/{visitId}/diagnosis-detail")
    public ResponseEntity<VisitDiagnosisRequest> getDiagnosisDetail(@PathVariable Long visitId) {
        Optional<Visit> visitOpt = visitRepository.findById(visitId);
        if (visitOpt.isEmpty()) {
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

    @PostMapping(value = "/visits/{visitId}/diagnosis-report", consumes = "multipart/form-data")
    public ResponseEntity<Void> uploadDiagnosisReports(
            @PathVariable Long visitId,
            @RequestPart("files") List<MultipartFile> files,
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

        return ResponseEntity.ok().build();
    }

    @GetMapping("/visits/{visitId}/diagnosis-report-files")
    public ResponseEntity<List<String>> listDiagnosisReportFiles(@PathVariable Long visitId) throws IOException {
        Path visitDir = Paths.get(baseUploadDir, "Diagnosisreport", "visit-" + visitId);

        if (!Files.exists(visitDir)) {
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

    // ---------------- CLINICAL EXAM ITEMS ENDPOINTS ----------------

    @GetMapping("/visits/{visitId}/exam-items")
    public ResponseEntity<List<VisitExamItemResponse>> getForVisit(
            @PathVariable Long visitId
    ) {
        return ResponseEntity.ok(visitExamService.getVisitExamItems(visitId));
    }

    @PostMapping("/visits/{visitId}/exam-items")
    public ResponseEntity<VisitExamItemResponse> saveForVisit(
            @PathVariable Long visitId,
            @RequestBody VisitExamItemRequest request
    ) {
        request.setVisitId(visitId);
        return ResponseEntity.ok(visitExamService.saveOrUpdate(request));
    }

    // ---------------- HELPER METHODS ----------------

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
