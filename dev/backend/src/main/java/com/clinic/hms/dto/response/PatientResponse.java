package com.clinic.hms.dto.response;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PatientResponse {

    private Long id;        // user_details id OR user id, here we’ll use user_details id

    private String name;
    private String mobile;

    private String dob;
    private Integer age;
    private String gender;
    private String city;

    @JsonProperty("referred_by")
    private String referredBy;

    private String allergies;

    @JsonProperty("medical_hx")
    private String medicalHistory;

    @JsonProperty("primary_complaint")
    private String primaryComplaint;

    @JsonProperty("assigned_doctor_id")
    private Long assignedDoctorId;

    // NEW: user id (for visits)
    private Long userId;

    // NEW: created timestamp (for sorting)
    private String createdAt;

    // NEW: file flags
    private boolean hasIdFile;
    private boolean hasReportFile;
    private Boolean isActive;

    @JsonProperty("unique_id")
    private String uniqueId;
}
