-- Guard / Pacto Digital — initial schema
-- Aplica con: psql $DATABASE_URL -f 001_initial_schema.sql
-- O desde Supabase: supabase db push

-- =============================================================
-- ENUMS
-- =============================================================

create type user_role as enum ('tutor', 'menor', 'adulto_confianza');

create type signal_label as enum (
  'love_bombing',
  'intimacy_escalation',
  'emotional_isolation',
  'deceptive_offer',
  'off_platform_request'
);

create type risk_level as enum ('bajo', 'medio', 'alto');

create type pact_status as enum ('pending', 'signed', 'paused', 'revoked');

-- =============================================================
-- TABLES
-- =============================================================

create table families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  family_id uuid not null references families(id) on delete cascade,
  display_name text not null,
  role user_role not null,
  created_at timestamptz not null default now()
);
create index profiles_family_idx on profiles(family_id);

-- El pacto digital firmado entre tutor y menor
create table pacts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  menor_id uuid not null references profiles(id) on delete cascade,
  tutor_id uuid not null references profiles(id) on delete cascade,
  trusted_adult_id uuid references profiles(id) on delete set null,
  status pact_status not null default 'pending',
  signed_by_menor_at timestamptz,
  signed_by_tutor_at timestamptz,
  monitored_categories signal_label[] not null
    default array[
      'love_bombing',
      'intimacy_escalation',
      'emotional_isolation',
      'deceptive_offer',
      'off_platform_request'
    ]::signal_label[],
  created_at timestamptz not null default now(),
  unique (menor_id, tutor_id)
);
create index pacts_menor_idx on pacts(menor_id);
create index pacts_tutor_idx on pacts(tutor_id);
create index pacts_trusted_adult_idx on pacts(trusted_adult_id);

-- Una señal categorizada generada por el modelo on-device.
-- IMPORTANTE: jamás se guarda el contenido del mensaje.
create table signals (
  id uuid primary key default gen_random_uuid(),
  pact_id uuid not null references pacts(id) on delete cascade,
  menor_id uuid not null references profiles(id) on delete cascade,
  detected_at timestamptz not null default now(),
  platform text,
  label signal_label not null,
  score real not null check (score >= 0 and score <= 1),
  risk_level risk_level not null
);
create index signals_pact_detected_idx on signals(pact_id, detected_at desc);
create index signals_menor_detected_idx on signals(menor_id, detected_at desc);

-- Eventos SOS: el menor contacta a un adulto distinto del tutor.
-- El tutor NO puede ver estos eventos (parte del diseño).
create table sos_events (
  id uuid primary key default gen_random_uuid(),
  triggered_by uuid not null references profiles(id) on delete cascade,
  pact_id uuid not null references pacts(id) on delete cascade,
  trusted_adult_id uuid references profiles(id) on delete set null,
  triggered_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  notes text
);
create index sos_triggered_by_idx on sos_events(triggered_by);
create index sos_trusted_adult_idx on sos_events(trusted_adult_id);

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

alter table families enable row level security;
alter table profiles enable row level security;
alter table pacts enable row level security;
alter table signals enable row level security;
alter table sos_events enable row level security;

-- Helper: el family_id del usuario autenticado
create or replace function auth_family_id() returns uuid
language sql stable security definer set search_path = public as $$
  select family_id from profiles where id = auth.uid()
$$;

-- ---- families: visible para miembros de la familia
create policy families_member_read on families
  for select using (id = auth_family_id());

-- ---- profiles: visible para miembros de la familia
create policy profiles_self_read on profiles
  for select using (family_id = auth_family_id());

create policy profiles_self_update on profiles
  for update using (id = auth.uid());

-- ---- pacts: visible para tutor, menor o adulto de confianza del pacto
create policy pacts_party_read on pacts
  for select using (
    auth.uid() in (menor_id, tutor_id, trusted_adult_id)
  );

create policy pacts_tutor_create on pacts
  for insert with check (
    tutor_id = auth.uid()
    and (select role from profiles where id = auth.uid()) = 'tutor'
  );

create policy pacts_party_update on pacts
  for update using (auth.uid() in (menor_id, tutor_id));

-- ---- signals: tutor y menor del pacto ven LO MISMO (transparencia).
-- Las inserts vienen del extension/app vía service role, no de clientes.
create policy signals_party_read on signals
  for select using (
    exists (
      select 1 from pacts p
      where p.id = signals.pact_id
        and auth.uid() in (p.menor_id, p.tutor_id)
        and p.status = 'signed'
    )
  );

-- ---- sos_events: el menor que disparó y el adulto de confianza pueden leer.
-- El tutor NO. Esta es la pieza crítica del modelo de privacidad.
create policy sos_menor_insert on sos_events
  for insert with check (triggered_by = auth.uid());

create policy sos_menor_read_own on sos_events
  for select using (triggered_by = auth.uid());

create policy sos_trusted_adult_read on sos_events
  for select using (trusted_adult_id = auth.uid());

create policy sos_trusted_adult_ack on sos_events
  for update using (trusted_adult_id = auth.uid())
  with check (trusted_adult_id = auth.uid());
