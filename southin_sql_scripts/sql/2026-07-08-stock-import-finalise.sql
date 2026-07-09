-- ============================================================
-- Southin Operations Hub
-- Finalise import from staging tables into production tables.
-- Safe to re-run after staging CSV import.
-- ============================================================

begin;

create extension if not exists pgcrypto;

-- Recreate helper to avoid PostgreSQL parameter-name conflict when
-- CREATE OR REPLACE is attempted against an older signature.
drop function if exists public.enum_label_or_default(text, text, text);

create function public.enum_label_or_default(
  enum_type_name text,
  raw_label text,
  fallback_label text
)
returns text
language plpgsql
stable
as $$
declare
  normalized_label text;
  resolved_label text;
begin
  normalized_label := upper(regexp_replace(coalesce(raw_label, ''), '[^A-Za-z0-9]+', '_', 'g'));
  normalized_label := trim(both '_' from normalized_label);

  select e.enumlabel
    into resolved_label
  from pg_type t
  join pg_enum e on e.enumtypid = t.oid
  where t.typname = enum_type_name
    and upper(e.enumlabel) = normalized_label
  order by e.enumsortorder
  limit 1;

  if resolved_label is not null then
    return resolved_label;
  end if;

  select e.enumlabel
    into resolved_label
  from pg_type t
  join pg_enum e on e.enumtypid = t.oid
  where t.typname = enum_type_name
    and e.enumlabel = fallback_label
  order by e.enumsortorder
  limit 1;

  if resolved_label is not null then
    return resolved_label;
  end if;

  select e.enumlabel
    into resolved_label
  from pg_type t
  join pg_enum e on e.enumtypid = t.oid
  where t.typname = enum_type_name
  order by e.enumsortorder
  limit 1;

  return resolved_label;
end;
$$;

-- ------------------------------------------------------------
-- 1) Stock item master import
-- ------------------------------------------------------------

insert into stock_items (
  id,
  "itemCode",
  "itemName",
  "itemType",
  category,
  description,
  "unitOfMeasure",
  "minimumLevel",
  "reorderLevel",
  "standardCost",
  "isSerialized",
  "isQrTracked",
  "isRfidTracked",
  "isActive",
  "supplierName",
  "supplierCode",
  "supplierId",
  "poNumber",
  "legacyCode",
  "legacySource",
  "createdAt",
  "updatedAt"
)
select
  gen_random_uuid()::text,
  upper(trim(si."itemCode")),
  trim(si."itemName"),
  (
    case
      when upper(coalesce(nullif(trim(si."itemType"), ''), nullif(trim(si.category), ''), 'OTHER')) in ('CONSUMABLE', 'CONSUMABLES') then 'CONSUMABLE'
      when upper(coalesce(nullif(trim(si."itemType"), ''), nullif(trim(si.category), ''), 'OTHER')) in ('TOOL', 'TOOLS') then 'TOOL'
      when upper(coalesce(nullif(trim(si."itemType"), ''), nullif(trim(si.category), ''), 'OTHER')) in ('PPE') then 'PPE'
      when upper(coalesce(nullif(trim(si."itemType"), ''), nullif(trim(si.category), ''), 'OTHER')) in ('SCAFFOLD', 'SCAFFOLD_COMPONENT', 'SCAFFOLD COMPONENT') then 'SCAFFOLD_COMPONENT'
      when upper(coalesce(nullif(trim(si."itemType"), ''), nullif(trim(si.category), ''), 'OTHER')) in ('SPARE', 'SPARES', 'SPARE_PART', 'SPARE PART') then 'SPARE_PART'
      when upper(coalesce(nullif(trim(si."itemType"), ''), nullif(trim(si.category), ''), 'OTHER')) in ('FUEL') then 'FUEL'
      when upper(coalesce(nullif(trim(si."itemType"), ''), nullif(trim(si.category), ''), 'OTHER')) in ('MATERIAL', 'MATERIALS') then 'MATERIAL'
      when upper(coalesce(nullif(trim(si."itemType"), ''), nullif(trim(si.category), ''), 'OTHER')) in ('EQUIPMENT', 'MACHINE', 'MACHINES') then 'EQUIPMENT'
      else public.enum_label_or_default('StockItemType', coalesce(si."itemType", si.category, 'OTHER'), 'OTHER')
    end
  )::"StockItemType",
  coalesce(nullif(trim(si.category), ''), nullif(trim(si."itemType"), ''), 'Uncategorised'),
  nullif(trim(coalesce(si.description, si.condition, '')), ''),
  coalesce(nullif(trim(si."unitOfMeasure"), ''), 'EA'),
  coalesce(si."minimumLevel", 0),
  coalesce(si."reorderLevel", 0),
  coalesce(si."standardCost", 0),
  coalesce(si."isSerialized", false),
  coalesce(si."isQrTracked", false),
  coalesce(si."isRfidTracked", false),
  true,
  nullif(trim(si."supplierName"), ''),
  nullif(trim(si."supplierCode"), ''),
  nullif(trim(si."supplierId"), ''),
  nullif(trim(si."poNumber"), ''),
  nullif(trim(si."legacyCode"), ''),
  coalesce(nullif(trim(si."legacySource"), ''), 'CSV_IMPORT_2026_07_08'),
  now(),
  now()
