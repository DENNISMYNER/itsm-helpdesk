-- Database-level guarantees that hold even if application code is bypassed
-- (manual SQL, a second service, a buggy deploy ...).

-- ---------------------------------------------------------------------------
-- 1. Ticket numbers start at 1001 so references look like ITSM-1001.
-- ---------------------------------------------------------------------------
ALTER SEQUENCE "tickets_number_seq" RESTART WITH 1001;

-- ---------------------------------------------------------------------------
-- 2. Status state machine
--    OPEN -> IN_PROGRESS -> WAITING_ON_CUSTOMER -> RESOLVED -> CLOSED
--    (plus the legal back-edges below). The allowed edges live in a lookup
--    table so they are data, not code, and can be inspected with plain SQL.
-- ---------------------------------------------------------------------------
INSERT INTO "ticket_status_transitions" ("fromStatus", "toStatus") VALUES
  ('OPEN',                'IN_PROGRESS'),
  ('IN_PROGRESS',         'WAITING_ON_CUSTOMER'),
  ('IN_PROGRESS',         'RESOLVED'),
  ('WAITING_ON_CUSTOMER', 'IN_PROGRESS'),
  ('WAITING_ON_CUSTOMER', 'RESOLVED'),
  ('RESOLVED',            'CLOSED'),
  ('RESOLVED',            'IN_PROGRESS');

CREATE OR REPLACE FUNCTION enforce_ticket_status_transition() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW."status" <> 'OPEN' THEN
      RAISE EXCEPTION 'INVALID_INITIAL_STATUS: new tickets must start as OPEN (got %)', NEW."status"
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW."status" IS DISTINCT FROM OLD."status" THEN
    IF NOT EXISTS (
      SELECT 1
      FROM "ticket_status_transitions" t
      WHERE t."fromStatus" = OLD."status" AND t."toStatus" = NEW."status"
    ) THEN
      RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: % -> %', OLD."status", NEW."status"
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "tickets_status_guard"
  BEFORE INSERT OR UPDATE OF "status" ON "tickets"
  FOR EACH ROW EXECUTE FUNCTION enforce_ticket_status_transition();

-- Lifecycle timestamps must agree with the status.
ALTER TABLE "tickets"
  ADD CONSTRAINT "tickets_resolved_requires_resolvedAt"
    CHECK ("status" NOT IN ('RESOLVED', 'CLOSED') OR "resolvedAt" IS NOT NULL),
  ADD CONSTRAINT "tickets_closed_requires_closedAt"
    CHECK ("status" <> 'CLOSED' OR "closedAt" IS NOT NULL);

-- ---------------------------------------------------------------------------
-- 3. Immutable audit log: no UPDATE, DELETE or TRUNCATE, ever.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION forbid_audit_log_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AUDIT_LOG_IMMUTABLE: % on audit_logs is not allowed', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "audit_logs_immutable_rows"
  BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION forbid_audit_log_change();

CREATE TRIGGER "audit_logs_immutable_truncate"
  BEFORE TRUNCATE ON "audit_logs"
  FOR EACH STATEMENT EXECUTE FUNCTION forbid_audit_log_change();
