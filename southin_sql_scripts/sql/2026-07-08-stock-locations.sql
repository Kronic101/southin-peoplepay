-- ============================================================
-- Southin Operations Hub
-- Stock locations: warehouses, site stores, containers, yards,
-- quarantine/refurb/new scaffold holding locations.
-- Safe to re-run.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists stock_locations (
  id text primary key default gen_random_uuid()::text,
  "locationCode" text not null,
  "locationName" text not null,
  "locationType" text not null,
  site text,
  branch text,
  department text,
  "isActive" boolean not null default true,
  "createdAt" timestamp not null default now(),
  "updatedAt" timestamp not null default now()
);

create unique index if not exists stock_locations_locationCode_key
on stock_locations ("locationCode");

insert into stock_locations (
  id,
  "locationCode",
  "locationName",
  "locationType",
  site,
  branch,
  department,
  "isActive",
  "createdAt",
  "updatedAt"
)
select
  gen_random_uuid()::text,
  v.location_code,
  v.location_name,
  v.location_type,
  v.site,
  v.branch,
  v.department,
  v.is_active,
  now(),
  now()
from (
  values
    ('BAR-LUM', 'Barrick Lumwana Store', 'SITE_STORE', 'Barrick Lumwana', 'Lumwana', 'Operations', true),
    ('CHI-SITE', 'Chingola Site Store', 'SITE_STORE', 'Chingola Site', 'Chingola', 'Operations', true),
    ('KAL-TRI', 'Kalumbila Trident Store', 'SITE_STORE', 'Kalumbila Trident', 'Kalumbila', 'Operations', true),
    ('KAN-KMP', 'Kansanshi KMP Store', 'SITE_STORE', 'Kansanshi KMP', 'Solwezi', 'Operations', true),
    ('KIT-SITE', 'Kitwe Site Store', 'SITE_STORE', 'Kitwe Site', 'Kitwe', 'Operations', true),
    ('MUF-SITE', 'Mufulira Site Store', 'SITE_STORE', 'Mufulira Site', 'Mufulira', 'Operations', true),

    ('SOL-WH', 'Solwezi Warehouse', 'WAREHOUSE', 'Solwezi Warehouse', 'Solwezi', 'Stores', true),
    ('SOL-WH-C01', 'Solwezi Warehouse - Container 01', 'CONTAINER', 'Solwezi Warehouse', 'Solwezi', 'Stores', true),
    ('SOL-WH-C02', 'Solwezi Warehouse - Container 02', 'CONTAINER', 'Solwezi Warehouse', 'Solwezi', 'Stores', true),
    ('SOL-WH-DAMAGED', 'Solwezi Warehouse - Damaged / Quarantine', 'QUARANTINE', 'Solwezi Warehouse', 'Solwezi', 'Stores', true),
    ('SOL-WH-YARD', 'Solwezi Warehouse - Yard', 'YARD', 'Solwezi Warehouse', 'Solwezi', 'Stores', true),

    ('KIT-WH', 'Kitwe Warehouse', 'WAREHOUSE', 'Kitwe Warehouse', 'Kitwe', 'Stores', true),
    ('KIT-WH-C01', 'Kitwe Warehouse - Container 01', 'CONTAINER', 'Kitwe Warehouse', 'Kitwe', 'Stores', true),
    ('KIT-WH-C02', 'Kitwe Warehouse - Container 02', 'CONTAINER', 'Kitwe Warehouse', 'Kitwe', 'Stores', true),
    ('KIT-WH-DAMAGED', 'Kitwe Warehouse - Damaged / Quarantine', 'QUARANTINE', 'Kitwe Warehouse', 'Kitwe', 'Stores', true),
    ('KIT-WH-YARD', 'Kitwe Warehouse - Yard', 'YARD', 'Kitwe Warehouse', 'Kitwe', 'Stores', true),

    -- KMD locations were required by the imported scaffold and stores stock CSVs.
    ('KMD-STORES', 'Kitwe Main Distribution Centre Stores', 'SITE_STORE', 'Kitwe Main Distribution Centre', 'Kitwe', 'Operations', true),
    ('KMD-YARD', 'Kitwe Main Distribution Centre Yard', 'YARD', 'Kitwe Main Distribution Centre', 'Kitwe', 'Operations', true),
    ('KMD-CONTAINERS', 'Kitwe Main Distribution Centre Containers', 'CONTAINER', 'Kitwe Main Distribution Centre', 'Kitwe', 'Operations', true),
    ('KMD-REFURB', 'Kitwe Main Distribution Centre Refurbishment Area', 'REFURB', 'Kitwe Main Distribution Centre', 'Kitwe', 'Operations', true),
    ('KMD-NEW-SA', 'Kitwe Main Distribution Centre New Scaffold Area', 'YARD', 'Kitwe Main Distribution Centre', 'Kitwe', 'Operations', true),
    ('KMD-ALU-SCAF', 'Kitwe Main Distribution Centre Aluminium Scaffold Area', 'YARD', 'Kitwe Main Distribution Centre', 'Kitwe', 'Operations', true)
) as v(location_code, location_name, location_type, site, branch, department, is_active)
on conflict ("locationCode") do update
set
  "locationName" = excluded."locationName",
  "locationType" = excluded."locationType",
  site = excluded.site,
  branch = excluded.branch,
  department = excluded.department,
  "isActive" = excluded."isActive",
  "updatedAt" = now();

select
  "locationCode",
  "locationName",
  "locationType",
  site,
  branch,
  department,
  "isActive"
from stock_locations
order by "locationCode";