from staging_stock_items si
where coalesce(trim(si."itemCode"), '') <> ''
  and coalesce(trim(si."itemName"), '') <> ''
on conflict ("itemCode") do update
set
  "itemName" = excluded."itemName",
  "itemType" = excluded."itemType",
  category = excluded.category,
  description = excluded.description,
  "unitOfMeasure" = excluded."unitOfMeasure",
  "minimumLevel" = excluded."minimumLevel",
  "reorderLevel" = excluded."reorderLevel",
  "standardCost" = excluded."standardCost",
  "isSerialized" = excluded."isSerialized",
  "isQrTracked" = excluded."isQrTracked",
  "isRfidTracked" = excluded."isRfidTracked",
  "isActive" = true,
  "supplierName" = excluded."supplierName",
  "supplierCode" = excluded."supplierCode",
  "supplierId" = excluded."supplierId",
  "poNumber" = excluded."poNumber",
  "legacyCode" = excluded."legacyCode",
  "legacySource" = excluded."legacySource",
  "updatedAt" = now();

-- Ensure every staged scaffold row has a stock item master.
insert into stock_items (
  id,
  "itemCode",
  "itemName",
  "itemType",
  category,
  description,
  "unitOfMeasure",
  "isSerialized",
  "isQrTracked",
  "isRfidTracked",
  "isActive",
  "legacySource",
  "createdAt",
  "updatedAt"
)
select distinct
  gen_random_uuid()::text,
  upper(trim(sc."scaffoldCode")),
  coalesce(nullif(trim(sc.description), ''), upper(trim(sc."scaffoldCode"))),
  'SCAFFOLD_COMPONENT'::"StockItemType",
  'Scaffold',
  nullif(trim(sc."sizeSpecification"), ''),
  'EA',
  true,
  true,
  false,
  true,
  'SCAFFOLD_CSV_IMPORT_2026_07_08',
  now(),
  now()
from staging_scaffold_components sc
where coalesce(trim(sc."scaffoldCode"), '') <> ''
on conflict ("itemCode") do nothing;

-- ------------------------------------------------------------
-- 2) Opening stock balances
-- ------------------------------------------------------------

insert into stock_balances (
  id,
  "stockItemId",
  "locationId",
  "quantityOnHand",
  "quantityIssued",
  "quantityDamaged",
  "quantityLost",
  "updatedAt"
)
select
  gen_random_uuid()::text,
  si.id,
  sl.id,
  greatest(coalesce(sb."quantityOnHand", sb.quantity, 0), 0),
  coalesce(sb."quantityIssued", 0),
  coalesce(sb."quantityDamaged", 0),
  coalesce(sb."quantityLost", 0),
  now()
from staging_stock_balances sb
join stock_items si
  on upper(trim(si."itemCode")) = upper(trim(sb."itemCode"))
join stock_locations sl
  on upper(trim(sl."locationCode")) = upper(trim(sb."locationCode"))
where coalesce(trim(sb."itemCode"), '') <> ''
  and coalesce(trim(sb."locationCode"), '') <> ''
