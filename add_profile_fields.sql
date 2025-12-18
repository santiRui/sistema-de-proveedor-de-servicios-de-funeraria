-- Agregar campos de perfil extendido
alter table public.profiles 
add column if not exists dni text,
add column if not exists birth_date date;

-- Opcional: Índice para búsquedas por DNI
create index if not exists profiles_dni_idx on public.profiles (dni);
