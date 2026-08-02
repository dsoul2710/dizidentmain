package com.clinic.hms;

import com.clinic.hms.entity.*;
import com.clinic.hms.repository.*;
import com.clinic.hms.service.TreatmentPlanService;
import com.clinic.hms.security.SecurityUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class BoundaryIsolationTests {

    @Mock
    private ProcedurePriceListRepository priceListRepository;

    @Mock
    private TreatmentProcedureMasterRepository procedureRepository;

    @Mock
    private TreatmentCategoryMasterRepository categoryRepository;

    @Mock
    private SecurityUtils securityUtils;

    @InjectMocks
    private TreatmentPlanService treatmentPlanService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testResolvePrice_DirectDoctorPatient() {
        String catKey = "DIAGNOSIS";
        String procName = "Root Canal";
        Long doctorUserId = 101L;

        when(securityUtils.getCurrentUserRole()).thenReturn("DOCTOR");
        when(securityUtils.getActiveOrgId()).thenReturn(null);
        when(securityUtils.getCurrentUserId()).thenReturn(doctorUserId);

        TreatmentCategoryMaster category = new TreatmentCategoryMaster();
        category.setId(1L);
        category.setCategoryKey(catKey);
        when(categoryRepository.findByCategoryKey(catKey)).thenReturn(Optional.of(category));

        TreatmentProcedureMaster procedure = new TreatmentProcedureMaster();
        procedure.setId(2L);
        procedure.setName(procName);
        procedure.setCategory(category);
        when(procedureRepository.findByCategoryAndNameIgnoreCase(category, procName)).thenReturn(Optional.of(procedure));

        ProcedurePriceList priceList = new ProcedurePriceList();
        priceList.setPrice(BigDecimal.valueOf(120.0));
        when(priceListRepository.findByOwner_IdAndProcedure_Id(doctorUserId, 2L)).thenReturn(Optional.of(priceList));

        Double resolvedPrice = treatmentPlanService.resolvePrice(catKey, procName);
        assertEquals(120.0, resolvedPrice);
    }

    @Test
    void testResolvePrice_ReferredOrgPatient() {
        String catKey = "DIAGNOSIS";
        String procName = "Root Canal";
        Long doctorUserId = 101L;
        Long orgId = 500L;

        when(securityUtils.getCurrentUserRole()).thenReturn("DOCTOR");
        when(securityUtils.getActiveOrgId()).thenReturn(orgId);
        when(securityUtils.getCurrentUserId()).thenReturn(doctorUserId);

        TreatmentCategoryMaster category = new TreatmentCategoryMaster();
        category.setId(1L);
        category.setCategoryKey(catKey);
        when(categoryRepository.findByCategoryKey(catKey)).thenReturn(Optional.of(category));

        TreatmentProcedureMaster procedure = new TreatmentProcedureMaster();
        procedure.setId(2L);
        procedure.setName(procName);
        procedure.setCategory(category);
        when(procedureRepository.findByCategoryAndNameIgnoreCase(category, procName)).thenReturn(Optional.of(procedure));

        ProcedurePriceList priceList = new ProcedurePriceList();
        priceList.setPrice(BigDecimal.valueOf(150.0));
        // Org pricing list returned
        when(priceListRepository.findByOwner_IdAndProcedure_Id(orgId, 2L)).thenReturn(Optional.of(priceList));

        Double resolvedPrice = treatmentPlanService.resolvePrice(catKey, procName);
        assertEquals(150.0, resolvedPrice);
    }
}
