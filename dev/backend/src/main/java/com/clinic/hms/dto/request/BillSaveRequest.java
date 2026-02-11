package com.clinic.hms.dto.request;

import lombok.Data;

import java.util.List;

@Data
public class BillSaveRequest {
    private Long patientUserId;
    private Long visitId;
    private Long doctorUserId; // optional override; defaults to visit's doctor
    private String billDate; // yyyy-MM-dd
    private String remarks;
    private List<BillSaveItem> items;
    private Long createdByUserId; // creator user id (optional)

    @Data
    public static class BillSaveItem {
        private Long treatmentItemId; // optional reference to visit_treatment_items.id
        private String description;
        private Double quantity;
        private Double rate;
        private Double gstPercent;
    }
}
