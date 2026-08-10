-- [TSC-26] Make audit_log truly append-only at the database level.
--
-- The original db-schema approach (REVOKE UPDATE, DELETE ... FROM PUBLIC) does
-- NOT work: a table's OWNER bypasses GRANT/REVOKE, and the app connects as the
-- owning role. A trigger, by contrast, fires regardless of role — so it blocks
-- UPDATE/DELETE/TRUNCATE for everyone, including the owner. INSERT and SELECT
-- are unaffected, so writing audit entries and reading them still work.

CREATE OR REPLACE FUNCTION audit_log_prevent_mutation()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only: % is not permitted', TG_OP
    USING ERRCODE = 'check_violation';
END;
$$;

-- Row-level guard for UPDATE/DELETE.
DROP TRIGGER IF EXISTS audit_log_no_update_delete ON audit_log;
CREATE TRIGGER audit_log_no_update_delete
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW
  EXECUTE FUNCTION audit_log_prevent_mutation();

-- Statement-level guard for TRUNCATE (row triggers don't fire on TRUNCATE).
DROP TRIGGER IF EXISTS audit_log_no_truncate ON audit_log;
CREATE TRIGGER audit_log_no_truncate
  BEFORE TRUNCATE ON audit_log
  FOR EACH STATEMENT
  EXECUTE FUNCTION audit_log_prevent_mutation();