on conflict ("stockItemId", "locationId") do update
set
  "quantityOnHand" = excluded."quantityOnHand",
  "quantityIssued" = excluded."quantityIssued",
  "quantityDamaged" = excluded."quantityDamaged",
  "quantityLost" = excluded."quantityLost",
  "updatedAt" = now();

-- ------------------------------------------------------------
-- 3) Scaffold components as individual tagged components
-- Quantity 100 creates 100 rows: CODE-00001 ... CODE-00100.
-- ------------------------------------------------------------

insert into scaffold_components (
  id,
  "componentNo",
  "componentType",
  description,
  "stockItemId",
  "currentSite",
  "currentLocation",
  "conditionStatus",
  "tagStatus",
  "purchaseValue",
  "createdAt",
  "updatedAt"
)
select
  gen_random_uuid()::text,
  case
    when greatest(coalesce(sc.quantity, 1)::int, 1) = 1 then upper(trim(sc."scaffoldCode"))
    else upper(trim(sc."scaffoldCode")) || '-' || lpad(gs.n::text, 5, '0')
  end,
  (
    case
      when upper(coalesce(sc."componentType", sc.description, 'OTHER')) like '%STANDARD%' then 'STANDARD'
      when upper(coalesce(sc."componentType", sc.description, 'OTHER')) like '%LEDGER%' then 'LEDGER'
      when upper(coalesce(sc."componentType", sc.description, 'OTHER')) like '%TRANSOM%' then 'TRANSOM'
      when upper(coalesce(sc."componentType", sc.description, 'OTHER')) like '%BASE%JACK%' then 'BASE_JACK'
      when upper(coalesce(sc."componentType", sc.description, 'OTHER')) like '%TOE%BOARD%' then 'TOE_BOARD'
      when upper(coalesce(sc."componentType", sc.description, 'OTHER')) like '%PLATFORM%' then 'PLATFORM'
      when upper(coalesce(sc."componentType", sc.description, 'OTHER')) like '%COUPLER%' then 'COUPLER'
      when upper(coalesce(sc."componentType", sc.description, 'OTHER')) like '%LADDER%' then 'LADDER'
      when upper(coalesce(sc."componentType", sc.description, 'OTHER')) like '%GUARD%RAIL%' then 'GUARD_RAIL'
      when upper(coalesce(sc."componentType", sc.description, 'OTHER')) like '%BRACE%' then 'BRACE'
      else public.enum_label_or_default('ScaffoldComponentType', coalesce(sc."componentType", 'OTHER'), 'OTHER')
    end
  )::"ScaffoldComponentType",
  coalesce(nullif(trim(sc.description), ''), upper(trim(sc."scaffoldCode"))),
  si.id,
  sl.site,
  sl."locationCode",
  coalesce(nullif(trim(sc."conditionStatus"), ''), 'GOOD'),
  public.enum_label_or_default('ScaffoldTagStatus', sc."tagStatus", 'AVAILABLE')::"ScaffoldTagStatus",
  coalesce(sc."purchaseValue", 0),
  now(),
  now()
from staging_scaffold_components sc
join stock_items si
  on upper(trim(si."itemCode")) = upper(trim(sc."scaffoldCode"))
join stock_locations sl
  on upper(trim(sl."locationCode")) = upper(trim(sc."locationCode"))
cross join lateral generate_series(
  1,
  greatest(coalesce(sc.quantity, 1)::int, 1)
) as gs(n)
where coalesce(trim(sc."scaffoldCode"), '') <> ''
  and coalesce(trim(sc."locationCode"), '') <> ''
on conflict ("componentNo") do update
set
  "componentType" = excluded."componentType",
  description = excluded.description,
  "stockItemId" = excluded."stockItemId",
  "currentSite" = excluded."currentSite",
  "currentLocation" = excluded."currentLocation",
  "conditionStatus" = excluded."conditionStatus",
  "tagStatus" = excluded."tagStatus",
  "purchaseValue" = excluded."purchaseValue",
  "updatedAt" = now();

-- ------------------------------------------------------------
-- 4) Fleet / asset register import
-- ------------------------------------------------------------

