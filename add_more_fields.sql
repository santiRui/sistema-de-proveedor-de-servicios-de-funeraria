-- Campos adicionales para Clientes
alter table public.profiles 
add column if not exists province text,
add column if not exists department text; -- Departamento/Partido o Piso/Depto

-- Campos adicionales para Proveedores
alter table public.provider_profiles
add column if not exists cuit text,
add column if not exists service_areas text[]; -- Array de provincias de cobertura
