// src/main/java/com/clinic/hms/controller/AppointmentController.java
package com.clinic.hms.controller;

import com.clinic.hms.dto.request.AppointmentCreateRequest;
import com.clinic.hms.dto.request.AppointmentUpdateRequest;
import com.clinic.hms.dto.response.AppointmentResponse;
import com.clinic.hms.service.AppointmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;

    @GetMapping("/day/{date}")
    public List<AppointmentResponse> listForDate(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return appointmentService.listAppointmentsForDate(date);
    }

    @GetMapping("/range")
    public List<AppointmentResponse> listRange(
            @RequestParam(name = "from")
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(name = "to")
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return appointmentService.listAppointmentsInRange(from, to);
    }

    @PostMapping
    public AppointmentResponse create(@RequestBody AppointmentCreateRequest req) {
        return appointmentService.createAppointment(req);
    }

    @DeleteMapping("/{id}")
    public void cancel(@PathVariable Long id) {
        appointmentService.cancelAppointment(id);
    }

    @PutMapping("/{id}")
    public AppointmentResponse update(@PathVariable Long id,
                                      @RequestBody AppointmentUpdateRequest req) {
        return appointmentService.updateAppointment(id, req);
    }
}
