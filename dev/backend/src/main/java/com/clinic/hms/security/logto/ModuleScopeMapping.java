package com.clinic.hms.security.logto;

import java.util.Map;
import java.util.Optional;

/**
 * Maps HMS module names to Logto API scopes for authorization bridge.
 */
public final class ModuleScopeMapping {

    private ModuleScopeMapping() {
    }

    private static final Map<String, String> MODULE_READ_SCOPE = Map.ofEntries(
            Map.entry("PATIENTS", "patients:read"),
            Map.entry("DOCTORS", "doctors:read"),
            Map.entry("APPOINTMENTS", "appointments:read"),
            Map.entry("PHARMACY_ORDERS_MODULE", "pharmacy:read"),
            Map.entry("BED_ALLOCATION_MODULE", "beds:read"),
            Map.entry("INVENTORY", "inventory:read"),
            Map.entry("LAB_ORDERS_MODULE", "lab:read"),
            Map.entry("BILLING_FINANCE", "billing:read"),
            Map.entry("USER_MANAGEMENT", "members:read"),
            Map.entry("PRESCRIPTION", "prescriptions:read")
    );

    private static final Map<String, String> MODULE_EDIT_SCOPE = Map.ofEntries(
            Map.entry("PATIENTS", "patients:edit"),
            Map.entry("DOCTORS", "doctors:manage"),
            Map.entry("APPOINTMENTS", "appointments:manage"),
            Map.entry("PHARMACY_ORDERS_MODULE", "pharmacy:edit"),
            Map.entry("BED_ALLOCATION_MODULE", "beds:edit"),
            Map.entry("INVENTORY", "inventory:edit"),
            Map.entry("LAB_ORDERS_MODULE", "lab:manage"),
            Map.entry("BILLING_FINANCE", "billing:manage"),
            Map.entry("USER_MANAGEMENT", "members:manage"),
            Map.entry("PRESCRIPTION", "prescriptions:read")
    );

    private static final Map<String, String> MODULE_DELETE_SCOPE = Map.ofEntries(
            Map.entry("PATIENTS", "patients:delete"),
            Map.entry("USER_MANAGEMENT", "members:manage")
    );

    public static Optional<String> scopeFor(String moduleName, String action) {
        if (moduleName == null || action == null) {
            return Optional.empty();
        }
        return switch (action.toLowerCase()) {
            case "view", "read" -> Optional.ofNullable(MODULE_READ_SCOPE.get(moduleName));
            case "edit" -> Optional.ofNullable(MODULE_EDIT_SCOPE.get(moduleName));
            case "delete" -> Optional.ofNullable(MODULE_DELETE_SCOPE.get(moduleName));
            default -> Optional.empty();
        };
    }

    public static boolean isPlatformScope(String scope) {
        return scope != null && scope.startsWith("platform:");
    }
}
