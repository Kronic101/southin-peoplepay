UPDATE "stock_items"
SET
  "inventoryControlType" = 'NON_CONSUMABLE',
  "assignmentPolicy" = 'DEPLOYMENT',
  "assetRegistrationRequired" = false,
  "custodyTrackingRequired" = false,
  "isSerialized" = false
WHERE
  "itemType" = 'SCAFFOLD_COMPONENT';
