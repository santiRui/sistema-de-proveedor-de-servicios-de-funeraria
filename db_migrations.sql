-- Migraciones de base de datos para Memorial Home / Supabase
-- Versión: 2.1 (Con limpieza previa - DROP IF EXISTS)

-- =====================================
-- 0. LIMPIEZA PREVIA (Reset)
-- =====================================
-- Elimina tablas en orden inverso a sus dependencias
drop table if exists public.transaction_logs cascade;
drop table if exists public.contracts cascade;
drop table if exists public.orders cascade;
drop table if exists public.quotations cascade;
drop table if exists public.services cascade;
drop table if exists public.service_categories cascade;
drop table if exists public.provider_profiles cascade;
drop table if exists public.profiles cascade;

-- Elimina funciones y triggers
drop function if exists public.handle_new_user() cascade;
drop function if exists public.set_timestamp() cascade;

-- Elimina tipos enum
drop type if exists public.contract_status cascade;
drop type if exists public.order_status cascade;
drop type if exists public.quotation_status cascade;
drop type if exists public.user_role cascade;

-- =====================================
-- 1. ENUMS
-- =====================================
create type user_role as enum ('client', 'provider', 'admin');
create type quotation_status as enum ('pending', 'accepted', 'rejected', 'expired');
create type order_status as enum ('pending', 'paid', 'cancelled', 'refunded');
create type contract_status as enum ('draft', 'active', 'completed', 'cancelled');

-- =====================================
-- 2. USUARIOS / PERFILES (Con RLS)
-- =====================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'client',
  full_name text,
  phone text,
  dni text,
  birth_date date,
  country text,
  province text,
  city text,
  department text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Habilitar RLS
alter table public.profiles enable row level security;

-- Políticas de seguridad (Profiles)
-- 1. Ver propio perfil
create policy "Users can view own profile" 
  on public.profiles for select 
  using ( auth.uid() = id );

-- 2. Actualizar propio perfil
create policy "Users can update own profile" 
  on public.profiles for update 
  using ( auth.uid() = id );

-- Trigger para actualizar fecha
create or replace function public.set_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_timestamp
before update on public.profiles
for each row
execute procedure public.set_timestamp();

-- TRIGGER AUTOMÁTICO: Crear perfil al registrar usuario (Versión Completa)
create or replace function public.handle_new_user() 
returns trigger 
security definer set search_path = public
as $$
declare
  role_input text;
  role_final user_role;
  meta jsonb;
begin
  meta := new.raw_user_meta_data;
  role_input := meta->>'role';

  if role_input = 'provider' then
    role_final := 'provider';
  elsif role_input = 'admin' then
    role_final := 'admin';
  else
    role_final := 'client';
  end if;

  -- 1. Insertar Perfil General
  insert into public.profiles (
    id, role, full_name, phone, dni, birth_date, 
    country, province, city, department
  )
  values (
    new.id,
    role_final,
    coalesce(meta->>'full_name', 'Usuario'),
    meta->>'phone',
    meta->>'dni',
    case when meta->>'birth_date' = '' then null else (meta->>'birth_date')::date end,
    coalesce(meta->>'country', 'Argentina'),
    meta->>'province',
    meta->>'city',
    meta->>'department'
  );

  -- 2. Si es Proveedor, insertar perfil específico
  if role_final = 'provider' then
    insert into public.provider_profiles (
      id, business_name, cuit, description, 
      address, service_areas
    )
    values (
      new.id,
      coalesce(meta->>'business_name', meta->>'full_name'),
      meta->>'cuit',
      meta->>'description',
      meta->>'address',
      -- Conversión segura de array JSON a array Postgres
      coalesce(
        (select array_agg(x) from jsonb_array_elements_text(meta->'service_areas') t(x)), 
        '{}'
      )
    );
  end if;

  return new;
exception
  when others then
    raise warning 'Error creando perfil para usuario %: %', new.id, SQLERRM;
    return new;
end;
$$ language plpgsql;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================================
-- 3. PERFILES DE PROVEEDOR
-- =====================================
create table public.provider_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  business_name text not null,
  cuit text,
  description text,
  registration_number text,
  service_areas text[],
  verified boolean not null default false,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.provider_profiles enable row level security;

-- Perfiles de proveedores son públicos para lectura (cualquiera puede buscar)
create policy "Provider profiles are viewable by everyone" 
  on public.provider_profiles for select 
  using ( true );

-- Solo el dueño puede editar su perfil de proveedor
create policy "Providers can update own profile" 
  on public.provider_profiles for update 
  using ( auth.uid() = id );

-- Solo el dueño puede crear su perfil de proveedor
create policy "Providers can insert own profile" 
  on public.provider_profiles for insert 
  with check ( auth.uid() = id );

create trigger set_timestamp_provider
before update on public.provider_profiles
for each row
execute procedure public.set_timestamp();

