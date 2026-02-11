// src/main/java/com/clinic/hms/dto/request/VendorCreateRequest.java
package com.clinic.hms.dto.request;

import lombok.Data;

@Data
public class VendorCreateRequest {
    private String name;
    private String address;
    private String mobile;
    private String category;
    private String gstNo;
}
