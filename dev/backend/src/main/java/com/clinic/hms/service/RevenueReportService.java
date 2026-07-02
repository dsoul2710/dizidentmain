package com.clinic.hms.service;

import com.clinic.hms.entity.*;
import com.clinic.hms.repository.BillItemRepository;
import com.clinic.hms.repository.BillPaymentRepository;
import com.clinic.hms.repository.BillRepository;
import com.clinic.hms.repository.VisitTreatmentItemRepository;
import com.clinic.hms.service.ReportScopeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Revenue & collections reporting (billing + payments).
 * Backed by Bill / BillItem / BillPayment tables.
 */
@RequiredArgsConstructor
@Service
public class RevenueReportService {

    private final BillRepository billRepository;
    private final BillItemRepository billItemRepository;
    private final BillPaymentRepository billPaymentRepository;
    private final VisitTreatmentItemRepository visitTreatmentItemRepository;
    private final ReportScopeService reportScopeService;

    public Map<String, Object> daywiseCollections(
            LocalDate fromDate,
            LocalDate toDate
    ) {
        DateRange range = resolveRange(fromDate, toDate);

        List<Bill> bills = filterBillsByDate(range);
        Set<Long> billIds = bills.stream()
                .map(Bill::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Long, List<BillPayment>> paymentsByBill = loadPaymentsForBills(billIds);
        Map<Long, List<BillPayment>> paymentsInRange = filterPaymentsByDate(paymentsByBill, range);

        BigDecimal totalBilled = bills.stream()
                .map(this::netAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalCollected = paymentsInRange.values().stream()
                .flatMap(Collection::stream)
                .map(this::amountOrZero)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalPaidAnytime = paymentsByBill.values().stream()
                .flatMap(Collection::stream)
                .map(this::amountOrZero)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalOutstanding = totalBilled.subtract(totalPaidAnytime);
        if (totalOutstanding.compareTo(BigDecimal.ZERO) < 0) {
            totalOutstanding = BigDecimal.ZERO;
        }

        // Bills grouped by bill_date (for visibility even if there were no payments that day)
        Map<LocalDate, BillBucket> billsByDate = bills.stream()
                .filter(b -> b.getBillDate() != null)
                .collect(Collectors.groupingBy(
                        b -> b.getBillDate().toLocalDate(),
                        Collectors.collectingAndThen(
                                Collectors.toList(),
                                list -> {
                                    BigDecimal billed = list.stream()
                                             .map(this::netAmount)
                                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                                    return new BillBucket(list.size(), billed);
                                }
                        )
                ));

        Map<LocalDate, List<BillPayment>> paymentsByDate = paymentsInRange.values().stream()
                .flatMap(Collection::stream)
                .filter(p -> p.getPaymentDate() != null)
                .collect(Collectors.groupingBy(p -> p.getPaymentDate().toLocalDate()));

        SortedSet<LocalDate> allDates = new TreeSet<>();
        allDates.addAll(billsByDate.keySet());
        allDates.addAll(paymentsByDate.keySet());

        List<Map<String, Object>> rows = allDates.stream()
                .map(date -> {
                    BillBucket bucket = billsByDate.getOrDefault(date, new BillBucket(0, BigDecimal.ZERO));
                    List<BillPayment> pays = paymentsByDate.getOrDefault(date, Collections.emptyList());
                    BigDecimal collected = pays.stream()
                            .map(this::amountOrZero)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    long paymentCount = pays.size();
                    long billsOnDay = bucket.count();
                    BigDecimal billedOnDay = bucket.amount();

                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("date", date);
                    row.put("collection", collected);
                    row.put("payments", paymentCount);
                    row.put("bills", billsOnDay);
                    row.put("billedAmount", billedOnDay);
                    return row;
                })
                .toList();

        long paymentCount = paymentsInRange.values().stream().mapToLong(Collection::size).sum();

        return Map.of(
                "fromDate", range.from(),
                "toDate", range.to(),
                "billCount", bills.size(),
                "paymentCount", paymentCount,
                "totalBilled", totalBilled,
                "totalCollected", totalCollected,
                "totalOutstanding", totalOutstanding,
                "rows", rows
        );
    }

    public List<Map<String, Object>> doctorWiseRevenue(
            LocalDate fromDate,
            LocalDate toDate
    ) {
        DateRange range = resolveRange(fromDate, toDate);
        List<Bill> bills = filterBillsByDate(range);
        Set<Long> billIds = bills.stream().map(Bill::getId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, List<BillPayment>> paymentsByBill = loadPaymentsForBills(billIds);
        Map<Long, String> nameCache = new HashMap<>();

        Map<Long, DoctorAggregate> aggregates = new LinkedHashMap<>();

        for (Bill bill : bills) {
            Doctor doctorUser = resolveDoctorUser(bill);
            Long docId = doctorUser != null ? doctorUser.getId() : null;
            String doctorName = resolveDoctorName(doctorUser, nameCache);

            DoctorAggregate agg = aggregates.computeIfAbsent(
                    docId != null ? docId : -1L,
                    ignored -> new DoctorAggregate(docId, doctorName)
            );

            BigDecimal billed = netAmount(bill);
            agg.billed = agg.billed.add(billed);
            agg.bills += 1;

            List<BillPayment> payments = paymentsByBill.getOrDefault(bill.getId(), Collections.emptyList());
            BigDecimal collectedInRange = payments.stream()
                    .filter(p -> withinDate(p.getPaymentDate(), range))
                    .map(this::amountOrZero)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            agg.collected = agg.collected.add(collectedInRange);
            agg.payments += payments.stream().filter(p -> withinDate(p.getPaymentDate(), range)).count();

            BigDecimal paidAll = payments.stream()
                    .map(this::amountOrZero)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal pending = billed.subtract(paidAll);
            if (pending.compareTo(BigDecimal.ZERO) < 0) pending = BigDecimal.ZERO;
            agg.outstanding = agg.outstanding.add(pending);
        }

        return aggregates.values().stream()
                .sorted((a, b) -> b.billed.compareTo(a.billed))
                .map(DoctorAggregate::toMap)
                .toList();
    }

    public Map<String, Object> treatmentWiseRevenue(
            LocalDate fromDate,
            LocalDate toDate,
            Long doctorId,
            String categoryKey
    ) {
        DateRange range = resolveRange(fromDate, toDate);
        List<Bill> bills = filterBillsByDate(range, doctorId);
        List<Long> billIds = bills.stream()
                .map(Bill::getId)
                .filter(Objects::nonNull)
                .toList();

        if (billIds.isEmpty()) {
            return Map.of("summary", Collections.emptyList());
        }

        List<BillItem> items = billItemRepository.findByBill_IdIn(billIds);
        Map<Long, VisitTreatmentItem> treatmentMap = loadTreatmentItems(items);
        String categoryFilter = normalize(categoryKey);
        Map<String, TreatmentAggregate> aggregates = new HashMap<>();

        for (BillItem item : items) {
            VisitTreatmentItem vti = item.getRefId() != null ? treatmentMap.get(item.getRefId()) : null;
            String catKey = normalize(vti != null ? vti.getCategoryKey() : null);
            if (categoryFilter != null && !categoryFilter.equals(catKey)) {
                continue;
            }

            String name = Optional.ofNullable(item.getDescription())
                    .orElseGet(() -> vti != null
                            ? Optional.ofNullable(vti.getProcedureName()).orElse("Service")
                            : "Service");
            TreatmentAggregate agg = aggregates.computeIfAbsent(name, TreatmentAggregate::new);
            agg.categoryKey = catKey;
            agg.categoryTitle = vti != null ? vti.getCategoryTitle() : null;

            agg.cases += 1;
            agg.value = agg.value.add(amountOrZero(item.getLineTotal()));
        }

        List<Map<String, Object>> summary = aggregates.values().stream()
                .sorted((a, b) -> Long.compare(b.cases, a.cases)) // Sort by cases descending to matching logic
                .map(TreatmentAggregate::toMap)
                .toList();

        return Map.of("summary", summary);
    }

    public Map<String, Object> outstandingBills(
            LocalDate fromDate,
            LocalDate toDate,
            Long doctorId
    ) {
        DateRange range = resolveRange(fromDate, toDate);
        List<Bill> bills = filterBillsByDate(range, doctorId);
        Set<Long> billIds = bills.stream().map(Bill::getId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, List<BillPayment>> paymentsByBill = loadPaymentsForBills(billIds);
        Map<Long, String> nameCache = new HashMap<>();

        List<Map<String, Object>> rows = new ArrayList<>();
        BigDecimal totalPending = BigDecimal.ZERO;

        for (Bill bill : bills) {
            List<BillPayment> payments = paymentsByBill.getOrDefault(bill.getId(), Collections.emptyList());
            BigDecimal paid = payments.stream()
                    .map(this::amountOrZero)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal billed = netAmount(bill);
            BigDecimal pending = billed.subtract(paid);
            if (pending.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("billId", bill.getId());
            row.put("billNo", bill.getBillNo());
            row.put("billDate", bill.getBillDate() != null ? bill.getBillDate().toLocalDate() : null);
            row.put("patient", resolvePatientName(bill.getPatient(), nameCache));
            row.put("doctor", resolveDoctorName(resolveDoctorUser(bill), nameCache));
            row.put("netAmount", billed);
            row.put("paidAmount", paid);
            row.put("pendingAmount", pending);
            rows.add(row);

            totalPending = totalPending.add(pending);
        }

        rows.sort((a, b) -> {
            LocalDate d1 = (LocalDate) a.get("billDate");
            LocalDate d2 = (LocalDate) b.get("billDate");
            if (d1 == null && d2 == null) return 0;
            if (d1 == null) return 1;
            if (d2 == null) return -1;
            return d2.compareTo(d1);
        });

        return Map.of(
                "fromDate", range.from(),
                "toDate", range.to(),
                "totalPending", totalPending,
                "rows", rows
        );
    }

    // ---------- helpers ----------

    private Map<Long, List<BillPayment>> loadPaymentsForBills(Set<Long> billIds) {
        if (billIds.isEmpty()) return Collections.emptyMap();

        return billPaymentRepository.findByBill_IdIn(new ArrayList<>(billIds)).stream()
                .filter(p -> p.getBill() != null && p.getBill().getId() != null)
                .filter(p -> billIds.contains(p.getBill().getId()))
                .collect(Collectors.groupingBy(p -> p.getBill().getId()));
    }

    private Map<Long, List<BillPayment>> filterPaymentsByDate(Map<Long, List<BillPayment>> paymentsByBill, DateRange range) {
        Map<Long, List<BillPayment>> map = new HashMap<>();
        for (Map.Entry<Long, List<BillPayment>> entry : paymentsByBill.entrySet()) {
            List<BillPayment> filtered = entry.getValue().stream()
                    .filter(p -> withinDate(p.getPaymentDate(), range))
                    .toList();
            if (!filtered.isEmpty()) {
                map.put(entry.getKey(), filtered);
            }
        }
        return map;
    }

    private List<Bill> filterBillsByDate(DateRange range) {
        return filterBillsByDate(range, null);
    }

    private List<Bill> filterBillsByDate(DateRange range, Long doctorId) {
        return loadScopedBills().stream()
                .filter(b -> b.getBillDate() != null)
                .filter(b -> withinDate(b.getBillDate(), range))
                .filter(b -> doctorMatches(b, doctorId))
                .toList();
    }

    private List<Bill> loadScopedBills() {
        Long ownerId = reportScopeService.resolveOwnerUserIdForReports();
        if (ownerId != null) {
            return billRepository.findByOwner_Id(ownerId);
        }
        if (reportScopeService.isSuperAdmin()) {
            return billRepository.findAll();
        }
        return Collections.emptyList();
    }

    private boolean doctorMatches(Bill bill, Long doctorId) {
        if (doctorId == null) return true;
        Doctor doc = resolveDoctorUser(bill);
        return doc != null && Objects.equals(doc.getId(), doctorId);
    }

    private boolean withinDate(LocalDateTime dt, DateRange range) {
        if (dt == null) return false;
        LocalDate date = dt.toLocalDate();
        return withinDate(date, range);
    }

    private boolean withinDate(LocalDate date, DateRange range) {
        if (date == null) return false;
        if (range.from() != null && date.isBefore(range.from())) return false;
        if (range.to() != null && date.isAfter(range.to())) return false;
        return true;
    }

    private Map<Long, VisitTreatmentItem> loadTreatmentItems(List<BillItem> items) {
        List<Long> refIds = items.stream()
                .map(BillItem::getRefId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (refIds.isEmpty()) return Collections.emptyMap();

        return visitTreatmentItemRepository.findAllById(refIds).stream()
                .collect(Collectors.toMap(VisitTreatmentItem::getId, v -> v));
    }

    private BigDecimal netAmount(Bill bill) {
        return bill.getNetAmount() != null ? bill.getNetAmount() : BigDecimal.ZERO;
    }

    private BigDecimal amountOrZero(BillPayment payment) {
        return payment.getAmount() != null ? payment.getAmount() : BigDecimal.ZERO;
    }

    private BigDecimal amountOrZero(BigDecimal val) {
        return val != null ? val : BigDecimal.ZERO;
    }

    private String resolvePatientName(Patient patient, Map<Long, String> cache) {
        if (patient == null) return "Unknown";
        Long id = patient.getId();
        if (id == null) return "Patient";

        if (cache.containsKey(id)) {
            return cache.get(id);
        }

        String name = patient.getFullName() != null ? patient.getFullName() : "Patient " + id;
        cache.put(id, name);
        return name;
    }

    private String resolveDoctorName(Doctor doctor, Map<Long, String> cache) {
        if (doctor == null) return "Unassigned";
        Long id = doctor.getId();
        if (id == null) return "Doctor";

        if (cache.containsKey(id)) {
            return cache.get(id);
        }

        String name = doctor.getFullName() != null ? doctor.getFullName() : "Doctor " + id;
        cache.put(id, name);
        return name;
    }

    private DateRange resolveRange(LocalDate fromDate, LocalDate toDate) {
        LocalDate to = Optional.ofNullable(toDate).orElse(LocalDate.now());
        LocalDate from = Optional.ofNullable(fromDate).orElse(to.minusMonths(1));
        if (from.isAfter(to)) {
            from = to;
        }
        return new DateRange(from, to);
    }

    private String normalize(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed.toUpperCase();
    }

    private Doctor resolveDoctorUser(Bill bill) {
        if (bill == null) return null;
        if (bill.getDoctor() != null) return bill.getDoctor();
        if (bill.getVisit() != null && bill.getVisit().getDoctor() != null) {
            return bill.getVisit().getDoctor();
        }
        return null;
    }

    private record DateRange(LocalDate from, LocalDate to) {}

    private record BillBucket(long count, BigDecimal amount) {}

    private static class DoctorAggregate {
        private final Long doctorId;
        private final String doctorName;
        private BigDecimal billed = BigDecimal.ZERO;
        private BigDecimal collected = BigDecimal.ZERO;
        private BigDecimal outstanding = BigDecimal.ZERO;
        private long bills = 0;
        private long payments = 0;

        DoctorAggregate(Long doctorId, String doctorName) {
            this.doctorId = doctorId;
            this.doctorName = doctorName;
        }

        Map<String, Object> toMap() {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("doctorId", doctorId);
            map.put("doctor", doctorName);
            map.put("billed", billed);
            map.put("collected", collected);
            map.put("outstanding", outstanding);
            map.put("bills", bills);
            map.put("payments", payments);
            return map;
        }
    }

    private static class TreatmentAggregate {
        private final String name;
        private long cases = 0;
        private BigDecimal value = BigDecimal.ZERO;
        private String categoryKey;
        private String categoryTitle;

        TreatmentAggregate(String name) {
            this.name = name;
        }

        Map<String, Object> toMap() {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("procedure", name);
            map.put("cases", cases);
            map.put("value", value);
            map.put("categoryKey", categoryKey);
            map.put("categoryTitle", categoryTitle);
            return map;
        }
    }
}
