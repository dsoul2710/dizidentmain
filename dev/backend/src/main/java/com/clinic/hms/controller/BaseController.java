package com.clinic.hms.controller;

public abstract class BaseController {

    protected int resolvePage(Integer page) {
        return page == null ? 1 : page;
    }

    protected int resolvePageSize(Integer pageSize) {
        return pageSize == null ? 10 : pageSize;
    }

    protected boolean shouldPage(Integer page, Integer pageSize, String search) {
        return page != null || pageSize != null || (search != null && !search.isBlank());
    }
}
