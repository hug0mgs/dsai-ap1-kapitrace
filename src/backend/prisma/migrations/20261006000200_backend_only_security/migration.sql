-- Backend-only access. Works on Supabase and ordinary PostgreSQL.
-- Runtime uses a trusted database owner/BYPASSRLS role; Auth is our JWT middleware.
DO $$
DECLARE
  table_name TEXT;
  role_name TEXT;
  schema_name TEXT := current_schema();
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'User', 'AuditLog', 'Watchlist', 'IpCache', 'DomainCache', 'HashCache', 'EmailCache'
  ] LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', schema_name, table_name);
    EXECUTE format('REVOKE ALL ON TABLE %I.%I FROM PUBLIC', schema_name, table_name);
    FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
        EXECUTE format('REVOKE ALL ON TABLE %I.%I FROM %I', schema_name, table_name, role_name);
      END IF;
    END LOOP;
  END LOOP;
  FOREACH table_name IN ARRAY ARRAY['IpCache', 'DomainCache', 'HashCache', 'EmailCache'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = table_name || '_threatScore_range' AND conrelid = format('%I.%I', schema_name, table_name)::regclass) THEN
      EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I CHECK ("threatScore" BETWEEN 0 AND 100)', schema_name, table_name, table_name || '_threatScore_range');
    END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_role_allowed' AND conrelid = format('%I."User"', schema_name)::regclass) THEN
    EXECUTE format('ALTER TABLE %I."User" ADD CONSTRAINT "User_role_allowed" CHECK (role IN (''admin'', ''analyst'', ''viewer''))', schema_name);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Watchlist_itemType_allowed' AND conrelid = format('%I."Watchlist"', schema_name)::regclass) THEN
    EXECUTE format('ALTER TABLE %I."Watchlist" ADD CONSTRAINT "Watchlist_itemType_allowed" CHECK ("itemType" IN (''ip'', ''domain'', ''hash'', ''email''))', schema_name);
  END IF;
END;
$$;
-- Keep the indices when adopting tables previously created via SQL Editor.
CREATE INDEX IF NOT EXISTS "Watchlist_userId_createdAt_idx" ON "Watchlist" ("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "AuditLog_userId_createdAt_idx" ON "AuditLog" ("userId", "createdAt" DESC);
