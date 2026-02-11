// src/main/java/com/clinic/hms/dto/request/PatientUpdateRequest.java
package com.clinic.hms.dto.request;

import lombok.Data;

@Data
public class PatientUpdateRequest {
    private String name;
    private String mobile;
    private String password;
    private String dob;
    private Integer age;
    private String gender;
    private String city;
    private String referred_by;
    private String allergies;
    private String medical_hx;
    private String primary_complaint;
    private Long assigned_doctor_id;
}
