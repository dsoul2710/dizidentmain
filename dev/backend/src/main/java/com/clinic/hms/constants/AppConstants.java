package com.clinic.hms.constants;

/**
 * Central repository of all application-wide constant strings.
 * <p>
 * Group constants into inner static classes by domain so callers can use
 * {@code AppConstants.Roles.DOCTOR}, {@code AppConstants.Status.ACTIVE}, etc.
 * </p>
 * <p>
 * Rules:
 * <ul>
 *   <li>Only immutable, non-configurable string literals belong here.</li>
 *   <li>Never instantiate this class — it is a pure constants holder.</li>
 * </ul>
 * </p>
 */
public final class AppConstants {

    private AppConstants() {
        throw new UnsupportedOperationException("Utility class");
    }

    // -------------------------------------------------------------------------
    // User Roles  (must match UserRole enum names used as plain strings)
    // -------------------------------------------------------------------------
    public static final class Roles {
        private Roles() {}

        public static final String DOCTOR           = "DOCTOR";
        public static final String PATIENT          = "PATIENT";
        public static final String SERVICE_PROVIDER = "SERVICE_PROVIDER";
        public static final String SUPER_ADMIN      = "SUPER_ADMIN";
        public static final String ORG_HOSPITAL     = "ORG_HOSPITAL";
        public static final String NURSE            = "NURSE";
    }

    // -------------------------------------------------------------------------
    // Mapping / Association statuses
    // -------------------------------------------------------------------------
    public static final class Status {
        private Status() {}

        /** Entity is live and in use. */
        public static final String ACTIVE   = "ACTIVE";
        /** Entity has been deactivated but not deleted. */
        public static final String INACTIVE = "INACTIVE";
        /** Awaiting approval / action. */
        public static final String PENDING  = "PENDING";
    }

    // -------------------------------------------------------------------------
    // Visit / Appointment workflow statuses
    // -------------------------------------------------------------------------
    public static final class VisitStatus {
        private VisitStatus() {}

        public static final String OPEN      = "OPEN";
        public static final String COMPLETED = "COMPLETED";
        public static final String CANCELLED = "CANCELLED";
    }

    public static final class AppointmentStatus {
        private AppointmentStatus() {}

        public static final String BOOKED    = "BOOKED";
        public static final String CANCELLED = "CANCELLED";
        public static final String COMPLETED = "COMPLETED";
    }

    // -------------------------------------------------------------------------
    // Inventory movement / source types
    // -------------------------------------------------------------------------
    public static final class InventoryMovement {
        private InventoryMovement() {}

        public static final String OPENING    = "OPENING";
        public static final String PURCHASE   = "PURCHASE";
        public static final String SALE       = "SALE";
        public static final String CONSUME    = "CONSUME";
        public static final String TRANSFER   = "TRANSFER";
        public static final String ADJUSTMENT = "ADJUSTMENT";
    }

    // -------------------------------------------------------------------------
    // Chat thread types
    // -------------------------------------------------------------------------
    public static final class ChatType {
        private ChatType() {}

        public static final String ORG_DOCTOR      = "ORG_DOCTOR";
        public static final String ORG_PATIENT     = "ORG_PATIENT";
        public static final String DOCTOR_PATIENT  = "DOCTOR_PATIENT";
    }

    // -------------------------------------------------------------------------
    // HTTP request headers used throughout the application
    // -------------------------------------------------------------------------
    public static final class Headers {
        private Headers() {}

        public static final String ACTIVE_ORG_ID = "X-Active-Org-Id";
        public static final String USER_ID        = "X-User-Id";
        public static final String ROLE           = "X-Role";
    }

    // -------------------------------------------------------------------------
    // Patient unique-ID generation
    // -------------------------------------------------------------------------
    public static final class PatientId {
        private PatientId() {}

        /** Prefix used in auto-generated patient unique IDs, e.g. PAT-000001. */
        public static final String PREFIX  = "PAT-";
        /** Printf-style format pattern for the numeric suffix (6 zero-padded digits). */
        public static final String FORMAT  = "%06d";
        /** Upper bound (exclusive) used with Math.random() to produce the numeric part. */
        public static final int    RANGE   = 1_000_000;
    }

    // -------------------------------------------------------------------------
    // Doctor unique-ID generation
    // -------------------------------------------------------------------------
    public static final class DoctorId {
        private DoctorId() {}

        /** Prefix used in auto-generated doctor unique IDs, e.g. DOC-000001. */
        public static final String PREFIX = "DOC-";
        /** Printf-style format pattern for the numeric suffix (6 zero-padded digits). */
        public static final String FORMAT = "%06d";
        /** Upper bound (exclusive) used with Math.random() to produce the numeric part. */
        public static final int    RANGE  = 1_000_000;
    }

    // -------------------------------------------------------------------------
    // Service Provider Types
    // -------------------------------------------------------------------------
    public static final class ProviderTypes {
        private ProviderTypes() {}

        public static final String LAB          = "LAB";
        public static final String PHARMACY     = "PHARMACY";
        public static final String BEDS_MANAGER = "BEDS_MANAGER";
        public static final String RADIOLOGY    = "RADIOLOGY";
        public static final String PATHOLOGY    = "PATHOLOGY";
        public static final String BLOOD_BANK   = "BLOOD_BANK";
        public static final String AMBULANCE    = "AMBULANCE";
        public static final String OTHER        = "OTHER";

        public static final java.util.List<String> ALL = java.util.List.of(
            LAB, PHARMACY, BEDS_MANAGER, RADIOLOGY, PATHOLOGY, BLOOD_BANK, AMBULANCE, OTHER
        );
    }
}

