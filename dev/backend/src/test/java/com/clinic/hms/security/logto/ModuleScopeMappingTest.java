package com.clinic.hms.security.logto;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ModuleScopeMappingTest {

    @Test
    void mapsPatientsModuleToScopes() {
        assertEquals("patients:read", ModuleScopeMapping.scopeFor("PATIENTS", "read").orElseThrow());
        assertEquals("patients:edit", ModuleScopeMapping.scopeFor("PATIENTS", "edit").orElseThrow());
        assertEquals("pharmacy:edit", ModuleScopeMapping.scopeFor("PHARMACY_ORDERS_MODULE", "edit").orElseThrow());
    }
}