-- =====================================
-- 3B. CREDENCIALES MERCADO PAGO (Privadas)
-- =====================================
create table public.provider_mp_credentials (
  provider_id uuid primary key references public.provider_profiles(id) on delete cascade,
  mp_client_id text,
  mp_client_secret text,
  mp_access_token text,
  mp_refresh_token text,
  mp_user_id bigint,
  mp_token_expires_at timestamptz,
  mp_oauth_state text,
  mp_connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.provider_mp_credentials enable row level security;

create policy "Providers can view own MP credentials"
  on public.provider_mp_credentials for select
  using ( auth.uid() = provider_id );

create policy "Providers can insert own MP credentials"
  on public.provider_mp_credentials for insert
  with check ( auth.uid() = provider_id );

create policy "Providers can update own MP credentials"
  on public.provider_mp_credentials for update
  using ( auth.uid() = provider_id );

create trigger set_timestamp_provider_mp_credentials
before update on public.provider_mp_credentials
for each row
execute procedure public.set_timestamp();

-- =====================================
-- 4. SERVICIOS
-- =====================================
create table public.service_categories (
  id bigserial primary key,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);
alter table public.service_categories enable row level security;
create policy "Categories are public" on public.service_categories for select using (true);

create table public.services (
  id bigserial primary key,
  provider_id uuid not null references public.provider_profiles(id) on delete cascade,
  category_id bigint references public.service_categories(id),
  name text not null,
  description text,
  base_price numeric(12,2) not null,
  duration_minutes int,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.services enable row level security;

-- Servicios son públicos
create policy "Services are viewable by everyone" 
  on public.services for select 
  using ( true );

-- Solo el proveedor dueño puede editar sus servicios
create policy "Providers can insert own services" 
  on public.services for insert 
  with check ( auth.uid() = provider_id );

create policy "Providers can update own services" 
  on public.services for update 
  using ( auth.uid() = provider_id );

create policy "Providers can delete own services" 
  on public.services for delete 
  using ( auth.uid() = provider_id );

create trigger set_timestamp_services
before update on public.services
for each row
execute procedure public.set_timestamp();

-- =====================================
-- 5. COTIZACIONES (Privadas entre partes)
-- =====================================
create table public.quotations (
  id bigserial primary key,
  client_id uuid not null references public.profiles(id) on delete restrict,
  provider_id uuid not null references public.provider_profiles(id) on delete restrict,
  service_id bigint not null references public.services(id) on delete restrict,
  status quotation_status not null default 'pending',
  requested_for date,
  proposed_price numeric(12,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.quotations enable row level security;

-- Solo visible por el cliente O el proveedor involucrado
create policy "Users can view own quotations" 
  on public.quotations for select 
  using ( auth.uid() = client_id or auth.uid() = provider_id );

create policy "Clients can create quotations" 
  on public.quotations for insert 
  with check ( auth.uid() = client_id );

create policy "Provider or Client can update quotation status"
  on public.quotations for update
  using ( auth.uid() = client_id or auth.uid() = provider_id );

create trigger set_timestamp_quotations
before update on public.quotations
for each row
execute procedure public.set_timestamp();

-- =====================================
-- 6. ÓRDENES / PAGOS
-- =====================================
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete restrict,
  provider_id uuid not null references public.provider_profiles(id) on delete restrict,
  service_id bigint not null references public.services(id) on delete restrict,
  quotation_id bigint references public.quotations(id) on delete set null,
  status order_status not null default 'pending',
  amount numeric(12,2) not null,
  platform_fee numeric(12,2) not null default 0,
  scheduled_for date,
  paid_at timestamptz,
  payment_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.orders enable row level security;

-- Visible por cliente o proveedor
create policy "Users can view own orders" 
  on public.orders for select 
  using ( auth.uid() = client_id or auth.uid() = provider_id );

create policy "System can create orders" 
  on public.orders for insert 
  with check ( auth.uid() = client_id ); 

create trigger set_timestamp_orders
before update on public.orders
for each row
execute procedure public.set_timestamp();

alter table public.services
  add column if not exists billing_mode text not null default 'one_time';

alter table public.quotations
  add column if not exists requested_billing_mode text not null default 'one_time';

-- =====================================
-- 7. CONTRATOS
-- =====================================
create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  contract_number text not null,
  status contract_status not null default 'active',
  contract_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.contracts enable row level security;

-- Visible a través de la orden
create policy "Users can view own contracts" 
  on public.contracts for select 
  using ( 
    exists (
      select 1 from public.orders 
      where orders.id = contracts.order_id 
      and (orders.client_id = auth.uid() or orders.provider_id = auth.uid())
    )
  );

create trigger set_timestamp_contracts
before update on public.contracts
for each row
execute procedure public.set_timestamp();

-- =====================================
-- 8. LOGS (Solo Admin)
-- =====================================
create table public.transaction_logs (
  id bigserial primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);
alter table public.transaction_logs enable row level security;

create policy "No public access" on public.transaction_logs for all using (false);
