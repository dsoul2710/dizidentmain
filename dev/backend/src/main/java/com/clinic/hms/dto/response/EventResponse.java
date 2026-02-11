package com.clinic.hms.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventResponse {
    private String type; // APPOINTMENT_SCHEDULED / VISIT_CREATED / BILL_GENERATED
    private String title;
    private String subtitle;
    private String status;
    private String timestamp;

    private Long appointmentId;
    private Long visitId;
    private Long billId;
    private Long actorUserId;

    private String patientName;
    private String doctorName;

    private String appointmentDate;
    private String appointmentTime;

    private BigDecimal amount;
}
