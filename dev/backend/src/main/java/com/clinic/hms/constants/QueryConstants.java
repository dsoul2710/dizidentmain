package com.clinic.hms.constants;

/**
 * Central repository of all JPQL / native query strings used by Spring Data repositories.
 * <p>
 * Queries are grouped by entity domain in static inner classes so callers can
 * reference them as {@code QueryConstants.Patient.LIST}, etc.
 * </p>
 */
public final class QueryConstants {

    private QueryConstants() {
        throw new UnsupportedOperationException("Utility class");
    }

    // =========================================================================
    // Patient
    // =========================================================================
    public static final class Patient {
        private Patient() {}

        public static final String LIST =
                "SELECT p FROM Patient p JOIN p.user u WHERE p.isDeleted = false " +
                "AND (:orgId is null or exists (select 1 from PatientOrgMapping m where m.org.id = :orgId and m.patient.id = p.id and m.status = 'ACTIVE')) " +
                "AND (:doctorId is null or exists (select 1 from PatientDoctorMapping pm where pm.doctor.id = :doctorId and pm.patient.id = p.id and pm.status = 'ACTIVE'))";

        public static final String SEARCH = """
                select p from Patient p
                join p.user u
                where p.isDeleted = false
                  and (:orgId is null or exists (
                        select 1 from com.clinic.hms.entity.PatientOrgMapping m \
                        where m.org.id = :orgId and m.patient.id = p.id and m.status = 'ACTIVE'
                      ))
                  and (:doctorId is null or exists (
                        select 1 from com.clinic.hms.entity.PatientDoctorMapping pm
                        where pm.doctor.id = :doctorId and pm.patient.id = p.id and pm.status = 'ACTIVE'
                      ))
                  and (
                    :q is null or :q = '' or
                    lower(p.fullName) like lower(concat('%', :q, '%')) or
                    lower(u.mobile) like lower(concat('%', :q, '%')) or
                    lower(p.city) like lower(concat('%', :q, '%')) or
                    lower(p.referredBy) like lower(concat('%', :q, '%')) or
                    lower(p.uniqueId) like lower(concat('%', :q, '%'))
                  )
                """;

        public static final String SEARCH_COUNT = """
                select count(p) from Patient p
                join p.user u
                where p.isDeleted = false
                  and (:orgId is null or exists (
                        select 1 from com.clinic.hms.entity.PatientOrgMapping m \
                        where m.org.id = :orgId and m.patient.id = p.id and m.status = 'ACTIVE'
                      ))
                  and (:doctorId is null or exists (
                        select 1 from com.clinic.hms.entity.PatientDoctorMapping pm
                        where pm.doctor.id = :doctorId and pm.patient.id = p.id and pm.status = 'ACTIVE'
                      ))
                  and (
                    :q is null or :q = '' or
                    lower(p.fullName) like lower(concat('%', :q, '%')) or
                    lower(u.mobile) like lower(concat('%', :q, '%')) or
                    lower(p.city) like lower(concat('%', :q, '%')) or
                    lower(p.referredBy) like lower(concat('%', :q, '%')) or
                    lower(p.uniqueId) like lower(concat('%', :q, '%'))
                  )
                """;
    }

    // =========================================================================
    // Doctor
    // =========================================================================
    public static final class Doctor {
        private Doctor() {}

        public static final String SEARCH = """
                select d from Doctor d
                join d.user u
                where d.isDeleted = false
                  and (:orgId is null or exists (
                        select 1 from com.clinic.hms.entity.DoctorOrgMapping m \
                        where m.org.id = :orgId and m.doctor.id = d.id and m.status = 'ACTIVE'
                      ))
                  and (
                    :q is null or :q = '' or
                    lower(d.fullName) like lower(concat('%', :q, '%')) or
                    lower(d.speciality) like lower(concat('%', :q, '%')) or
                    lower(u.mobile) like lower(concat('%', :q, '%'))
                  )
                """;

        public static final String SEARCH_COUNT = """
                select count(d) from Doctor d
                join d.user u
                where d.isDeleted = false
                  and (:orgId is null or exists (
                        select 1 from com.clinic.hms.entity.DoctorOrgMapping m \
                        where m.org.id = :orgId and m.doctor.id = d.id and m.status = 'ACTIVE'
                      ))
                  and (
                    :q is null or :q = '' or
                    lower(d.fullName) like lower(concat('%', :q, '%')) or
                    lower(d.speciality) like lower(concat('%', :q, '%')) or
                    lower(u.mobile) like lower(concat('%', :q, '%'))
                  )
                """;
    }

    // =========================================================================
    // ServiceProvider
    // =========================================================================
    public static final class ServiceProvider {
        private ServiceProvider() {}

        public static final String SEARCH = """
                select sp from ServiceProvider sp
                join sp.user u
                where sp.isDeleted = false
                  and (:orgId is null or exists (
                        select 1 from com.clinic.hms.entity.ServiceProviderOrgMapping m \
                        where m.org.id = :orgId and m.serviceProvider.id = sp.id and m.status = 'ACTIVE'
                      ))
                  and (
                    :q is null or :q = '' or
                    lower(sp.providerName) like lower(concat('%', :q, '%')) or
                    lower(u.mobile) like lower(concat('%', :q, '%'))
                  )
                """;

