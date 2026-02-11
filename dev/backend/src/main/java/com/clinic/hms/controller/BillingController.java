package com.clinic.hms.controller;

import com.clinic.hms.dto.request.BillSaveRequest;
import com.clinic.hms.dto.response.BillDetailResponse;
import com.clinic.hms.dto.response.BillableItemResponse;
import com.clinic.hms.service.BillingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/billing")
@RequiredArgsConstructor
public class BillingController {

    private final BillingService billingService;

    // GET /api/billing/visits/{visitId}/items
    @GetMapping("/visits/{visitId}/items")
    public List<BillableItemResponse> listBillableItems(@PathVariable Long visitId) {
        return billingService.getBillableItems(visitId);
    }

    // GET /api/billing/visits/{visitId}
    @GetMapping("/visits/{visitId}")
    public BillDetailResponse getLatestBill(@PathVariable Long visitId) {
        return billingService.getLatestBillForVisit(visitId);
    }

    // POST /api/billing
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BillDetailResponse createBill(@RequestBody BillSaveRequest req) {
        return billingService.createBill(req);
    }

    // POST /api/billing/{billId}/payments
    @PostMapping("/{billId}/payments")
    public BillDetailResponse addPayment(
            @PathVariable Long billId,
            @RequestParam("amount") Double amount,
            @RequestParam(value = "method", required = false) String method,
            @RequestParam(value = "reference", required = false) String reference,
            @RequestParam(value = "notes", required = false) String notes
    ) {
        return billingService.addPayment(
                billId,
                amount == null ? null : java.math.BigDecimal.valueOf(amount),
                method,
                reference,
                notes
        );
    }
}
