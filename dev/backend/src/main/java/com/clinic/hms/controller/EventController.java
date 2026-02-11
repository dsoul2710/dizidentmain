package com.clinic.hms.controller;

import com.clinic.hms.dto.response.EventResponse;
import com.clinic.hms.service.EventService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;

    // GET /api/events?userId=1&role=ADMIN
    @GetMapping("/events")
    public List<EventResponse> listEvents(
            @RequestParam(required = false) Long userId,
            @RequestParam String role
    ) {
        return eventService.listEvents(userId, role);
    }
}
