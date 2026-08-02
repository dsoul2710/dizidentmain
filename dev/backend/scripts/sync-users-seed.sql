-- Export current users into users_seed.json shape (run from dev/backend/scripts)
-- Usage (PowerShell):
--   cd dizidentmain/dev/backend/scripts
--   .\sync-users-seed.ps1
--
-- Requires local PostgreSQL on localhost:5432/clinic_hms
-- Password is read from ../src/main/resources/application-dev.properties

\set ON_ERROR_STOP on
\pset format unaligned
\pset tuples_only on

SELECT jsonb_pretty(jsonb_build_object(
  'generatedAt', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS'),
  'users', (
    SELECT jsonb_agg(u ORDER BY u->>'role', u->>'mobile')
    FROM (
      SELECT jsonb_strip_nulls(jsonb_build_object(
        'mobile', us.mobile,
        'role', us.role,
        'isActive', us.is_active,
        'superAdmin', CASE WHEN sa.user_id IS NOT NULL THEN jsonb_build_object('fullName', sa.full_name) END,
        'orgHospital', CASE WHEN oh.user_id IS NOT NULL THEN jsonb_build_object('orgName', oh.org_name, 'uniqueId', oh.unique_id) END,
        'doctor', CASE WHEN d.user_id IS NOT NULL THEN jsonb_build_object(
          'fullName', d.full_name,
          'uniqueId', d.unique_id,
          'speciality', d.speciality,
          'operationScope', d.operation_scope
        ) END,
        'patient', CASE WHEN p.user_id IS NOT NULL THEN jsonb_build_object(
          'fullName', p.full_name,
          'uniqueId', p.unique_id,
          'ageYears', p.age_years,
          'gender', p.gender,
          'dob', p.dob::text
        ) END,
        'serviceProvider', CASE WHEN sp.user_id IS NOT NULL THEN jsonb_build_object(
          'providerName', sp.provider_name,
          'providerType', sp.provider_type,
          'providerTypes', (
            SELECT jsonb_agg(spt.provider_type ORDER BY spt.provider_type)
            FROM service_provider_types spt
            WHERE spt.service_provider_id = sp.user_id
          ),
          'address', sp.address,
          'uniqueId', sp.unique_id,
          'operationScope', sp.operation_scope
        ) END,
        'doctorOrgMobiles', (
          SELECT jsonb_agg(ou.mobile ORDER BY ou.mobile)
          FROM doctor_org_mappings dom
          JOIN org_hospitals ohx ON ohx.user_id = dom.org_id
          JOIN users ou ON ou.id = ohx.user_id
          WHERE dom.doctor_id = d.user_id
        ),
        'patientOrgMobiles', (
          SELECT jsonb_agg(ou.mobile ORDER BY ou.mobile)
          FROM patient_org_mappings pom
          JOIN org_hospitals ohx ON ohx.user_id = pom.org_id
          JOIN users ou ON ou.id = ohx.user_id
          WHERE pom.patient_id = p.user_id
        ),
        'patientDoctorMobiles', (
          SELECT jsonb_agg(du.mobile ORDER BY du.mobile)
          FROM patient_doctor_mappings pdm
          JOIN doctors dx ON dx.user_id = pdm.doctor_id
          JOIN users du ON du.id = dx.user_id
          WHERE pdm.patient_id = p.user_id
        ),
        'serviceProviderOrgMobiles', (
          SELECT jsonb_agg(ou.mobile ORDER BY ou.mobile)
          FROM service_provider_org_mappings spom
          JOIN org_hospitals ohx ON ohx.user_id = spom.org_id
          JOIN users ou ON ou.id = ohx.user_id
          WHERE spom.service_provider_id = sp.user_id
        )
      )) AS u
      FROM users us
      LEFT JOIN super_admins sa ON sa.user_id = us.id
      LEFT JOIN org_hospitals oh ON oh.user_id = us.id
      LEFT JOIN doctors d ON d.user_id = us.id
      LEFT JOIN patients p ON p.user_id = us.id
      LEFT JOIN service_providers sp ON sp.user_id = us.id
    ) sub
  )
));