insert into hub_assets (
  id,
  "assetNo",
  "assetTag",
  category,
  name,
  description,
  department,
  site,
  location,
  "serialNumber",
  "purchaseValue",
  "currentValue",
  status,
  "createdAt",
  "updatedAt"
)
select
  gen_random_uuid()::text,
  upper(trim(a."assetCode")),
  upper(trim(a."assetCode")),
  (
    case
      when upper(coalesce(a."assetType", 'OTHER')) in ('FLEET', 'VEHICLE', 'TRUCK', 'LDV', 'BUS') then 'VEHICLE'
      when upper(coalesce(a."assetType", 'OTHER')) in ('EQUIPMENT', 'MACHINE', 'MACHINERY') then 'EQUIPMENT'
      when upper(coalesce(a."assetType", 'OTHER')) in ('TOOL', 'TOOLS') then 'TOOL'
      when upper(coalesce(a."assetType", 'OTHER')) in ('SCAFFOLD', 'SCAFFOLDING') then 'SCAFFOLD'
      when upper(coalesce(a."assetType", 'OTHER')) in ('CONSUMABLE', 'CONSUMABLES') then 'CONSUMABLE'
      when upper(coalesce(a."assetType", 'OTHER')) in ('IT', 'IT EQUIPMENT', 'IT_EQUIPMENT') then 'IT_EQUIPMENT'
      when upper(coalesce(a."assetType", 'OTHER')) in ('PPE') then 'PPE'
      else public.enum_label_or_default('AssetCategory', a."assetType", 'OTHER')
    end
  )::"AssetCategory",
  coalesce(nullif(trim(a."assetName"), ''), upper(trim(a."assetCode"))),
  nullif(trim(a.description), ''),
  coalesce(nullif(trim(a.department), ''), sl.department, 'Operations'),
  coalesce(nullif(trim(a.site), ''), sl.site, s.name),
  coalesce(nullif(trim(a."locationCode"), ''), sl."locationCode", nullif(trim(a."siteCode"), '')),
  nullif(trim(a."serialNumber"), ''),
  coalesce(a."purchaseValue", 0),
  coalesce(a."currentValue", a."purchaseValue", 0),
  (
    case
      when upper(coalesce(a.status, 'ACTIVE')) in ('IN STORE', 'IN_STORE', 'STORE') then 'IN_STORE'
      when upper(coalesce(a.status, 'ACTIVE')) in ('IN USE', 'IN_USE', 'ISSUED') then 'IN_USE'
      when upper(coalesce(a.status, 'ACTIVE')) in ('REPAIR', 'UNDER REPAIR', 'UNDER_REPAIR') then 'UNDER_REPAIR'
      when upper(coalesce(a.status, 'ACTIVE')) in ('QUARANTINE', 'QUARANTINED') then 'QUARANTINED'
      else public.enum_label_or_default('AssetStatus', coalesce(a.status, 'ACTIVE'), 'ACTIVE')
    end
  )::"AssetStatus",
  now(),
  now()
from staging_asset_register a
left join stock_locations sl
  on upper(trim(sl."locationCode")) = upper(trim(a."locationCode"))
left join "Site" s
  on upper(trim(s.code)) = upper(trim(a."siteCode"))
where coalesce(trim(a."assetCode"), '') <> ''
on conflict ("assetNo") do update
set
  "assetTag" = excluded."assetTag",
  category = excluded.category,
  name = excluded.name,
  description = excluded.description,
  department = excluded.department,
  site = excluded.site,
  location = excluded.location,
  "serialNumber" = excluded."serialNumber",
  "purchaseValue" = excluded."purchaseValue",
  "currentValue" = excluded."currentValue",
  status = excluded.status,
  "updatedAt" = now();

commit;

-- ------------------------------------------------------------
-- Verification
-- ------------------------------------------------------------

select 'stock_items' as table_name, count(*) as rows from stock_items
union all
select 'stock_balances', count(*) from stock_balances
union all
select 'scaffold_components', count(*) from scaffold_components
union all
select 'hub_assets', count(*) from hub_assets
union all
select 'stock_locations', count(*) from stock_locations
order by table_name;

select
  si."itemCode",
  si."itemName",
  sl."locationCode",
  sl."locationName",
  sb."quantityOnHand"
from stock_balances sb
join stock_items si on si.id = sb."stockItemId"
join stock_locations sl on sl.id = sb."locationId"
where sb."quantityOnHand" <> 0
order by sl."locationCode", si."itemCode"
limit 100;
