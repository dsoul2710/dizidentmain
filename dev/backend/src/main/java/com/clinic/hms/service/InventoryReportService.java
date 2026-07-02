package com.clinic.hms.service;

import com.clinic.hms.entity.InventoryItem;
import com.clinic.hms.entity.InventoryMovement;
import com.clinic.hms.repository.InventoryItemRepository;
import com.clinic.hms.repository.InventoryMovementRepository;
import com.clinic.hms.service.ReportScopeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@Service
public class InventoryReportService {

    private final InventoryItemRepository itemRepository;
    private final InventoryMovementRepository movementRepository;
    private final ReportScopeService reportScopeService;

    // 1) Low stock
    public List<Map<String, Object>> lowStock(
            LocalDate fromDate,
            LocalDate toDate
    ) {
        if (fromDate == null && toDate == null) {
            return loadScopedItems().stream()
                    .filter(i -> Boolean.TRUE.equals(i.getIsActive()))
                    .filter(i -> i.getReorderLevel() != null && i.getCurrentStock() != null)
                    .filter(i -> i.getCurrentStock().compareTo(i.getReorderLevel()) <= 0)
                    .sorted(Comparator.comparing(InventoryItem::getName, Comparator.nullsLast(String::compareToIgnoreCase)))
                    .map(this::toItemRow)
                    .toList();
        }

        DateRange range = resolveRange(fromDate, toDate);
        return loadScopedItems().stream()
                .filter(i -> Boolean.TRUE.equals(i.getIsActive()))
                .filter(i -> i.getReorderLevel() != null && i.getCurrentStock() != null)
                .map(item -> buildLowStockRowForRange(item, range))
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(m -> String.valueOf(m.getOrDefault("name", "")), String::compareToIgnoreCase))
                .toList();
    }

    // 2) Consumption (OUT movements)
    public List<Map<String, Object>> consumption(
            LocalDate fromDate,
            LocalDate toDate
    ) {
        DateRange range = resolveRange(fromDate, toDate);
        List<InventoryMovement> movements = loadMovementsInRange(range).stream()
                .filter(m -> "OUT".equalsIgnoreCase(m.getDirection()))
                .toList();

        Map<Long, ConsumptionAggregate> aggregates = new HashMap<>();
        for (InventoryMovement m : movements) {
            InventoryItem item = m.getItem();
            if (item == null || item.getId() == null) continue;
            ConsumptionAggregate agg = aggregates.computeIfAbsent(item.getId(), id -> new ConsumptionAggregate(item));
            double qty = m.getQuantity() != null ? m.getQuantity().doubleValue() : 0d;
            agg.qty += qty;
            agg.entries += 1;
        }

        return aggregates.values().stream()
                .sorted((a, b) -> Double.compare(b.qty, a.qty))
                .map(ConsumptionAggregate::toRow)
                .toList();
    }

    // 3) Purchase summary (IN movements) grouped by vendor name
    public List<Map<String, Object>> purchaseSummary(
            LocalDate fromDate,
            LocalDate toDate
    ) {
        DateRange range = resolveRange(fromDate, toDate);
        List<InventoryMovement> movements = loadMovementsInRange(range).stream()
                .filter(m -> "IN".equalsIgnoreCase(m.getDirection()))
                .toList();

        Map<String, PurchaseAggregate> aggregates = new HashMap<>();
        for (InventoryMovement m : movements) {
            InventoryItem item = m.getItem();
            if (item == null) continue;
            String vendor = Optional.ofNullable(item.getVendorName()).filter(v -> !v.isBlank()).orElse("Unknown vendor");
            PurchaseAggregate agg = aggregates.computeIfAbsent(vendor, PurchaseAggregate::new);
            double qty = m.getQuantity() != null ? m.getQuantity().doubleValue() : 0d;
            agg.qty += qty;
            double price = item.getUnitPrice() != null ? item.getUnitPrice().doubleValue() : 0d;
            agg.value += qty * price;
            agg.items.add(item.getName());
        }

        return aggregates.values().stream()
                .sorted((a, b) -> Double.compare(b.value, a.value))
                .map(PurchaseAggregate::toRow)
                .toList();
    }

    // 4) Valuation detailed
    public Map<String, Object> valuation() {
        List<Map<String, Object>> rows = loadScopedItems().stream()
                .filter(i -> Boolean.TRUE.equals(i.getIsActive()))
                .map(item -> {
                    double qty = item.getCurrentStock() != null ? item.getCurrentStock().doubleValue() : 0d;
                    double price = item.getUnitPrice() != null ? item.getUnitPrice().doubleValue() : 0d;
                    double value = qty * price;
                    Map<String, Object> row = toItemRow(item);
                    row.put("value", value);
                    row.put("price", price);
                    return row;
                })
                .sorted((a, b) -> Double.compare((double) b.getOrDefault("value", 0d), (double) a.getOrDefault("value", 0d)))
                .toList();

        double totalValue = rows.stream()
                .mapToDouble(r -> (double) r.getOrDefault("value", 0d))
                .sum();

        return Map.of("totalValue", totalValue, "rows", rows);
    }

    // ---- helpers ----

    private List<InventoryItem> loadScopedItems() {
        Long ownerId = reportScopeService.resolveOwnerUserIdForReports();
        if (ownerId != null) {
            return itemRepository.findByOwner_Id(ownerId);
        }
        if (reportScopeService.isSuperAdmin()) {
            return itemRepository.findAll();
        }
        return Collections.emptyList();
    }

    private Map<String, Object> toItemRow(InventoryItem item) {
        return toItemRow(item, null);
    }

    private Map<String, Object> toItemRow(InventoryItem item, BigDecimal currentQtyOverride) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", item.getId());
        map.put("code", item.getItemCode());
        map.put("name", item.getName());
        map.put("category", item.getCategory());
        map.put("unit", item.getUnit());
        BigDecimal qty = currentQtyOverride != null ? currentQtyOverride : item.getCurrentStock();
        map.put("currentQty", qty != null ? qty.doubleValue() : 0d);
        map.put("minStock", item.getReorderLevel() != null ? item.getReorderLevel().doubleValue() : 0d);
        map.put("price", item.getUnitPrice() != null ? item.getUnitPrice().doubleValue() : 0d);
        map.put("vendor", item.getVendorName());
        return map;
    }

    private List<InventoryMovement> loadMovementsInRange(DateRange range) {
        Set<Long> scopedItemIds = loadScopedItems().stream()
                .map(InventoryItem::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        return movementRepository.findByMovementDateBetween(range.from(), range.to()).stream()
                .filter(m -> m.getItem() != null && scopedItemIds.contains(m.getItem().getId()))
                .toList();
    }

    private DateRange resolveRange(LocalDate fromDate, LocalDate toDate) {
        LocalDate to = Optional.ofNullable(toDate).orElse(LocalDate.now());
        LocalDate from = Optional.ofNullable(fromDate).orElse(to.minusMonths(1));
        if (from.isAfter(to)) from = to;
        return new DateRange(from, to);
    }

    private Map<String, Object> buildLowStockRowForRange(InventoryItem item, DateRange range) {
        BigDecimal currentStock = Optional.ofNullable(item.getCurrentStock()).orElse(BigDecimal.ZERO);
        List<InventoryMovement> descMovements = movementRepository.findByItemOrderByMovementDateDescMovementTimeDesc(item);

        BigDecimal stockAtTo = currentStock;
        for (InventoryMovement m : descMovements) {
            if (m.getMovementDate() == null || !m.getMovementDate().isAfter(range.to())) {
                break;
            }
            stockAtTo = stockAtTo.subtract(signedQuantity(m));
        }

        List<InventoryMovement> rangeMovements =
                movementRepository.findByItemAndMovementDateBetweenOrderByMovementDateAscMovementTimeAsc(
                        item,
                        range.from(),
                        range.to()
                );

        BigDecimal netChange = BigDecimal.ZERO;
        for (InventoryMovement m : rangeMovements) {
            netChange = netChange.add(signedQuantity(m));
        }

        BigDecimal stockAtFrom = stockAtTo.subtract(netChange);
        BigDecimal minStock = stockAtFrom;
        BigDecimal running = stockAtFrom;
        for (InventoryMovement m : rangeMovements) {
            running = running.add(signedQuantity(m));
            if (running.compareTo(minStock) < 0) {
                minStock = running;
            }
        }

        BigDecimal reorder = Optional.ofNullable(item.getReorderLevel()).orElse(BigDecimal.ZERO);
        if (minStock.compareTo(reorder) > 0) {
            return null;
        }
        return toItemRow(item, stockAtTo);
    }

    private BigDecimal signedQuantity(InventoryMovement movement) {
        BigDecimal qty = Optional.ofNullable(movement.getQuantity()).orElse(BigDecimal.ZERO);
        if ("IN".equalsIgnoreCase(movement.getDirection())) {
            return qty;
        }
        if ("OUT".equalsIgnoreCase(movement.getDirection())) {
            return qty.negate();
        }
        return BigDecimal.ZERO;
    }

    private record DateRange(LocalDate from, LocalDate to) {}

    private static class ConsumptionAggregate {
        private final InventoryItem item;
        private double qty = 0d;
        private long entries = 0L;

        ConsumptionAggregate(InventoryItem item) {
            this.item = item;
        }

        Map<String, Object> toRow() {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("itemId", item.getId());
            row.put("name", item.getName());
            row.put("category", item.getCategory());
            row.put("unit", item.getUnit());
            row.put("qty", qty);
            double price = item.getUnitPrice() != null ? item.getUnitPrice().doubleValue() : 0d;
            row.put("value", qty * price);
            row.put("entries", entries);
            return row;
        }
    }

    private static class PurchaseAggregate {
        private final String vendor;
        private double qty = 0d;
        private double value = 0d;
        private Set<String> items = new HashSet<>();

        PurchaseAggregate(String vendor) {
            this.vendor = vendor;
        }

        Map<String, Object> toRow() {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("vendor", vendor);
            row.put("qty", qty);
            row.put("value", value);
            row.put("items", items);
            return row;
        }
    }
}
