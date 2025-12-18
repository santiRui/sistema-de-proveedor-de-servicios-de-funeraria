-- 1. Limpiar políticas anteriores de provider_profiles
DROP POLICY IF EXISTS "Admins can view all provider profiles" ON public.provider_profiles;
DROP POLICY IF EXISTS "Provider profiles are viewable by everyone" ON public.provider_profiles;
DROP POLICY IF EXISTS "Users can view own provider profile" ON public.provider_profiles;

-- 2. Permitir lectura global de proveedores (necesario para Admin y para Clientes que buscan)
CREATE POLICY "Anyone can view provider profiles"
ON public.provider_profiles
FOR SELECT
USING (true);

-- 3. Permitir al dueño editar su perfil
CREATE POLICY "Providers can update own profile"
ON public.provider_profiles
FOR UPDATE
USING (auth.uid() = id);

-- 4. Permitir al ADMIN editar cualquier perfil de proveedor (para verificar/suspender)
-- Usamos una verificación más segura evitando recursión directa si es posible,
-- o asumimos que si puede hacer UPDATE es porque la app lo validó.
-- Pero para RLS estricto:
CREATE POLICY "Admins can update any provider profile"
ON public.provider_profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- 5. Arreglar permisos de lectura en PROFILES (tabla base)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Permitir que cualquiera lea perfiles básicos (necesario para mostrar nombres en la lista)
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles
FOR SELECT
USING (true);

-- Mantener seguridad en escritura de profiles
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);
