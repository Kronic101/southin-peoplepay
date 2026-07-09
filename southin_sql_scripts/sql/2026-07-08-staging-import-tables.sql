-- ============================================================
-- Southin Operations Hub
-- Staging import tables for Excel/CSV import.
-- Run before uploading CSVs through Supabase Table Editor.
-- Safe to re-run. This intentionally keeps IDs nullable/text
-- because CSV data must not be imported directly into final tables.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists staging_stock_items (
  id text,
  "itemCode" text,
  "itemName" text,
  "itemType" text,
  category text,
  description text,
  "unitOfMeasure" text,
  "minimumLevel" numeric,
  "reorderLevel" numeric,
  "standardCost" numeric,
  "isSerialized" boolean,
  "isQrTracked" boolean,
  "isRfidTracked" boolean,
  "supplierName" text,
  "supplierCode" text,
  "supplierId" text,
  "poNumber" text,
  "legacyCode" text,
  "legacySource" text,
  condition text,
  "sourceFile" text,
  "sourceSheet" text,
  "importedAt" timestamp not null default now()
);

create table if not exists staging_stock_balances (
  id text,
  "itemCode" text,
  "locationCode" text,
  quantity numeric,
  "quantityOnHand" numeric,
  "quantityIssued" numeric default 0,
  "quantityDamaged" numeric default 0,
  "quantityLost" numeric default 0,
  "createdAt" timestamp,
  "sourceFile" text,
  "sourceSheet" text,
  "importedAt" timestamp not null default now()
);

create table if not exists staging_scaffold_components (
  id text,
  "scaffoldCode" text,
  description text,
  "sizeSpecification" text,
  "componentType" text,
  "locationCode" text,
  quantity numeric,
  "conditionStatus" text,
  "tagStatus" text,
  "purchaseValue" numeric,
  "sourceFile" text,
  "sourceSheet" text,
  "importedAt" timestamp not null default now()
);

create table if not exists staging_asset_register (
  id text,
  "assetCode" text,
  "assetName" text,
  "assetType" text,
  "siteCode" text,
  "locationCode" text,
  "responsibleUserName" text,
  "responsibleUserEmail" text,
  status text,
  description text,
  department text,
  "serialNumber" text,
  "purchaseValue" numeric,
  "currentValue" numeric,
  site text,
  "sourceFile" text,
  "sourceSheet" text,
  "importedAt" timestamp not null default now()
);

-- Use this before importing a new batch.
-- Comment these four lines if you want to preserve previous staging batches.
truncate table staging_stock_items;
truncate table staging_stock_balances;
truncate table staging_scaffold_components;
truncate table staging_asset_register;

-- Verification after CSV upload:
select 'staging_stock_items' as table_name, count(*) as rows from staging_stock_items
union all
select 'staging_stock_balances', count(*) from staging_stock_balances
union all
select 'staging_scaffold_components', count(*) from staging_scaffold_components
union all
select 'staging_asset_register', count(*) from staging_asset_register;
