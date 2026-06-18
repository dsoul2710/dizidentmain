package com.clinic.hms.service;

import com.clinic.hms.dto.request.TreatmentPlanRequest;
import com.clinic.hms.dto.response.TreatmentPlanResponse;
import com.clinic.hms.entity.*;
import com.clinic.hms.repository.PatientRepository;
import com.clinic.hms.repository.VisitRepository;
import com.clinic.hms.repository.VisitTreatmentItemRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TreatmentPlanService {

    private final VisitRepository visitRepository;
    private final VisitTreatmentItemRepository treatmentItemRepository;
    private final PatientRepository patientRepository;
    private final ObjectMapper objectMapper;

    private static final TypeReference<List<String>> LIST_STRING = new TypeReference<>() {};
    private static final TypeReference<List<TreatmentPlanRequest.BillLine>> BILL_LINES =
            new TypeReference<>() {};

    private static final String KEY_OTHERS = "__others";
    private static final String KEY_DESCRIPTION = "__description";
    private static final String KEY_BILLING = "__billing";

    @Transactional(readOnly = true)
    public TreatmentPlanResponse getByVisit(Long visitId) {
        Visit visit = visitRepository.findById(visitId)
                .orElseThrow(() -> new IllegalArgumentException("Visit not found: " + visitId));

        List<VisitTreatmentItem> items = treatmentItemRepository.findByVisitId(visitId);
        TreatmentPlanRequest payload = buildPayload(visit, items);

        return TreatmentPlanResponse.builder()
                .id(null)
                .visitId(visit.getId())
                .patientUserId(visit.getPatient() != null ? visit.getPatient().getId() : null)
                .payload(payload)
                .createdAt(null)
                .updatedAt(null)
                .build();
    }

    @Transactional
    public TreatmentPlanResponse upsert(Long visitId, TreatmentPlanRequest req) {
        req.setVisitId(visitId);
        return saveForPatientOrVisit(req);
    }

    /**
     * Save/update a plan with either a visitId (existing) or patientUserId (auto-create visit),
     * mirroring the workflow used in Examination & Diagnosis.
     */
    @Transactional
    public TreatmentPlanResponse saveForPatientOrVisit(TreatmentPlanRequest req) {
        Visit visit = resolveOrCreateVisit(req);
        LocalDateTime now = LocalDateTime.now();

        // Align with diagnosis: persist odontogram state on Visit
        if (req.getOdontogramMode() != null) {
            visit.setOdontogramMode(req.getOdontogramMode());
        }
        if (req.getSelectedTeeth() != null) {
            String csv = String.join(",", req.getSelectedTeeth());
            visit.setOdontogramTeethJson(csv.isBlank() ? null : csv);
        }
        visit.setUpdatedAt(now);
        visitRepository.save(visit);

        List<VisitTreatmentItem> existingItems = treatmentItemRepository.findByVisitId(visit.getId());
        List<VisitTreatmentItem> merged = mapRequestToItems(req, visit, now, existingItems);
        treatmentItemRepository.saveAll(merged);

        TreatmentPlanRequest payload = buildPayload(visit, merged);
        return TreatmentPlanResponse.builder()
                .id(null)
                .visitId(visit.getId())
                .patientUserId(visit.getPatient() != null ? visit.getPatient().getId() : null)
                .payload(payload)
                .createdAt(now)
                .updatedAt(now)
                .build();
    }

    @Transactional(readOnly = true)
    public TreatmentPlanRequest getDetailPayload(Long visitId) {
        TreatmentPlanResponse response = getByVisit(visitId);
        TreatmentPlanRequest payload = response.getPayload();
        payload.setVisitId(visitId);
        payload.setPatientUserId(response.getPatientUserId());
        return payload;
    }

    private String writeJson(Object obj) {
        try {
            if (obj == null) return null;
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return null;
        }
    }

    private <T> T readJson(String json, TypeReference<T> type, T defaultVal) {
        try {
            if (json == null || json.isBlank()) return defaultVal;
            return objectMapper.readValue(json, type);
        } catch (Exception e) {
            return defaultVal;
        }
    }

    private List<String> parseTeethCsv(String csv) {
        if (csv == null || csv.isBlank()) {
            return Collections.emptyList();
        }
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
    }

    private TreatmentPlanRequest buildPayload(Visit visit, List<VisitTreatmentItem> items) {
        TreatmentPlanRequest dto = new TreatmentPlanRequest();
        dto.setVisitId(visit.getId());
        dto.setPatientUserId(visit.getPatient() != null ? visit.getPatient().getId() : null);
        dto.setOdontogramMode(visit.getOdontogramMode());

        // Defaults from Visit (shared with diagnosis)
        List<String> defaultTeeth = parseTeethCsv(visit.getOdontogramTeethJson());
        dto.setSelectedTeeth(defaultTeeth);

        Map<String, List<String>> selectedProcedures = new LinkedHashMap<>();
        Map<String, List<String>> procedureTeeth = new LinkedHashMap<>();
        Map<String, String> procedureNotes = new LinkedHashMap<>();
        Map<String, List<TreatmentPlanRequest.BillLine>> procedureBillLines = new LinkedHashMap<>();
        Map<String, Double> procedurePrices = new LinkedHashMap<>();

        items = Optional.ofNullable(items).orElse(Collections.emptyList());
        items.forEach(item -> {
            String catKey = Optional.ofNullable(item.getCategoryKey()).orElse("");
            String procName = Optional.ofNullable(item.getProcedureName()).orElse("");
            List<String> teeth = readJson(item.getSelectedTeethJson(), LIST_STRING, Collections.emptyList());

            if (KEY_OTHERS.equals(catKey)) {
                dto.setOthersText(item.getNotes());
            } else if (KEY_DESCRIPTION.equals(catKey)) {
                dto.setDescription(item.getNotes());
            } else if (KEY_BILLING.equals(catKey)) {
                dto.setBillLines(readJson(item.getExtrasJson(), BILL_LINES, Collections.emptyList()));
            } else {
                if (!catKey.isBlank() && !procName.isBlank()) {
                    selectedProcedures.computeIfAbsent(catKey, k -> new ArrayList<>()).add(procName);
                    procedureTeeth.put(catKey + "::" + procName, teeth);
                    if (item.getNotes() != null) {
                        procedureNotes.put(catKey + "::" + procName, item.getNotes());
                        // Keep visit-level tooth selection; only set cariesText once without overriding selectedTeeth
                        if (dto.getCariesText() == null && !item.getNotes().isBlank()) {
                            dto.setCariesText(item.getNotes());
                        }
                    }
                    if (item.getOdontogramMode() != null) {
                        dto.setOdontogramMode(item.getOdontogramMode());
                    }
                    // attach billing stored on this item, if any
                    List<TreatmentPlanRequest.BillLine> lines =
                            readJson(item.getExtrasJson(), BILL_LINES, Collections.emptyList());
                    if (lines != null && !lines.isEmpty()) {
                        procedureBillLines.put(catKey + "::" + procName, lines);
                    }
                    if (item.getPrice() != null) {
                        procedurePrices.put(catKey + "::" + procName, item.getPrice());
                    }
                }
            }
        });

        dto.setSelectedProcedures(selectedProcedures);
        dto.setProcedureTeeth(procedureTeeth);
        dto.setProcedureNotes(procedureNotes);
        dto.setProcedureBillLines(procedureBillLines);
        dto.setProcedurePrices(procedurePrices);
        return dto;
    }

    private Visit resolveOrCreateVisit(TreatmentPlanRequest req) {
        LocalDateTime now = LocalDateTime.now();
        if (req.getVisitId() != null) {
            return visitRepository.findById(req.getVisitId())
                    .orElseThrow(() -> new IllegalArgumentException("Visit not found: " + req.getVisitId()));
        }

        if (req.getPatientUserId() == null) {
            throw new IllegalArgumentException("patientUserId is required when visitId is not provided");
        }

        Patient patient = patientRepository.findById(req.getPatientUserId())
                .orElseThrow(() -> new IllegalArgumentException("Patient user not found: " + req.getPatientUserId()));

        Visit visit = new Visit();
        visit.setPatient(patient);
        visit.setDoctor(null);
        visit.setVisitDate(now);
        visit.setVisitType("NEW");
        visit.setChiefComplaint(null);
        visit.setNotes(null);
        visit.setStatus("OPEN");
        visit.setCreatedAt(now);
        visit.setUpdatedAt(now);
        visit.setOdontogramMode(req.getOdontogramMode());

        if (req.getSelectedTeeth() != null && !req.getSelectedTeeth().isEmpty()) {
            String csv = String.join(",", req.getSelectedTeeth());
            visit.setOdontogramTeethJson(csv);
        }

        return visitRepository.save(visit);
    }

    private List<VisitTreatmentItem> mapRequestToItems(
            TreatmentPlanRequest req,
            Visit visit,
            LocalDateTime now,
            List<VisitTreatmentItem> existingItems
    ) {
        // Index existing by categoryKey::procedureName
        Map<String, VisitTreatmentItem> existingByKey = new LinkedHashMap<>();
        Optional.ofNullable(existingItems).orElse(Collections.emptyList())
                .forEach(item -> existingByKey.put(buildKey(item.getCategoryKey(), item.getProcedureName()), item));

        Map<String, List<String>> selectedProcedures = Optional.ofNullable(req.getSelectedProcedures())
                .orElse(Collections.emptyMap());
        Map<String, List<String>> reqProcedureTeeth = Optional.ofNullable(req.getProcedureTeeth())
                .orElse(Collections.emptyMap());
        Map<String, String> reqProcedureNotes = Optional.ofNullable(req.getProcedureNotes())
                .orElse(Collections.emptyMap());
        Map<String, List<TreatmentPlanRequest.BillLine>> reqProcedureBills = Optional.ofNullable(req.getProcedureBillLines())
                .orElse(Collections.emptyMap());
        Map<String, Double> reqProcedurePrices = Optional.ofNullable(req.getProcedurePrices())
                .orElse(Collections.emptyMap());

        // Upsert procedures
        selectedProcedures.forEach((catKey, procs) -> {
            List<String> normalized = Optional.ofNullable(procs).orElse(Collections.emptyList());
            LinkedHashSet<String> unique = new LinkedHashSet<>(normalized);
            for (String procName : unique) {
                String mapKey = buildKey(catKey, procName);
                VisitTreatmentItem item = existingByKey.get(mapKey);

                // Teeth: keep strictly per-procedure (do not merge plan-level selection)
                List<String> teeth = new ArrayList<>();
                if (reqProcedureTeeth.containsKey(mapKey)) {
                    teeth.addAll(Optional.ofNullable(reqProcedureTeeth.get(mapKey)).orElse(Collections.emptyList()));
                }
                if (teeth.isEmpty() && item != null) {
                    teeth.addAll(readJson(item.getSelectedTeethJson(), LIST_STRING, Collections.emptyList()));
                }
                teeth = new ArrayList<>(new LinkedHashSet<>(
                        teeth.stream()
                                .filter(Objects::nonNull)
                                .map(String::valueOf)
                                .collect(Collectors.toList())
                ));

                boolean hasNoteOverride = reqProcedureNotes.containsKey(mapKey);
                String note = hasNoteOverride
                        ? reqProcedureNotes.get(mapKey)
                        : (item != null ? item.getNotes() : null);

                boolean hasBillOverride = reqProcedureBills.containsKey(mapKey);
                List<TreatmentPlanRequest.BillLine> bills = hasBillOverride
                        ? reqProcedureBills.get(mapKey)
                        : readJson(item != null ? item.getExtrasJson() : null, BILL_LINES, Collections.emptyList());

                Double price = reqProcedurePrices.getOrDefault(mapKey, item != null ? item.getPrice() : null);

                if (item == null) {
                    item = buildItem(
                            visit,
                            catKey,
                            null,
                            procName,
                            note,
                            req.getOdontogramMode(),
                            teeth,
                            writeJson(bills),
                            price,
                            now
                    );
                } else {
                    item.setNotes(note);
                    item.setOdontogramMode(req.getOdontogramMode());
                    item.setSelectedTeethJson(writeJson(teeth));
                    item.setExtrasJson(writeJson(bills));
                    item.setPrice(price);
                    item.setUpdatedAt(now);
                }
                existingByKey.put(mapKey, item);
            }
        });

        // Upsert Others
        upsertSingle(existingByKey, visit, KEY_OTHERS, "Others", req.getOthersText(), req.getOdontogramMode(), now);
        // Upsert Description
        upsertSingle(existingByKey, visit, KEY_DESCRIPTION, "Description", req.getDescription(), req.getOdontogramMode(), now);
        // Upsert Billing
        if (req.getBillLines() != null && !req.getBillLines().isEmpty()) {
            String mapKey = buildKey(KEY_BILLING, "Billing");
            VisitTreatmentItem item = existingByKey.get(mapKey);
            if (item == null) {
                item = buildItem(
                        visit,
                        KEY_BILLING,
                        "Billing",
                        "Billing",
                        null,
                        req.getOdontogramMode(),
                        Collections.emptyList(),
                        writeJson(req.getBillLines()),
                        null,
                        now
                );
            } else {
                item.setExtrasJson(writeJson(req.getBillLines()));
                item.setUpdatedAt(now);
            }
            existingByKey.put(mapKey, item);
        }

        return new ArrayList<>(existingByKey.values());
    }

    private void upsertSingle(
            Map<String, VisitTreatmentItem> map,
            Visit visit,
            String categoryKey,
            String title,
            String notes,
            String odoMode,
            LocalDateTime now
    ) {
        if (notes == null || notes.isBlank()) {
            return;
        }
        String mapKey = buildKey(categoryKey, title);
        VisitTreatmentItem item = map.get(mapKey);
        if (item == null) {
            item = buildItem(
                    visit,
                    categoryKey,
                    title,
                    title,
                    notes,
                    odoMode,
                    Collections.emptyList(),
                    null,
                    null,
                    now
            );
        } else {
            item.setNotes(notes);
            item.setOdontogramMode(odoMode);
            item.setUpdatedAt(now);
        }
        map.put(mapKey, item);
    }

    private String buildKey(String categoryKey, String procedureName) {
        return Optional.ofNullable(categoryKey).orElse("") + "::" + Optional.ofNullable(procedureName).orElse("");
    }

    private VisitTreatmentItem buildItem(
            Visit visit,
            String categoryKey,
            String categoryTitle,
            String procedureName,
            String notes,
            String odontogramMode,
            List<String> selectedTeeth,
            String extrasJson,
            Double price,
            LocalDateTime now
    ) {
        return VisitTreatmentItem.builder()
                .visit(visit)
                .categoryKey(categoryKey)
                .categoryTitle(categoryTitle)
                .procedureName(procedureName)
                .notes(notes)
                .odontogramMode(odontogramMode)
                .selectedTeethJson(writeJson(
                        Optional.ofNullable(selectedTeeth).orElse(Collections.emptyList())))
                .extrasJson(extrasJson)
                .price(price)
                .createdAt(now)
                .updatedAt(now)
                .build();
    }
}
