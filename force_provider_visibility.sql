-- 1. Asegurarnos de que RLS esté activo
ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar cualquier política de lectura restrictiva previa
DROP POLICY IF EXISTS "Provider profiles are viewable by everyone" ON public.provider_profiles;
DROP POLICY IF EXISTS "Anyone can view provider profiles" ON public.provider_profiles;
DROP POLICY IF EXISTS "Authenticated users can view provider profiles" ON public.provider_profiles;

-- 3. Crear la política DEFINITIVA de lectura pública
-- Esto permite SELECT a cualquiera (autenticado o anónimo)
CREATE POLICY "Universal Read Access for Providers"
ON public.provider_profiles
FOR SELECT
USING (true);

-- 4. Para el ADMIN: permitir hacer todo (Update, Delete)
CREATE POLICY "Admin Full Access"
ON public.provider_profiles
FOR ALL
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);
