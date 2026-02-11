package com.clinic.hms.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UnreadCountResponse {

    private Long userId;
    private Long count;
}
