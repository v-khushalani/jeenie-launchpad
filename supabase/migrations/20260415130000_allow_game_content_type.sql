DO $$
DECLARE
  constraint_name text;
  BEGIN
    -- If educator_content doesn't exist in this environment, skip safely.
      IF to_regclass('public.educator_content') IS NULL THEN
          RAISE NOTICE 'public.educator_content not found; skipping content_type migration';
              RETURN;
                END IF;

                  -- Find and drop any existing CHECK constraint that references content_type.
                    FOR constraint_name IN
                        SELECT con.conname
                            FROM pg_constraint con
                                JOIN pg_class rel ON rel.oid = con.conrelid
                                    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
                                        WHERE nsp.nspname = 'public'
                                              AND rel.relname = 'educator_content'
                                                    AND con.contype = 'c'
                                                          AND pg_get_constraintdef(con.oid) ILIKE '%content_type%'
                                                            LOOP
                                                                EXECUTE format('ALTER TABLE public.educator_content DROP CONSTRAINT IF EXISTS %I', constraint_name);
                                                                  END LOOP;

                                                                    -- Recreate check constraint with explicit allowed values including game.
                                                                      ALTER TABLE public.educator_content
                                                                          ADD CONSTRAINT educator_content_content_type_check
                                                                              CHECK (content_type IN ('presentation', 'simulation', 'game'));
                                                                              END;
                                                                              $$;
                                                                              