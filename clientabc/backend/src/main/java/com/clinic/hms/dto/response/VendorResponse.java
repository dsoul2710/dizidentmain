// src/main/java/com/clinic/hms/dto/response/VendorResponse.java
package com.clinic.hms.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class VendorResponse {

    private Long id;
    private String name;
    private String address;
    private String mobile;
    private String category;
    private String gstNo;
    private String createdAt;   // ISO string
}
