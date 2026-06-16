// src/main/java/com/clinic/hms/service/InventoryService.java
package com.clinic.hms.service;

import com.clinic.hms.dto.request.AutoStockAdjustmentRequest;
import com.clinic.hms.dto.request.InventoryItemCreateRequest;
import com.clinic.hms.dto.request.InventoryMovementRequest;
import com.clinic.hms.dto.request.TemplateRowRequest;
import com.clinic.hms.dto.request.TreatmentTemplateRequest;
import com.clinic.hms.dto.response.InventoryItemResponse;
import com.clinic.hms.dto.response.InventoryMovementResponse;
import com.clinic.hms.dto.response.TemplateRowResponse;
import com.clinic.hms.dto.response.TreatmentTemplateResponse;
import com.clinic.hms.dto.response.VendorResponse;
import com.clinic.hms.entity.InventoryItem;
import com.clinic.hms.entity.InventoryMovement;
import com.clinic.hms.entity.InventoryTreatmentTemplate;
import com.clinic.hms.entity.InventoryTreatmentTemplateRow;
import com.clinic.hms.entity.Vendor;
import com.clinic.hms.repository.InventoryItemRepository;
import com.clinic.hms.repository.InventoryMovementRepository;
import com.clinic.hms.repository.InventoryTreatmentTemplateRepository;
import com.clinic.hms.repository.VendorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InventoryService {

    private final InventoryItemRepository itemRepository;
    private final InventoryMovementRepository movementRepository;

    // Header repo (InventoryTreatmentTemplate)
    private final InventoryTreatmentTemplateRepository templateRepository;

    private final VendorRepository vendorRepository;
    private final com.clinic.hms.security.SecurityUtils securityUtils;
    private final com.clinic.hms.repository.UserRepository userRepository;

    // =============================
    // ITEMS
    // =============================

    @Transactional(readOnly = true)
    public List<InventoryItemResponse> getAllItems() {
        Long orgId = null;
        try {
            orgId = securityUtils.getActiveOrgId();
        } catch (Exception e) {
            // Ignore
        }

        List<InventoryItem> items;
        if (orgId != null) {
            items = itemRepository.findByOrg_Id(orgId);
        } else {
            items = itemRepository.findAll();
        }

        return items.stream()
                .map(this::toItemResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public InventoryItemResponse createItem(InventoryItemCreateRequest req) {

        LocalDateTime now = LocalDateTime.now();

        com.clinic.hms.entity.User org = null;
        try {
            Long orgId = securityUtils.getActiveOrgId();
            if (orgId != null) {
                org = userRepository.findById(orgId).orElse(null);
            }
        } catch (Exception e) {
            // Ignore
        }

        BigDecimal opening = BigDecimal.valueOf(
                req.getOpeningQty() != null ? req.getOpeningQty() : 0d
        );
        BigDecimal minStock = BigDecimal.valueOf(
                req.getMinStock() != null ? req.getMinStock() : 0d
        );
        BigDecimal price = BigDecimal.valueOf(
                req.getPrice() != null ? req.getPrice() : 0d
        );

        Vendor vendor = null;
        final com.clinic.hms.entity.User finalOrg = org;
        if (req.getVendorId() != null) {
            vendor = vendorRepository.findById(req.getVendorId())
                    .filter(v -> finalOrg == null || v.getOrg() == null || v.getOrg().getId().equals(finalOrg.getId()))
                    .orElse(null);
        } else if (req.getVendorName() != null && !req.getVendorName().isBlank()) {
            String cleanName = req.getVendorName().trim();
            List<Vendor> existingVendors = org != null ? vendorRepository.findByOrg_Id(org.getId()) : vendorRepository.findAll();
            vendor = existingVendors.stream()
                    .filter(v -> v.getName() != null && v.getName().equalsIgnoreCase(cleanName))
                    .findFirst()
                    .orElseGet(() -> vendorRepository.save(Vendor.builder()
                            .name(cleanName)
                            .org(finalOrg)
                            .isActive(true)
                            .createdAt(now)
                            .updatedAt(now)
                            .build()));
        }

        String code = "ITM-" + System.currentTimeMillis();

        InventoryItem item = InventoryItem.builder()
                .itemCode(code)
                .name(req.getName().trim())
                .category(req.getCategory())
                .unit(req.getUnit())
                .location(req.getLocation())
                .reorderLevel(minStock)
                .openingStock(opening)
                .currentStock(opening)
                .unitPrice(price)
                .vendorName(vendor != null ? vendor.getName() : req.getVendorName())
                .vendor(vendor)
                .notes(req.getNotes())
                .isActive(true)
                .org(org)
                .gstPercent(BigDecimal.ZERO)
                .createdAt(now)
                .updatedAt(now)
                .build();

        InventoryItem saved = itemRepository.save(item);

        // Opening movement only if > 0
        if (opening.compareTo(BigDecimal.ZERO) > 0) {
            InventoryMovement movement = InventoryMovement.builder()
                    .item(saved)
                    .movementDate(LocalDate.now())
                    .movementTime(now)
                    .movementType("OPENING")
                    .quantity(opening)
                    .direction("IN")
                    .balanceAfter(opening)
                    .sourceType("OPENING")
                    .notes("Opening stock")
                    .createdAt(now)
                    .build();

            movementRepository.save(movement);
        }

        return toItemResponse(saved);
    }

    @Transactional
    public void deleteItem(Long id) {
        itemRepository.deleteById(id);
    }

    private InventoryItemResponse toItemResponse(InventoryItem item) {
        return InventoryItemResponse.builder()
                .id(item.getId())
                .name(item.getName())
                .category(item.getCategory())
                .unit(item.getUnit())
                .location(item.getLocation())
                .minStock(item.getReorderLevel() != null
                        ? item.getReorderLevel().doubleValue()
                        : 0d)
                .currentQty(item.getCurrentStock() != null
                        ? item.getCurrentStock().doubleValue()
                        : 0d)
                .price(item.getUnitPrice() != null
                        ? item.getUnitPrice().doubleValue()
                        : 0d)
                .notes(item.getNotes())
                .vendorName(item.getVendorName())
                .vendorId(item.getVendor() != null ? item.getVendor().getId() : null)
                .build();
    }

    // =============================
    // MOVEMENTS
    // =============================

    @Transactional(readOnly = true)
    public List<InventoryMovementResponse> getAllMovements() {
        Long orgId = null;
        try {
            orgId = securityUtils.getActiveOrgId();
        } catch (Exception e) {
            // Ignore
        }

        final Long finalOrgId = orgId;
        return movementRepository.findAll().stream()
                .filter(m -> finalOrgId == null || m.getItem() == null || m.getItem().getOrg() == null || m.getItem().getOrg().getId().equals(finalOrgId))
                .sorted(
                        Comparator
                                .comparing(InventoryMovement::getMovementDate,
                                        Comparator.nullsLast(Comparator.naturalOrder()))
                                .thenComparing(InventoryMovement::getMovementTime,
                                        Comparator.nullsLast(Comparator.naturalOrder()))
                                .reversed()
                )
                .map(this::toMovementResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public InventoryItemResponse recordMovement(InventoryMovementRequest req) {
        InventoryItem item = itemRepository.findById(req.getItemId())
                .orElseThrow(() ->
                        new IllegalArgumentException("Item not found: " + req.getItemId())
                );

        System.out.println(":::::::::::::::::::::"+req);
        double qty = req.getQty() != null ? req.getQty() : 0d;
        if (qty <= 0) {
            throw new IllegalArgumentException("Quantity must be > 0");
        }

        double change = computeMovementChange(req.getType(), qty);
        if (change == 0) {
            throw new IllegalArgumentException("Invalid movement type or zero quantity");
        }

        LocalDate date = (req.getDate() != null && !req.getDate().isBlank())
                ? LocalDate.parse(req.getDate())
                : LocalDate.now();
        LocalDateTime now = LocalDateTime.now();

        BigDecimal current = item.getCurrentStock() != null
                ? item.getCurrentStock()
                : BigDecimal.ZERO;

        BigDecimal changeBD = BigDecimal.valueOf(change);
        BigDecimal newStock = current.add(changeBD);
        if (newStock.compareTo(BigDecimal.ZERO) < 0) {
            newStock = BigDecimal.ZERO;
        }

        item.setCurrentStock(newStock);
        item.setUpdatedAt(now);
        itemRepository.save(item);

        InventoryMovement movement = InventoryMovement.builder()
                .item(item)
                .movementDate(date)
                .movementTime(now)
                .movementType(req.getType())
                .quantity(BigDecimal.valueOf(qty))
                .direction(change > 0 ? "IN" : "OUT")
                .balanceAfter(newStock)
                .sourceType("MANUAL")
                .notes(req.getNote())
                .createdAt(now)
                .build();

        movementRepository.save(movement);

        return toItemResponse(item);
    }

    private double computeMovementChange(String type, double qty) {
        if (qty <= 0) return 0d;
        if (type == null) return 0d;

        return switch (type) {
            case "ADJUST_PLUS" -> qty;
            case "ADJUST_MINUS", "WASTAGE" -> -qty;
            default -> 0d;
        };
    }

    private InventoryMovementResponse toMovementResponse(InventoryMovement m) {
        double resulting = m.getBalanceAfter() != null
                ? m.getBalanceAfter().doubleValue()
                : 0d;

        double change = 0d;
        if (m.getQuantity() != null) {
            double q = m.getQuantity().doubleValue();
            change = "OUT".equalsIgnoreCase(m.getDirection()) ? -q : q;
        }

        return InventoryMovementResponse.builder()
                .id(m.getId())
                .itemId(m.getItem().getId())
                .itemName(m.getItem().getName())
                .date(m.getMovementDate() != null ? m.getMovementDate().toString() : "")
                .type(m.getMovementType())
                .change(change)
                .resultingQty(resulting)
                .note(m.getNotes())
                .build();
    }

    // =============================
    // TREATMENT TEMPLATES
    // =============================

    @Transactional(readOnly = true)
    public List<TreatmentTemplateResponse> getAllTemplates() {
        return templateRepository.findAll().stream()
                .map(this::toTemplateResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public TreatmentTemplateResponse saveTemplate(TreatmentTemplateRequest req) {

        LocalDateTime now = LocalDateTime.now();

        InventoryTreatmentTemplate template;
        if (req.getId() != null) {
            template = templateRepository.findById(req.getId())
                    .orElseThrow(() ->
                            new IllegalArgumentException("Template not found: " + req.getId())
                    );
            template.setName(req.getName());
            template.setUpdatedAt(now);

            // orphanRemoval = true → clearing list deletes old rows
            template.getRows().clear();

        } else {
            template = InventoryTreatmentTemplate.builder()
                    .name(req.getName())
                    .createdAt(now)
                    .updatedAt(now)
                    .build();
        }

        // Build new rows
        if (req.getRows() != null) {
            for (TemplateRowRequest rowReq : req.getRows()) {
                if (rowReq.getItemId() == null) {
                    continue;
                }

                // Assume wrapper Double / Integer – handle null safely
                Double perCaseVal = rowReq.getQtyPerTreatment();
                if (perCaseVal == null || perCaseVal <= 0) {
                    continue;
                }

                InventoryItem item = itemRepository.findById(rowReq.getItemId())
                        .orElseThrow(() ->
                                new IllegalArgumentException("Item not found: " + rowReq.getItemId())
                        );

                InventoryTreatmentTemplateRow row = InventoryTreatmentTemplateRow.builder()
                        .template(template)
                        .item(item)
                        .qtyPerTreatment(BigDecimal.valueOf(perCaseVal))
                        .build();

                template.getRows().add(row);
            }
        }

        InventoryTreatmentTemplate saved = templateRepository.save(template);
        return toTemplateResponse(saved);
    }

    @Transactional
    public void deleteTemplate(Long id) {
        templateRepository.deleteById(id);
    }

    private TreatmentTemplateResponse toTemplateResponse(InventoryTreatmentTemplate t) {

        List<TemplateRowResponse> rowResponses = t.getRows().stream()
                .map(r -> TemplateRowResponse.builder()
                        .id(r.getId())
                        .itemId(r.getItem().getId())
                        .itemName(r.getItem().getName())
                        .qtyPerTreatment(
                                r.getQtyPerTreatment() != null
                                        ? r.getQtyPerTreatment().doubleValue()
                                        : 0d
                        )
                        .build())
                .collect(Collectors.toList());

        return TreatmentTemplateResponse.builder()
                .id(t.getId())
                .name(t.getName())
                .rows(rowResponses)
                .build();
    }

    // =============================
    // AUTO STOCK ADJUSTMENT
    // =============================

    @Transactional
    public void applyAutoAdjustment(AutoStockAdjustmentRequest req) {
        InventoryTreatmentTemplate template = templateRepository.findById(req.getTemplateId())
                .orElseThrow(() ->
                        new IllegalArgumentException("Template not found: " + req.getTemplateId())
                );

        // Handle Integer or primitive int safely
        Integer countVal = req.getTreatmentsCount();
        int count = (countVal != null) ? countVal : 0;
        if (count <= 0) {
            throw new IllegalArgumentException("Treatments count must be >= 1");
        }

        LocalDate date = (req.getDate() != null && !req.getDate().isBlank())
                ? LocalDate.parse(req.getDate())
                : LocalDate.now();
        LocalDateTime now = LocalDateTime.now();

        String baseNote = (req.getNote() != null && !req.getNote().isBlank())
                ? req.getNote()
                : count + " × " + template.getName() + " (auto stock adjustment)";

        for (InventoryTreatmentTemplateRow row : template.getRows()) {
            InventoryItem item = row.getItem();
            if (item == null) continue;

            double perCase = row.getQtyPerTreatment() != null
                    ? row.getQtyPerTreatment().doubleValue()
                    : 0d;
            if (perCase <= 0) continue;

            double total = perCase * count;
            if (total <= 0) continue;

            BigDecimal current = item.getCurrentStock() != null
                    ? item.getCurrentStock()
                    : BigDecimal.ZERO;

            BigDecimal deduction = BigDecimal.valueOf(total);
            BigDecimal newStock = current.subtract(deduction);
            if (newStock.compareTo(BigDecimal.ZERO) < 0) {
                newStock = BigDecimal.ZERO;
            }

            item.setCurrentStock(newStock);
            item.setUpdatedAt(now);
            itemRepository.save(item);

            InventoryMovement movement = InventoryMovement.builder()
                    .item(item)
                    .movementDate(date)
                    .movementTime(now)
                    .movementType("AUTO_TEMPLATE")
                    .quantity(deduction)
                    .direction("OUT")
                    .balanceAfter(newStock)
                    .sourceType("TEMPLATE")
                    .notes(baseNote)
                    .createdAt(now)
                    .build();

            movementRepository.save(movement);
        }
    }

    // =============================
    // VENDORS
    // =============================

    @Transactional(readOnly = true)
    public List<VendorResponse> getVendors() {
        return vendorRepository.findAll().stream()
                .map(this::toVendorResponse)
                .collect(Collectors.toList());
    }

    private VendorResponse toVendorResponse(Vendor v) {
        return VendorResponse.builder()
                .id(v.getId())
                .name(v.getName())
                .mobile(v.getMobile())
                .build();
    }
}
