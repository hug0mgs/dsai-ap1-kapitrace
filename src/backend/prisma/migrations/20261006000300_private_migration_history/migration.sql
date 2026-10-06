-- Supabase grants can otherwise expose migration metadata/logs through the Data API.
-- Owner/BYPASSRLS remains able to maintain migration history.
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "_prisma_migrations" FROM PUBLIC;
DO $$
DECLARE
  role_name TEXT;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON TABLE %I.%I FROM %I', current_schema(), '_prisma_migrations', role_name);
    END IF;
  END LOOP;
END;
$$;
