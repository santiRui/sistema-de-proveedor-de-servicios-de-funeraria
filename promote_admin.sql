-- 1. Primero asegúrate de haberte registrado en la web con el email: memorial.home0@gmail.com

-- 2. Luego ejecuta este script para dar permisos de Administrador a esa cuenta:

UPDATE public.profiles
SET role = 'admin'
WHERE id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'memorial.home0@gmail.com'
);

-- 3. Verificación (Opcional)
SELECT * FROM public.profiles WHERE role = 'admin';
