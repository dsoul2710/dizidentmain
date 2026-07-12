-- Multi-org attribution: operation_scope + source_org_id
-- Expand-contract: add nullable FKs, backfill, then constrain operation_scope

ALTER TABLE doctors
    ADD COLUMN IF NOT EXISTS operation_scope VARCHAR(20);

ALTER TABLE service_providers
    ADD COLUMN IF NOT EXISTS operation_scope VARCHAR(20);

UPDATE doctors
SET operation_scope = 'INDEPENDENT'
WHERE operation_scope IS NULL;

UPDATE service_providers
SET operation_scope = 'INDEPENDENT'
WHERE operation_scope IS NULL;

ALTER TABLE doctors
    ALTER COLUMN operation_scope SET DEFAULT 'INDEPENDENT';

ALTER TABLE service_providers
    ALTER COLUMN operation_scope SET DEFAULT 'INDEPENDENT';

ALTER TABLE doctors
    ALTER COLUMN operation_scope SET NOT NULL;

ALTER TABLE service_providers
    ALTER COLUMN operation_scope SET NOT NULL;

ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS source_org_id BIGINT;

ALTER TABLE visits
    ADD COLUMN IF NOT EXISTS source_org_id BIGINT;

ALTER TABLE service_orders
    ADD COLUMN IF NOT EXISTS source_org_id BIGINT;

-- Backfill from owner when owner is an org hospital user (org id == user id via MapsId)
UPDATE appointments a
SET source_org_id = a.owner_user_id
FROM users u
WHERE a.source_org_id IS NULL
  AND a.owner_user_id IS NOT NULL
  AND u.id = a.owner_user_id
  AND u.role = 'ORG_HOSPITAL'
  AND EXISTS (SELECT 1 FROM org_hospitals o WHERE o.user_id = a.owner_user_id);

UPDATE visits v
SET source_org_id = v.owner_user_id
FROM users u
WHERE v.source_org_id IS NULL
  AND v.owner_user_id IS NOT NULL
  AND u.id = v.owner_user_id
  AND u.role = 'ORG_HOSPITAL'
  AND EXISTS (SELECT 1 FROM org_hospitals o WHERE o.user_id = v.owner_user_id);

-- service_orders has requester, not owner — best-effort when requester is org hospital
UPDATE service_orders so
SET source_org_id = so.requester_user_id
FROM users u
WHERE so.source_org_id IS NULL
  AND so.requester_user_id IS NOT NULL
  AND u.id = so.requester_user_id
  AND u.role = 'ORG_HOSPITAL'
  AND EXISTS (SELECT 1 FROM org_hospitals o WHERE o.user_id = so.requester_user_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_appointments_source_org'
    ) THEN
        ALTER TABLE appointments
            ADD CONSTRAINT fk_appointments_source_org
            FOREIGN KEY (source_org_id) REFERENCES org_hospitals (user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_visits_source_org'
    ) THEN
        ALTER TABLE visits
            ADD CONSTRAINT fk_visits_source_org
            FOREIGN KEY (source_org_id) REFERENCES org_hospitals (user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_service_orders_source_org'
    ) THEN
        ALTER TABLE service_orders
            ADD CONSTRAINT fk_service_orders_source_org
            FOREIGN KEY (source_org_id) REFERENCES org_hospitals (user_id);
    END IF;
END $$;
