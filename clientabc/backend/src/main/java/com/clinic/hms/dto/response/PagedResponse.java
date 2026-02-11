package com.clinic.hms.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
public class PagedResponse<T> {
    private List<T> items;
    private int page;
    private int pageSize;
    private long totalItems;
    private int totalPages;
}
