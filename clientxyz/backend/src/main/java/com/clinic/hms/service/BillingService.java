package com.clinic.hms.service;

import com.clinic.hms.dto.request.BillSaveRequest;
import com.clinic.hms.dto.response.BillDetailResponse;
import com.clinic.hms.dto.response.BillItemResponse;
import com.clinic.hms.dto.response.BillableItemResponse;
import com.clinic.hms.dto.response.PaymentResponse;
import com.clinic.hms.entity.*;
import com.clinic.hms.repository.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BillingService {

    private final VisitRepository visitRepository;
    private final VisitTreatmentItemRepository visitTreatmentItemRepository;
    private final UserRepository userRepository;
    private final UserDetailsRepository userDetailsRepository;
    private final BillRepository billRepository;
    private final BillItemRepository billItemRepository;
    private final BillPaymentRepository billPaymentRepository;
    private final ObjectMapper objectMapper;
    private final EventPushService eventPushService;

    private static final TypeReference<List<String>> LIST_STRING = new TypeReference<>() {};

    @Transactional(readOnly = true)
    public List<BillableItemResponse> getBillableItems(Long visitId) {
        List<VisitTreatmentItem> items = visitTreatmentItemRepository.findByVisitId(visitId);
        List<BillableItemResponse> result = new ArrayList<>();

        for (VisitTreatmentItem item : items) {
            String procName = Optional.ofNullable(item.getProcedureName()).orElse("");
            if (procName.isBlank()) continue;

            List<String> teeth = parseTeeth(item.getSelectedTeethJson());
            int qty = Math.max(1, teeth.size());
            BigDecimal rate = item.getPrice() != null
                    ? BigDecimal.valueOf(item.getPrice())
                    : BigDecimal.ZERO;

            result.add(BillableItemResponse.builder()
                    .treatmentItemId(item.getId())
                    .description(procName)
                    .quantity(BigDecimal.valueOf(qty))
                    .rate(rate)
                    .gstPercent(BigDecimal.ZERO)
                    .build());
        }
        return result;
    }

    @Transactional
    public BillDetailResponse createBill(BillSaveRequest req) {
        if (req.getPatientUserId() == null) {
            throw new IllegalArgumentException("patientUserId is required");
        }
        if (req.getVisitId() == null) {
            throw new IllegalArgumentException("visitId is required");
        }
        Visit visit = visitRepository.findById(req.getVisitId())
                .orElseThrow(() -> new IllegalArgumentException("Visit not found: " + req.getVisitId()));
        if (visit.getPatient() == null || !Objects.equals(visit.getPatient().getId(), req.getPatientUserId())) {
            throw new IllegalArgumentException("Visit does not belong to patient " + req.getPatientUserId());
        }
        User patient = userRepository.findById(req.getPatientUserId())
                .orElseThrow(() -> new IllegalArgumentException("Patient not found: " + req.getPatientUserId()));
        User doctor = resolveDoctor(req.getDoctorUserId(), visit, patient);

        LocalDateTime billDate = parseBillDate(req.getBillDate());
        String billNo = generateBillNo();
        LocalDateTime now = LocalDateTime.now();

        List<BillSaveRequest.BillSaveItem> reqItems = Optional.ofNullable(req.getItems())
                .orElse(Collections.emptyList());
        if (reqItems.isEmpty()) {
            throw new IllegalArgumentException("At least one billing item is required");
        }

        BigDecimal gross = BigDecimal.ZERO;
        BigDecimal tax = BigDecimal.ZERO;
        BigDecimal net = BigDecimal.ZERO;

        Bill bill = Bill.builder()
                .billNo(billNo)
                .billDate(billDate)
                .visit(visit)
                .patient(patient)
                .doctor(doctor)
                .grossAmount(BigDecimal.ZERO)
                .taxAmount(BigDecimal.ZERO)
                .discountAmount(BigDecimal.ZERO)
                .netAmount(BigDecimal.ZERO)
                .status("UNPAID")
                .remarks(req.getRemarks())
                .createdAt(now)
                .updatedAt(now)
                .createdByUserId(req.getCreatedByUserId())
                .build();
        bill = billRepository.save(bill);

        List<BillItem> toSaveItems = new ArrayList<>();
        for (BillSaveRequest.BillSaveItem reqItem : reqItems) {
            BigDecimal qty = toPositiveOrDefault(reqItem.getQuantity(), BigDecimal.ONE);
            BigDecimal rate = toPositiveOrDefault(reqItem.getRate(), BigDecimal.ZERO);
            BigDecimal gstPercent = toPositiveOrDefault(reqItem.getGstPercent(), BigDecimal.ZERO);

            BigDecimal base = rate.multiply(qty);
            BigDecimal taxAmt = base.multiply(gstPercent)
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            BigDecimal lineTotal = base.add(taxAmt);

            gross = gross.add(base);
            tax = tax.add(taxAmt);
            net = net.add(lineTotal);

            BillItem item = BillItem.builder()
                    .bill(bill)
                    .itemType("PROCEDURE")
                    .refId(reqItem.getTreatmentItemId())
                    .description(Optional.ofNullable(reqItem.getDescription()).orElse("Procedure"))
                    .quantity(qty)
                    .rate(rate)
                    .taxPercent(gstPercent)
                    .lineTotal(lineTotal)
                    .createdAt(now)
                    .build();
            toSaveItems.add(item);
        }

        billItemRepository.saveAll(toSaveItems);

        bill.setGrossAmount(gross);
        bill.setTaxAmount(tax);
        bill.setNetAmount(net);
        bill.setUpdatedAt(LocalDateTime.now());
        billRepository.save(bill);
        eventPushService.publishBill(bill);

        return toDetailResponse(bill, toSaveItems, Collections.emptyList());
    }

    @Transactional(readOnly = true)
    public BillDetailResponse getLatestBillForVisit(Long visitId) {
        Bill bill = billRepository.findTopByVisit_IdOrderByIdDesc(visitId)
                .orElseThrow(() -> new IllegalArgumentException("No bill found for visit " + visitId));
        List<BillItem> items = billItemRepository.findByBill_Id(bill.getId());
        List<BillPayment> payments = billPaymentRepository.findByBill_Id(bill.getId());
        return toDetailResponse(bill, items, payments);
    }

    @Transactional
    public BillDetailResponse addPayment(Long billId, BigDecimal amount, String method, String reference, String notes) {
        Bill bill = billRepository.findById(billId)
                .orElseThrow(() -> new IllegalArgumentException("Bill not found: " + billId));
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Payment amount must be greater than zero");
        }
        LocalDateTime now = LocalDateTime.now();
        BillPayment payment = BillPayment.builder()
                .bill(bill)
                .amount(amount)
                .method(Optional.ofNullable(method).orElse("CASH"))
                .referenceNo(reference)
                .notes(notes)
                .paymentDate(now)
                .createdAt(now)
                .build();
        billPaymentRepository.saveAndFlush(payment);

        List<BillItem> items = billItemRepository.findByBill_Id(bill.getId());
        List<BillPayment> payments = billPaymentRepository.findByBill_Id(bill.getId());
        return toDetailResponse(bill, items, payments);
    }

    private List<String> parseTeeth(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, LIST_STRING);
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private LocalDateTime parseBillDate(String billDate) {
        if (billDate == null || billDate.isBlank()) return LocalDateTime.now();
        try {
            return LocalDate.parse(billDate).atStartOfDay();
        } catch (Exception e) {
            return LocalDateTime.now();
        }
    }

    private String generateBillNo() {
        long next = billRepository.findTopByOrderByIdDesc()
                .map(b -> b.getId() + 1)
                .orElse(1L);
        return String.format("BILL-%05d", next);
    }

    private User resolveDoctor(Long doctorUserId, Visit visit, User patient) {
        if (doctorUserId != null) {
            return userRepository.findById(doctorUserId)
                    .orElseThrow(() -> new IllegalArgumentException("Doctor not found: " + doctorUserId));
        }
        if (visit != null && visit.getDoctor() != null) {
            return visit.getDoctor();
        }
        if (patient != null) {
            return userDetailsRepository.findFirstByUser_Id(patient.getId())
                    .map(UserDetails::getAssignedDoctor)
                    .orElse(null);
        }
        return null;
    }

    private BigDecimal toPositiveOrDefault(Double val, BigDecimal defaultVal) {
        if (val == null) return defaultVal;
        try {
            BigDecimal bd = BigDecimal.valueOf(val);
            if (bd.compareTo(BigDecimal.ZERO) < 0) return defaultVal;
            return bd;
        } catch (Exception e) {
            return defaultVal;
        }
    }

    private BillDetailResponse toDetailResponse(Bill bill, List<BillItem> items, List<BillPayment> payments) {
        BigDecimal paid = payments.stream()
                .map(p -> Optional.ofNullable(p.getAmount()).orElse(BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal pending = bill.getNetAmount().subtract(paid);
        List<BillItemResponse> itemDtos = items.stream()
                .map(it -> BillItemResponse.builder()
                        .id(it.getId())
                        .description(it.getDescription())
                        .quantity(it.getQuantity())
                        .rate(it.getRate())
                        .gstPercent(it.getTaxPercent())
                        .lineTotal(it.getLineTotal())
                        .treatmentItemId(it.getRefId())
                        .build())
                .collect(Collectors.toList());
        List<PaymentResponse> payDtos = payments.stream()
                .map(p -> PaymentResponse.builder()
                        .id(p.getId())
                        .amount(p.getAmount())
                        .method(p.getMethod())
                        .referenceNo(p.getReferenceNo())
                        .notes(p.getNotes())
                        .paymentDate(p.getPaymentDate())
                        .build())
                .collect(Collectors.toList());
        return BillDetailResponse.builder()
                .id(bill.getId())
                .billNo(bill.getBillNo())
                .billDate(bill.getBillDate())
                .grossAmount(bill.getGrossAmount())
                .taxAmount(bill.getTaxAmount())
                .netAmount(bill.getNetAmount())
                .paidAmount(paid)
                .pendingAmount(pending)
                .status(bill.getStatus())
                .items(itemDtos)
                .payments(payDtos)
                .build();
    }
}
