CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_code TEXT;
  v_account_type TEXT;
  v_role public.app_role;
  v_phone TEXT;
BEGIN
  v_code := 'JEE' || UPPER(REPLACE(LEFT(NEW.id::text,8),'-',''));
  v_account_type := LOWER(COALESCE(NEW.raw_user_meta_data->>'account_type','student'));
  v_phone := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', '')), '');

  BEGIN
    v_role := v_account_type::public.app_role;
  EXCEPTION WHEN OTHERS THEN
    v_role := 'student'::public.app_role;
  END;

  INSERT INTO public.profiles (id, full_name, email, phone, referral_code, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Student'),
    NEW.email,
    v_phone,
    v_code,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    referral_code = COALESCE(profiles.referral_code, EXCLUDED.referral_code),
    email = COALESCE(profiles.email, EXCLUDED.email),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;