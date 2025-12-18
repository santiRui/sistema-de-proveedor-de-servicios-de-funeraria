CREATE OR REPLACE FUNCTION public.get_provider_detail_admin(target_id uuid)
RETURNS TABLE (
  id uuid,
  business_name text,
  cuit text,
  description text,
  address text,
  service_areas text[],
  verified boolean,
  created_at timestamptz,
  phone text,
  full_name text,
  email text,
  base_province text,
  base_city text,
  base_department text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pp.id,
    pp.business_name,
    pp.cuit,
    pp.description,
    pp.address,
    pp.service_areas,
    pp.verified,
    pp.created_at,
    pp.phone,
    p.full_name,
    p.email,
    p.province,
    p.city,
    p.department
  FROM public.provider_profiles pp
  LEFT JOIN public.profiles p ON p.id = pp.id
  WHERE pp.id = target_id;
END;
$$;
