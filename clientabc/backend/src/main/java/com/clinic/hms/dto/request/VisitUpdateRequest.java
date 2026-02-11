package com.clinic.hms.dto.request;

import lombok.Data;

@Data
public class VisitUpdateRequest {

    private Long doctorUserId;
    private String visitType;
    private String chiefComplaint;
    private String notes;
    private String status;
}
