-- display_nickname 전역 중복 검사 (settings.value JSONB 문자열 기준)
-- 대시보드 SQL Editor에서 schema.sql / policies.sql 적용 후 실행

CREATE OR REPLACE FUNCTION public.is_display_nickname_available(p_nickname text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n text;
BEGIN
  n := trim(p_nickname);
  IF n = '' OR length(n) > 40 THEN
    RETURN false;
  END IF;

  RETURN NOT EXISTS (
    SELECT 1
    FROM public.settings s
    WHERE s.key = 'display_nickname'
      AND s.value = to_jsonb(n)
      AND s.user_id IS DISTINCT FROM auth.uid()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_display_nickname_available(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_display_nickname_available(text) TO anon;
GRANT EXECUTE ON FUNCTION public.is_display_nickname_available(text) TO authenticated;
