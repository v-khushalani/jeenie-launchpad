
-- Trigger function: auto-deactivate question when a report is filed
CREATE OR REPLACE FUNCTION public.fn_auto_deactivate_on_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE questions SET is_active = false WHERE id = NEW.question_id;
  RETURN NEW;
END;
$$;

-- Attach trigger to question_reports table
CREATE TRIGGER trg_auto_deactivate_on_report
  AFTER INSERT ON public.question_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_auto_deactivate_on_report();