        public static final String SEARCH_COUNT = """
                select count(sp) from ServiceProvider sp
                join sp.user u
                where sp.isDeleted = false
                  and (:orgId is null or exists (
                        select 1 from com.clinic.hms.entity.ServiceProviderOrgMapping m \
                        where m.org.id = :orgId and m.serviceProvider.id = sp.id and m.status = 'ACTIVE'
                      ))
                  and (
                    :q is null or :q = '' or
                    lower(sp.providerName) like lower(concat('%', :q, '%')) or
                    lower(u.mobile) like lower(concat('%', :q, '%'))
                  )
                """;
    }

    // =========================================================================
    // Vendor
    // =========================================================================
    public static final class Vendor {
        private Vendor() {}

        public static final String SEARCH = """
                select v from Vendor v
                where :q is null or :q = '' or
                  lower(v.name) like lower(concat('%', :q, '%')) or
                  lower(v.address) like lower(concat('%', :q, '%')) or
                  lower(v.mobile) like lower(concat('%', :q, '%')) or
                  lower(v.category) like lower(concat('%', :q, '%')) or
                  lower(v.gstNo) like lower(concat('%', :q, '%'))
                """;

        public static final String SEARCH_COUNT = """
                select count(v) from Vendor v
                where :q is null or :q = '' or
                  lower(v.name) like lower(concat('%', :q, '%')) or
                  lower(v.address) like lower(concat('%', :q, '%')) or
                  lower(v.mobile) like lower(concat('%', :q, '%')) or
                  lower(v.category) like lower(concat('%', :q, '%')) or
                  lower(v.gstNo) like lower(concat('%', :q, '%'))
                """;

        public static final String SEARCH_BY_ORG = """
                select v from Vendor v
                where (v.org.id = :orgId) and (:q is null or :q = '' or
                  lower(v.name) like lower(concat('%', :q, '%')) or
                  lower(v.address) like lower(concat('%', :q, '%')) or
                  lower(v.mobile) like lower(concat('%', :q, '%')) or
                  lower(v.category) like lower(concat('%', :q, '%')) or
                  lower(v.gstNo) like lower(concat('%', :q, '%')))
                """;

        public static final String SEARCH_BY_ORG_COUNT = """
                select count(v) from Vendor v
                where (v.org.id = :orgId) and (:q is null or :q = '' or
                  lower(v.name) like lower(concat('%', :q, '%')) or
                  lower(v.address) like lower(concat('%', :q, '%')) or
                  lower(v.mobile) like lower(concat('%', :q, '%')) or
                  lower(v.category) like lower(concat('%', :q, '%')) or
                  lower(v.gstNo) like lower(concat('%', :q, '%')))
                """;
    }

    // =========================================================================
    // Lab
    // =========================================================================
    public static final class Lab {
        private Lab() {}

        public static final String SEARCH = """
                select l from Lab l
                where :q is null or :q = '' or
                  lower(l.name) like lower(concat('%', :q, '%')) or
                  lower(l.address) like lower(concat('%', :q, '%')) or
                  lower(l.mobile) like lower(concat('%', :q, '%'))
                """;

        public static final String SEARCH_COUNT = """
                select count(l) from Lab l
                where :q is null or :q = '' or
                  lower(l.name) like lower(concat('%', :q, '%')) or
                  lower(l.address) like lower(concat('%', :q, '%')) or
                  lower(l.mobile) like lower(concat('%', :q, '%'))
                """;

        public static final String SEARCH_BY_ORG = """
                select l from Lab l
                where (l.org.id = :orgId) and (:q is null or :q = '' or
                  lower(l.name) like lower(concat('%', :q, '%')) or
                  lower(l.address) like lower(concat('%', :q, '%')) or
                  lower(l.mobile) like lower(concat('%', :q, '%')))
                """;

        public static final String SEARCH_BY_ORG_COUNT = """
                select count(l) from Lab l
                where (l.org.id = :orgId) and (:q is null or :q = '' or
                  lower(l.name) like lower(concat('%', :q, '%')) or
                  lower(l.address) like lower(concat('%', :q, '%')) or
                  lower(l.mobile) like lower(concat('%', :q, '%')))
                """;
    }

    // =========================================================================
    // Visit
    // =========================================================================
    public static final class Visit {
        private Visit() {}

        public static final String CLEAR_DOCTOR =
                "update Visit v set v.doctor = null where v.doctor.id = :doctorUserId";
    }

    // =========================================================================
    // Bill
    // =========================================================================
    public static final class Bill {
        private Bill() {}

        public static final String CLEAR_DOCTOR =
                "update Bill b set b.doctor = null where b.doctor.id = :doctorUserId";
    }

    // =========================================================================
    // ChatThread
    // =========================================================================
    public static final class ChatThread {
        private ChatThread() {}

        public static final String FIND_IDS_BY_PATIENT =
                "select t.id from ChatThread t where t.patient.id = :patientUserId";

        public static final String FIND_IDS_BY_DOCTOR =
                "select t.id from ChatThread t where t.doctor.id = :doctorUserId";

        public static final String FIND_IDS_BY_VISIT_NATIVE =
                "select id from chat_threads where visit_id = :visitId";

        public static final String DELETE_BY_VISIT_NATIVE =
                "delete from chat_threads where visit_id = :visitId";
    }

    // =========================================================================
    // ChatMessage
    // =========================================================================
    public static final class ChatMessage {
        private ChatMessage() {}

        public static final String COUNT_UNREAD_BY_SENDER =
                "select m.sender.id, count(m) from ChatMessage m " +
                "where m.receiver.id = :receiverId and m.isRead = false " +
                "group by m.sender.id";
    }
}
