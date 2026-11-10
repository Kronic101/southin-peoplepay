-- ============================================================
-- SOUTHIN STORES
-- Normalise reusable Tools and Equipment
--
-- Rule:
--   EQUIPMENT = NON_CONSUMABLE unless specifically reclassified later
--   TOOL      = NON_CONSUMABLE except known consumable tool supplies
--
-- Assignment:
--   Default reusable item = FLEXIBLE
--   Known site equipment  = SITE
--   Known personal item   = EMPLOYEE
-- ============================================================


-- ------------------------------------------------------------
-- 1. Equipment is reusable controlled stock.
-- ------------------------------------------------------------

UPDATE "stock_items"
SET
  "inventoryControlType" = 'NON_CONSUMABLE',
  "assignmentPolicy" = 'FLEXIBLE'
WHERE
  "itemType" = 'EQUIPMENT';


-- ------------------------------------------------------------
-- 2. Reusable tools.
--
-- Do NOT convert the following consumable supplies:
--   CERAMIC BELTS
--   FISH LINE
--   GREEN TAGS
--   RED TAGS
-- ------------------------------------------------------------

UPDATE "stock_items"
SET
  "inventoryControlType" = 'NON_CONSUMABLE',
  "assignmentPolicy" = 'FLEXIBLE'
WHERE
  "itemType" = 'TOOL'
  AND "itemCode" NOT IN (
    'SCL/EQ&T/0109-CERAMIC-BELTS',
    'SCL/EQ&T/0020',
    'SCL/EQ&T/0025',
    'SCL/EQ&T/0059'
  );


-- ------------------------------------------------------------
-- 3. Explicitly retain known consumable tool supplies.
-- ------------------------------------------------------------

UPDATE "stock_items"
SET
  "inventoryControlType" = 'CONSUMABLE',
  "assignmentPolicy" = 'NONE',
  "assetRegistrationRequired" = false,
  "custodyTrackingRequired" = false
WHERE
  "itemCode" IN (
    'SCL/EQ&T/0109-CERAMIC-BELTS',
    'SCL/EQ&T/0020',
    'SCL/EQ&T/0025',
    'SCL/EQ&T/0059'
  );


-- ------------------------------------------------------------
-- 4. Known fixed / site-controlled equipment.
-- ------------------------------------------------------------

UPDATE "stock_items"
SET
  "assignmentPolicy" = 'SITE',
  "custodyTrackingRequired" = false
WHERE
  "itemCode" IN (
    'SCL/MUF-SITE/EQP-0005', -- OFFICE CHAIRS
    'SCL/MUF-SITE/EQP-0004', -- OFFICE TABLE
    'SCL/MUF-SITE/EQP-0007', -- SPLIT AIR CONDITIONER
    'SCL/MUF-SITE/EQP-0006', -- WATER DISPENSER
    'SCL/MUF-SITE/EQP-0009', -- PRINTER
    'SCL/MUF-SITE/EQP-0008', -- FIRE EXTINGUISHER
    'SCL/SMC/0147-FIRST-AID-BOX', -- FIRST AID BOX
    'SCL/KAN-KMP/EQP-0001' -- AIR RECEIVER
  );


-- ------------------------------------------------------------
-- 5. Known employee-assigned equipment.
-- ------------------------------------------------------------

UPDATE "stock_items"
SET
  "assignmentPolicy" = 'EMPLOYEE',
  "custodyTrackingRequired" = true
WHERE
  "itemCode" IN (
    'SCL/MUF-SITE/EQP-0002' -- LAPTOP
  );


-- ------------------------------------------------------------
-- 6. Allen Key sets remain employee custody tools.
-- ------------------------------------------------------------

UPDATE "stock_items"
SET
  "inventoryControlType" = 'NON_CONSUMABLE',
  "assignmentPolicy" = 'EMPLOYEE',
  "custodyTrackingRequired" = true
WHERE
  upper("itemName") LIKE '%ALLEN KEY%';

