-- ============================================================
-- Southin PeoplePay / Operations Hub
-- Master data: operational sites, site managers, site initiators
-- Safe to re-run.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Sites
-- Keep these names/codes stable because employees, payroll,
-- stores, scaffold and fleet records depend on them.
-- ------------------------------------------------------------

insert into "Site" (
  id,
  name,
  code,
  description,
  "createdAt",
  "updatedAt"
)
select
  gen_random_uuid()::text,
  v.name,
  v.code,
  v.description,
  now(),
  now()
from (
  values
    ('Kalumbila Trident', 'KAL-TRI', 'Operational site - Kalumbila Trident'),
    ('Kansanshi KMP', 'KAN-KMP', 'Operational site - Kansanshi KMP'),
    ('Barrick Lumwana', 'BAR-LUM', 'Operational site - Barrick Lumwana'),
    ('Chingola Site', 'CHI-SITE', 'Operational site - Chingola'),
    ('Kitwe Site', 'KIT-SITE', 'Operational site - Kitwe'),
    ('Mufulira Site', 'MUF-SITE', 'Operational site - Mufulira'),
    ('Solwezi Warehouse', 'SOL-WH', 'Main warehouse - Solwezi'),
    ('Kitwe Warehouse', 'KIT-WH', 'Warehouse - Kitwe')
) as v(name, code, description)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  "updatedAt" = now();

-- ------------------------------------------------------------
-- Site manager assignment table
-- ------------------------------------------------------------

create table if not exists site_manager_assignments (
  id text primary key default gen_random_uuid()::text,
  "siteId" text not null,
  "managerName" text not null,
  "managerEmail" text not null,
  "managerRole" text not null default 'SITE_MANAGER',
  "isPrimary" boolean not null default true,
  "isActive" boolean not null default true,
  "createdAt" timestamp not null default now(),
  "updatedAt" timestamp not null default now()
);

create unique index if not exists site_manager_assignments_site_email_key
on site_manager_assignments ("siteId", "managerEmail");

-- Add FK only where it does not already exist.
do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'site_manager_assignments'
      and constraint_name = 'site_manager_assignments_siteId_fkey'
  ) then
    alter table site_manager_assignments
    add constraint "site_manager_assignments_siteId_fkey"
    foreign key ("siteId") references "Site"(id) on delete cascade;
  end if;
end $$;

-- Known site managers from current Microsoft 365 users.
insert into site_manager_assignments (
  id,
  "siteId",
  "managerName",
  "managerEmail",
  "managerRole",
  "isPrimary",
  "isActive",
  "createdAt",
  "updatedAt"
)
select
  gen_random_uuid()::text,
  s.id,
  v.manager_name,
  v.manager_email,
  'SITE_MANAGER',
  true,
  true,
  now(),
  now()
from (
  values
    ('KAL-TRI', 'Joseph Chishimba', 'Joseph.Chishimba@southincon.com'),
    ('KAN-KMP', 'Dominic Lubinda', 'Dominic.Lubinda@southincon.com'),
    ('KIT-SITE', 'Nelson Mutengo', 'Nelson.Mutengo@southincon.com'),
    ('MUF-SITE', 'Benjamin Chiwaya', 'Benjamin.Chiwaya@southincon.com')
) as v(site_code, manager_name, manager_email)
join "Site" s on s.code = v.site_code
on conflict ("siteId", "managerEmail") do update
set
  "managerName" = excluded."managerName",
  "managerRole" = excluded."managerRole",
  "isPrimary" = excluded."isPrimary",
  "isActive" = excluded."isActive",
  "updatedAt" = now();

-- ------------------------------------------------------------
-- Site initiator assignment table
-- Used by stores, procurement, assets, scaffold and fleet workflows.
-- ------------------------------------------------------------

create table if not exists site_initiator_assignments (
  id text primary key default gen_random_uuid()::text,
  "siteId" text not null,
  "initiatorName" text not null,
  "initiatorEmail" text not null,
  "moduleScope" jsonb not null default '["STORES", "PROCUREMENT", "ASSET", "SCAFFOLD", "FLEET"]'::jsonb,
  "isActive" boolean not null default true,
  "createdAt" timestamp not null default now(),
  "updatedAt" timestamp not null default now()
);

create unique index if not exists site_initiator_assignments_site_email_key
on site_initiator_assignments ("siteId", "initiatorEmail");

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'site_initiator_assignments'
      and constraint_name = 'site_initiator_assignments_siteId_fkey'
  ) then
    alter table site_initiator_assignments
    add constraint "site_initiator_assignments_siteId_fkey"
    foreign key ("siteId") references "Site"(id) on delete cascade;
  end if;
end $$;

insert into site_initiator_assignments (
  id,
  "siteId",
  "initiatorName",
  "initiatorEmail",
  "moduleScope",
  "isActive",
  "createdAt",
  "updatedAt"
)
select
  gen_random_uuid()::text,
  s.id,
  v.initiator_name,
  v.initiator_email,
  '["STORES", "PROCUREMENT", "ASSET", "SCAFFOLD", "FLEET"]'::jsonb,
  true,
  now(),
  now()
from (
  values
    ('SOL-WH', 'Naomi Kimena', 'Naomi.Kimena@southincon.com'),
    ('KIT-WH', 'Moonga Sianongo', 'Moonga.Sianongo@southincon.com')
) as v(site_code, initiator_name, initiator_email)
join "Site" s on s.code = v.site_code
on conflict ("siteId", "initiatorEmail") do update
set
  "initiatorName" = excluded."initiatorName",
  "moduleScope" = excluded."moduleScope",
  "isActive" = excluded."isActive",
  "updatedAt" = now();

-- ------------------------------------------------------------
-- Verification
-- ------------------------------------------------------------

select
  s.code,
  s.name as site,
  sma."managerName",
  sma."managerEmail",
  sma."isPrimary",
  sma."isActive"
from "Site" s
left join site_manager_assignments sma
  on sma."siteId" = s.id
order by s.code;

select
  s.code,
  s.name as site,
  sia."initiatorName",
  sia."initiatorEmail",
  sia."moduleScope",
  sia."isActive"
from "Site" s
left join site_initiator_assignments sia
  on sia."siteId" = s.id
order by s.code;
