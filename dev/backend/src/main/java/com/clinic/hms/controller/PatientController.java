package com.clinic.hms.controller;

import com.clinic.hms.dto.request.PatientCreateRequest;
import com.clinic.hms.dto.request.PatientUpdateRequest;
import com.clinic.hms.dto.response.PatientResponse;
import com.clinic.hms.dto.response.PagedResponse;
import com.clinic.hms.service.PatientService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@RestController
@RequestMapping("/api/patients")
@RequiredArgsConstructor
public class PatientController {

    private final PatientService patientService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PatientResponse create(@RequestBody PatientCreateRequest req) {
        return patientService.createPatient(req);
    }

    /**
     * Platform-wide patient lookup by unique ID (PAT-XXXXXX).
     * Used by the "Import Existing Patient" feature.
     */
    @GetMapping("/lookup")
    public ResponseEntity<PatientResponse> lookupByUniqueId(@RequestParam("uniqueId") String uniqueId) {
        PatientResponse found = patientService.lookupPatientByUniqueId(uniqueId);
        if (found == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(found);
    }

    /**
     * Import an existing patient into the caller's org/doctor scope.
     * Creates PatientOrgMapping and/or PatientDoctorMapping.
     */
    @PostMapping("/import")
    public ResponseEntity<PatientResponse> importPatient(@RequestBody ImportPatientRequest req) {
        PatientResponse result = patientService.importExistingPatient(
                req.getPatientUserId(), req.getAssignedDoctorId());
        return ResponseEntity.ok(result);
    }

    @lombok.Data
    static class ImportPatientRequest {
        private Long patientUserId;
        private Long assignedDoctorId; // optional
    }

    @GetMapping
    public ResponseEntity<?> list(
            @RequestParam(value = "doctorid", required = false) Long doctorId,
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "pagesize", required = false) Integer pageSize,
            @RequestParam(value = "search", required = false) String search
    ) {
        boolean usePaging = page != null || pageSize != null || (search != null && !search.isBlank());
        if (!usePaging) {
            List<PatientResponse> items = patientService.listPatients(doctorId);
            return ResponseEntity.ok(items);
        }
        int resolvedPage = page == null ? 1 : page;
        int resolvedPageSize = pageSize == null ? 10 : pageSize;
        PagedResponse<PatientResponse> response =
                patientService.listPatientsPaged(doctorId, search, resolvedPage, resolvedPageSize);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public PatientResponse getById(@PathVariable Long id) {
        return patientService.getPatientById(id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        patientService.deletePatient(id);
    }

    @PutMapping("/{id}")
    public PatientResponse update(@PathVariable Long id,
                                  @RequestBody PatientUpdateRequest req) {
        return patientService.updatePatient(id, req);
    }

    // POST /api/patients/{id}/upload-id
    @PostMapping(value = "/{id}/upload-id", consumes = "multipart/form-data")
    public ResponseEntity<Void> uploadId(
            @PathVariable Long id,
            @RequestPart("file") MultipartFile file
    ) throws IOException {
        patientService.uploadIdInsurance(id, file);
        return ResponseEntity.ok().build();
    }

    // POST /api/patients/{id}/upload-reports
    @PostMapping(value = "/{id}/upload-reports", consumes = "multipart/form-data")
    public ResponseEntity<Void> uploadReports(
            @PathVariable Long id,
            @RequestPart(value = "files", required = false) List<MultipartFile> files,
            @RequestPart(value = "file", required = false) MultipartFile file
    ) throws IOException {
        if ((files == null || files.isEmpty()) && (file == null || file.isEmpty())) {
            return ResponseEntity.badRequest().build();
        }
        if (files == null || files.isEmpty()) {
            files = List.of(file);
        }
        patientService.uploadPastReports(id, files);
        return ResponseEntity.ok().build();
    }

    // GET /api/patients/{id}/reports-files
    @GetMapping("/{id}/reports-files")
    public ResponseEntity<List<String>> listReportsFiles(@PathVariable Long id) {
        return ResponseEntity.ok(patientService.listReportFileNames(id));
    }

    @GetMapping("/{id}/id-file")
    public ResponseEntity<Resource> viewIdFile(@PathVariable Long id) throws Exception {
        String filePath = patientService.getIdInsuranceFilePath(id);
        if (filePath == null || filePath.isBlank()) {
            return ResponseEntity.notFound().build();
        }

        Path path = Paths.get(filePath);
        if (!Files.exists(path)) {
            return ResponseEntity.notFound().build();
        }

        Resource resource = new UrlResource(path.toUri());
        String contentType = Files.probeContentType(path);
        if (contentType == null) {
            contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"" + path.getFileName().toString() + "\"")
                .body(resource);
    }

    @GetMapping("/{id}/reports-file")
    public ResponseEntity<Resource> viewReportsFile(
            @PathVariable Long id,
            @RequestParam(value = "fileName", required = false) String fileName
    ) throws Exception {
        Path path = patientService.resolveReportFilePath(id, fileName);
        if (!Files.exists(path)) {
            return ResponseEntity.notFound().build();
        }

        Resource resource = new UrlResource(path.toUri());
        String contentType = Files.probeContentType(path);
        if (contentType == null) {
            contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"" + path.getFileName().toString() + "\"")
                .body(resource);
    }
}
