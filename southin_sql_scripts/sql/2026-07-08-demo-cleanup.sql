-- ============================================================
-- Southin Operations Hub
-- Demo cleanup.
-- This script is deliberately careful:
--   1. Backs up demo candidates.
--   2. Deletes unreferenced demo rows.
--   3. Archives referenced stock item demos instead of breaking FKs.
-- This prevents the stock_movement_lines foreign-key error seen during cleanup.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- Backup tables
-- ------------------------------------------------------------

create table if not exists cleanup_demo_stock_items_backup as
select *, now() as "backupCreatedAt"
from stock_items
where false;

create table if not exists cleanup_demo_stock_balances_backup as
select *, now() as "backupCreatedAt"
from stock_balances
where false;

create table if not exists cleanup_demo_scaffold_components_backup as
select *, now() as "backupCreatedAt"
from scaffold_components
where false;

create table if not exists cleanup_demo_hub_assets_backup as
select *, now() as "backupCreatedAt"
from hub_assets
where false;

-- Stock movement lines may not exist in some branches/environments.
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'stock_movement_lines'
  ) and not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'cleanup_demo_stock_movement_lines_backup'
  ) then
    execute 'create table cleanup_demo_stock_movement_lines_backup as select *, now() as "backupCreatedAt" from stock_movement_lines where false';
  end if;
end $$;

-- ------------------------------------------------------------
-- Candidate demo rows
-- ------------------------------------------------------------

create temp table demo_stock_item_candidates on commit drop as
select id, "itemCode", "itemName"
from stock_items
where
  "itemCode" in ('PPE-00002', 'PPE-GLOVES', 'SCF-STANDARD')
  or "itemName" ilike '%demo%';

create temp table demo_scaffold_component_candidates on commit drop as
select id, "componentNo", description
from scaffold_components
where
  "componentNo" in ('SCF-2026-00001')
  or description ilike '%demo%';

create temp table demo_hub_asset_candidates on commit drop as
select id, "assetNo", name
from hub_assets
where
  "assetNo" ilike '%DEMO%'
  or name ilike '%demo%'
  or description ilike '%demo%';

-- ------------------------------------------------------------
-- Backups
-- ------------------------------------------------------------

insert into cleanup_demo_stock_items_backup
select si.*, now()
from stock_items si
join demo_stock_item_candidates d on d.id = si.id;

insert into cleanup_demo_stock_balances_backup
select sb.*, now()
from stock_balances sb
join demo_stock_item_candidates d on d.id = sb."stockItemId";

insert into cleanup_demo_scaffold_components_backup
select sc.*, now()
from scaffold_components sc
where sc.id in (select id from demo_scaffold_component_candidates)
   or sc."stockItemId" in (select id from demo_stock_item_candidates);

insert into cleanup_demo_hub_assets_backup
select ha.*, now()
from hub_assets ha
join demo_hub_asset_candidates d on d.id = ha.id;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'stock_movement_lines'
  ) then
    execute '
      insert into cleanup_demo_stock_movement_lines_backup
      select sml.*, now()
      from stock_movement_lines sml
      join demo_stock_item_candidates d on d.id = sml."stockItemId"
    ';
  end if;
end $$;

-- ------------------------------------------------------------
-- Delete dependent rows that are safe to remove
-- ------------------------------------------------------------

-- Demo scaffold components can be removed directly.
delete from scaffold_components sc
where sc.id in (select id from demo_scaffold_component_candidates)
   or sc."stockItemId" in (select id from demo_stock_item_candidates);

-- Remove stock balances for demo stock items.
delete from stock_balances sb
where sb."stockItemId" in (select id from demo_stock_item_candidates);

-- Remove demo assets.
delete from hub_assets ha
where ha.id in (select id from demo_hub_asset_candidates);

-- ------------------------------------------------------------
-- Delete only stock items that are not referenced elsewhere.
-- Referenced stock items are archived/deactivated to preserve audit trails.
-- ------------------------------------------------------------

create temp table blocked_demo_stock_items on commit drop as
select d.*
from demo_stock_item_candidates d
where exists (
  select 1 from scaffold_components sc where sc."stockItemId" = d.id
)
or exists (
  select 1 from stock_balances sb where sb."stockItemId" = d.id
)
or exists (
  select 1
  from information_schema.tables t
  where t.table_schema = 'public'
    and t.table_name = 'stock_movement_lines'
    and exists (
      select 1
      from stock_movement_lines sml
      where sml."stockItemId" = d.id
    )
);

-- Archive blocked demo stock items.
update stock_items si
set
  "isActive" = false,
  "itemName" = case
    when si."itemName" ilike '[ARCHIVED DEMO]%' then si."itemName"
    else '[ARCHIVED DEMO] ' || si."itemName"
  end,
  "legacySource" = 'DEMO_CLEANUP_ARCHIVED_REFERENCED_ROW',
  "updatedAt" = now()
where si.id in (select id from blocked_demo_stock_items);

-- Hard-delete unblocked demo stock items.
delete from stock_items si
where si.id in (select id from demo_stock_item_candidates)
  and si.id not in (select id from blocked_demo_stock_items);

commit;

-- ------------------------------------------------------------
-- Post-cleanup verification
-- ------------------------------------------------------------

select 'remaining_active_demo_stock_items' as check_name, count(*) as rows
from stock_items
where "isActive" = true
  and (
    "itemCode" in ('PPE-00002', 'PPE-GLOVES', 'SCF-STANDARD')
    or "itemName" ilike '%demo%'
  )
union all
select 'archived_referenced_demo_stock_items', count(*)
from stock_items
where "isActive" = false
  and "legacySource" = 'DEMO_CLEANUP_ARCHIVED_REFERENCED_ROW'
union all
select 'remaining_demo_scaffold_components', count(*)
from scaffold_components
where "componentNo" in ('SCF-2026-00001')
   or description ilike '%demo%'
union all
select 'remaining_demo_hub_assets', count(*)
from hub_assets
where "assetNo" ilike '%DEMO%'
   or name ilike '%demo%'
   or description ilike '%demo%';

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
