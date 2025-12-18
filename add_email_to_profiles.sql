-- 1. Agregar columna email a profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email text;

-- 2. Actualizar trigger para guardar email en nuevos registros
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER 
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  role_input text;
  role_final user_role;
  meta jsonb;
BEGIN
  meta := new.raw_user_meta_data;
  role_input := meta->>'role';

  if role_input = 'provider' then
    role_final := 'provider';
  elsif role_input = 'admin' then
    role_final := 'admin';
  else
    role_final := 'client';
  end if;

  -- Insertar Perfil General (Ahora con email)
  INSERT INTO public.profiles (
    id, role, email, full_name, phone, dni, birth_date, 
    country, province, city, department
  )
  VALUES (
    new.id,
    role_final,
    new.email, -- Aquí tomamos el email de auth.users
    coalesce(meta->>'full_name', 'Usuario'),
    meta->>'phone',
    meta->>'dni',
    case when meta->>'birth_date' = '' then null else (meta->>'birth_date')::date end,
    coalesce(meta->>'country', 'Argentina'),
    meta->>'province',
    meta->>'city',
    meta->>'department'
  );

  -- Si es Proveedor, insertar perfil específico
  IF role_final = 'provider' THEN
    INSERT INTO public.provider_profiles (
      id, business_name, cuit, description, 
      address, service_areas
    )
    VALUES (
      new.id,
      coalesce(meta->>'business_name', meta->>'full_name'),
      meta->>'cuit',
      meta->>'description',
      meta->>'address',
      coalesce(
        (select array_agg(x) from jsonb_array_elements_text(meta->'service_areas') t(x)), 
        '{}'
      )
    );
  END IF;

  RETURN new;
EXCEPTION
  WHEN others THEN
    raise warning 'Error creando perfil para usuario %: %', new.id, SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql;

-- 3. Copiar emails existentes de auth.users a public.profiles
-- (Esto es seguro y rápido)
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
AND p.email IS NULL;
