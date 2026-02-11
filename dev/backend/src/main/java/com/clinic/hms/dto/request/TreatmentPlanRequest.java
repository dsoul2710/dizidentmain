package com.clinic.hms.dto.request;

import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class TreatmentPlanRequest {

    // Align with Examination/Diagnosis flow: allow frontend to post with or without an existing visit
    private Long patientUserId;
    private Long visitId;

    private String odontogramMode;
    private List<String> selectedTeeth;
    private String cariesText;
    private Map<String, List<String>> selectedProcedures;
    private Map<String, List<String>> procedureTeeth; // key: catKey::item -> teeth list
    private Map<String, String> procedureNotes; // key: catKey::item -> note
    private Map<String, List<BillLine>> procedureBillLines; // key: catKey::item -> bill lines
    private Map<String, Double> procedurePrices; // key: catKey::item -> unit price
    private String othersText;
    private String description;
    private String summary;
    private List<BillLine> billLines;

    @Data
    public static class BillLine {
        private String description;
        private Integer qty;
        private Double price;
        private Double amount;
    }
}
