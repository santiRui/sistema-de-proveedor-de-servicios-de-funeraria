-- 1. Habilitar RLS en profiles (por si no estaba)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Crear política para que los administradores puedan ver TODOS los perfiles
-- Usamos una subconsulta segura para verificar si el usuario actual es admin
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- 3. También necesitamos ver la tabla de proveedores (provider_profiles)
ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all provider profiles"
ON public.provider_profiles
FOR SELECT
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- 4. Permitir a los admins actualizar el estado de verificación
CREATE POLICY "Admins can update provider verification"
ON public.provider_profiles
FOR UPDATE
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);
