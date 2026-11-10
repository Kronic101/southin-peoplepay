import {
  AssetImportLineStatus,
  InventoryControlType,
  PrismaClient,
  StockItemType,
} from '@prisma/client';

const prisma = new PrismaClient();

const SOURCE_ACTOR = 'SCL_LEGACY_PROVISIONAL_IMPORT';
const REFERENCE_TYPE = 'LEGACY_PROVISIONAL_OPENING';
const PROVISIONAL_NOTE =
  'PROVISIONAL opening stock imported from legacy SCL STORES workbook for production testing. ' +
  'Supersede/reconcile through the new physical stock count when received.';

type Candidate = {
  itemCode: string;
  itemName: string;
  itemType: StockItemType;
  category: string | null;
  inventoryControlType: InventoryControlType;
  unitOfMeasure: string;
  standardCost: number | null;
  assetRegistrationRequired: boolean;
  custodyTrackingRequired: boolean;
  isSerialized: boolean;
  sourceLineIds: string[];
};

type Blocker = {
  itemCode: string;
  itemName: string;
  issue: string;
  detail?: string;
};

type LocationCandidate = {
  locationCode: string;
  locationName: string;
  site: string | null;
};

function getArg(name: string): string | null {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function clean(value: unknown): string {
  if (value === null || value === undefined) return '';

  return String(value)
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeName(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function jsonObject(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function jsonString(value: unknown): string {
  return clean(value);
}

function jsonBoolean(value: unknown): boolean {
  return value === true;
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [
    ...new Set(
      values
        .map((value) => clean(value))
        .filter(Boolean),
    ),
  ].sort();
}

function uniqueNumbers(values: unknown[]): number[] {
  const result = new Set<number>();

  for (const value of values) {
    if (value === null || value === undefined) continue;

    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      result.add(parsed);
    }
  }

  return [...result].sort((a, b) => a - b);
}

function asStockItemType(value: string): StockItemType | null {
  return Object.values(StockItemType).includes(value as StockItemType)
    ? (value as StockItemType)
    : null;
}

function asInventoryControlType(
  value: string,
): InventoryControlType | null {
  return Object.values(InventoryControlType).includes(
    value as InventoryControlType,
  )
    ? (value as InventoryControlType)
    : null;
}

function numberValue(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function main() {
  const apply = hasFlag('apply');
  const provisionalProduction = hasFlag('provisional-production');
  const batchNo = getArg('batch-no');

  if (!batchNo) {
    throw new Error(
      'Use --batch-no="SCL-STORES-LEGACY-20261013"',
    );
  }

  if (apply && !provisionalProduction) {
    throw new Error(
      'APPLY requires --provisional-production so the operator explicitly acknowledges ' +
        'that these are temporary production-test opening balances.',
    );
  }

  const batch = await prisma.assetImportBatch.findUnique({
    where: {
      batchNo,
    },

    include: {
      lines: {
        orderBy: {
          rowNumber: 'asc',
        },
      },
    },
  });

  if (!batch) {
    throw new Error(
      `Import batch ${batchNo} was not found.`,
    );
  }

  if (batch.sourceType !== 'LEGACY_STORES_XLSX') {
    throw new Error(
      `Batch ${batchNo} is ${batch.sourceType}, not LEGACY_STORES_XLSX.`,
    );
  }

  /*
   * VALID = not posted yet.
   * POSTED = already posted by an earlier successful run.
   *
   * Including both makes the script safe to preview/re-run.
   */
  const eligibleLines = batch.lines.filter(
    (line) =>
      line.status === AssetImportLineStatus.VALID ||
      line.status === AssetImportLineStatus.POSTED,
  );

  const warningLines = batch.lines.filter(
    (line) => line.status === AssetImportLineStatus.WARNING,
  );

  console.log('');
  console.log(
    'SCL STORES PROVISIONAL PRODUCTION BASELINE',
  );

  console.table({
    batchNo: batch.batchNo,
    batchStatus: batch.status,
    totalStagingRows: batch.lines.length,
    eligibleCleanRows: eligibleLines.length,
    quarantinedWarningRows: warningLines.length,
    mode: apply ? 'APPLY' : 'PREVIEW',
  });

  /*
   * Build location masters from ALL staged rows.
   *
   * This intentionally creates the full set of legacy stores even where every
   * item at a location is still quarantined. It does not create balances for
   * WARNING rows.
   */
  const locationMap = new Map<string, LocationCandidate>();
  const locationConflicts: string[] = [];

  for (const line of batch.lines) {
    const locationCode = clean(line.locationCode);

    if (!locationCode) {
      continue;
    }

    const candidate: LocationCandidate = {
      locationCode,
      locationName:
        clean(line.locationName) ||
        locationCode,
      site:
        clean(line.site) ||
        null,
    };

    const current = locationMap.get(locationCode);

    if (!current) {
      locationMap.set(
        locationCode,
        candidate,
      );

      continue;
    }

    if (
      normalizeName(current.locationName) !==
      normalizeName(candidate.locationName)
    ) {
      locationConflicts.push(
        `${locationCode}: location names "${current.locationName}" and "${candidate.locationName}"`,
      );
    }

    if (
      current.site &&
      candidate.site &&
      normalizeName(current.site) !==
        normalizeName(candidate.site)
    ) {
      locationConflicts.push(
        `${locationCode}: sites "${current.site}" and "${candidate.site}"`,
      );
    }

    if (
      !current.site &&
      candidate.site
    ) {
      current.site =
        candidate.site;
    }
  }

  if (locationConflicts.length > 0) {
    console.log('');
    console.log(
      'LOCATION CONFLICTS',
    );

    console.table(
      locationConflicts.map((issue) => ({
        issue,
      })),
    );

    throw new Error(
      'Resolve location conflicts before provisional posting.',
    );
  }

  /*
   * Group clean source rows by legacy item code.
   */
  const grouped = new Map<
    string,
    typeof eligibleLines
  >();

  for (const line of eligibleLines) {
    const itemCode = clean(line.itemCode);

    if (!itemCode) {
      continue;
    }

    const group =
      grouped.get(itemCode) ??
      [];

    group.push(line);

    grouped.set(
      itemCode,
      group,
    );
  }

  const candidates: Candidate[] = [];
  const blockers: Blocker[] = [];

  for (const [itemCode, lines] of grouped.entries()) {
    const names = uniqueStrings(
      lines.map(
        (line) => line.itemName,
      ),
    );

    if (names.length !== 1) {
      blockers.push({
        itemCode,
        itemName: names.join(' / '),
        issue: 'SOURCE_ITEM_NAME_CONFLICT',
        detail: names.join(' | '),
      });

      continue;
    }

    const itemName = names[0];

    const itemTypes = uniqueStrings(
      lines.map(
        (line) => line.itemType,
      ),
    );

    if (itemTypes.length !== 1) {
      blockers.push({
        itemCode,
        itemName,
        issue: 'SOURCE_ITEM_TYPE_CONFLICT',
        detail: itemTypes.join(' / '),
      });

      continue;
    }

    const itemType = asStockItemType(
      itemTypes[0],
    );

    if (!itemType) {
      blockers.push({
        itemCode,
        itemName,
        issue: 'INVALID_SOURCE_ITEM_TYPE',
        detail: itemTypes[0],
      });

      continue;
    }

    const controlTypes = uniqueStrings(
      lines.map((line) =>
        jsonString(
          jsonObject(
            line.rawPayload,
          ).inventoryControlType,
        ),
      ),
    );

    if (controlTypes.length !== 1) {
      blockers.push({
        itemCode,
        itemName,
        issue: 'SOURCE_CONTROL_TYPE_CONFLICT',
        detail: controlTypes.join(' / '),
      });

      continue;
    }

    const inventoryControlType =
      asInventoryControlType(
        controlTypes[0],
      );

    if (!inventoryControlType) {
      blockers.push({
        itemCode,
        itemName,
        issue: 'INVALID_SOURCE_CONTROL_TYPE',
        detail: controlTypes[0],
      });

      continue;
    }

    const units = uniqueStrings(
      lines.map(
        (line) => line.unitOfMeasure,
      ),
    );

    if (units.length > 1) {
      blockers.push({
        itemCode,
        itemName,
        issue: 'SOURCE_UOM_CONFLICT',
        detail: units.join(' / '),
      });

      continue;
    }

    const categories = uniqueStrings(
      lines.map(
        (line) => line.category,
      ),
    );

    const costs = uniqueNumbers(
      lines.map(
        (line) => line.standardCost,
      ),
    );

    candidates.push({
      itemCode,
      itemName,
      itemType,
      category:
        categories[0] ??
        null,
      inventoryControlType,
      unitOfMeasure:
        units[0] ||
        'EA',
      standardCost:
        costs.length === 1
          ? costs[0]
          : null,
      assetRegistrationRequired:
        lines.some((line) =>
          jsonBoolean(
            jsonObject(
              line.rawPayload,
            ).assetRegistrationRequired,
          ),
        ),
      custodyTrackingRequired:
        lines.some((line) =>
          jsonBoolean(
            jsonObject(
              line.rawPayload,
            ).custodyTrackingRequired,
          ),
        ),
      isSerialized:
        lines.some((line) =>
          jsonBoolean(
            jsonObject(
              line.rawPayload,
            ).isSerialized,
          ),
        ),
      sourceLineIds:
        lines.map(
          (line) => line.id,
        ),
    });
  }

  candidates.sort(
    (a, b) =>
      a.itemCode.localeCompare(
        b.itemCode,
      ),
  );

  blockers.sort(
    (a, b) =>
      a.itemCode.localeCompare(
        b.itemCode,
      ),
  );

  /*
   * Compare against current StockItem master.
   *
   * Existing master rows are preserved where possible:
   * - never rename an existing item automatically
   * - never downgrade serialized=true to false
   * - never downgrade existing asset/custody controls
   *
   * But for clean same-name records, the approved legacy staging classification
   * is allowed to promote the control to NON_CONSUMABLE for Stores request routing.
   */
  const existingItems = await prisma.stockItem.findMany({
    where: {
      itemCode: {
        in: candidates.map(
          (candidate) => candidate.itemCode,
        ),
      },
    },
  });

  const existingByCode = new Map(
    existingItems.map((item) => [
      item.itemCode,
      item,
    ]),
  );

  const newItems: Candidate[] = [];

  const safeExistingUpdates: Array<{
    candidate: Candidate;
    existing: (typeof existingItems)[number];
    changes: string[];
  }> = [];

  const compatibleExisting: Candidate[] = [];

  const existingBlockers: Blocker[] = [];

  for (const candidate of candidates) {
    const existing = existingByCode.get(
      candidate.itemCode,
    );

    if (!existing) {
      newItems.push(candidate);
      continue;
    }

    if (
      normalizeName(existing.itemName) !==
      normalizeName(candidate.itemName)
    ) {
      existingBlockers.push({
        itemCode: candidate.itemCode,
        itemName: candidate.itemName,
        issue: 'EXISTING_ITEM_NAME_CONFLICT',
        detail:
          `Database="${existing.itemName}" ` +
          `Staging="${candidate.itemName}"`,
      });

      continue;
    }

    const changes: string[] = [];

    if (
      existing.inventoryControlType ===
        InventoryControlType.CONSUMABLE &&
      candidate.inventoryControlType ===
        InventoryControlType.NON_CONSUMABLE
    ) {
      changes.push(
        'control CONSUMABLE -> NON_CONSUMABLE',
      );
    } else if (
      existing.inventoryControlType ===
        InventoryControlType.NON_CONSUMABLE &&
      candidate.inventoryControlType ===
        InventoryControlType.CONSUMABLE
    ) {
      changes.push(
        'preserve existing control=NON_CONSUMABLE; staged=CONSUMABLE',
      );
    }

    if (
      candidate.assetRegistrationRequired &&
      !existing.assetRegistrationRequired
    ) {
      changes.push(
        'assetRegistrationRequired false -> true',
      );
    }

    if (
      candidate.custodyTrackingRequired &&
      !existing.custodyTrackingRequired
    ) {
      changes.push(
        'custodyTrackingRequired false -> true',
      );
    }

    if (
      candidate.isSerialized &&
      !existing.isSerialized
    ) {
      changes.push(
        'isSerialized false -> true',
      );
    }

    if (
      existing.itemType !==
      candidate.itemType
    ) {
      changes.push(
        `preserve existing itemType=${existing.itemType}; staged=${candidate.itemType}`,
      );
    }

    if (changes.length === 0) {
      compatibleExisting.push(
        candidate,
      );
    } else {
      safeExistingUpdates.push({
        candidate,
        existing,
        changes,
      });
    }
  }

  const usableCodes = new Set(
    [
      ...newItems,
      ...compatibleExisting,
      ...safeExistingUpdates.map(
        (row) => row.candidate,
      ),
    ].map(
      (candidate) => candidate.itemCode,
    ),
  );

  /*
   * Aggregate provisional quantity by item/location.
   * Only clean rows whose item master can be safely resolved are included.
   */
  type BalancePlan = {
    itemCode: string;
    itemName: string;
    locationCode: string;
    locationName: string;
    quantityOnHand: number;
    sourceLineIds: string[];
  };

  const balancePlanMap = new Map<
    string,
    BalancePlan
  >();

  const quantityBlockers: Array<{
    itemCode: string;
    itemName: string;
    locationCode: string;
    issue: string;
  }> = [];

  for (const line of eligibleLines) {
    const itemCode = clean(
      line.itemCode,
    );

    const locationCode = clean(
      line.locationCode,
    );

    if (
      !itemCode ||
      !locationCode ||
      !usableCodes.has(itemCode)
    ) {
      continue;
    }

    if (
      line.quantityOnHand ===
        null ||
      line.quantityOnHand ===
        undefined
    ) {
      quantityBlockers.push({
        itemCode,
        itemName:
          clean(
            line.itemName,
          ),
        locationCode,
        issue: 'MISSING_QUANTITY',
      });

      continue;
    }

    const quantity = Number(
      line.quantityOnHand,
    );

    if (
      !Number.isFinite(quantity) ||
      quantity < 0
    ) {
      quantityBlockers.push({
        itemCode,
        itemName:
          clean(
            line.itemName,
          ),
        locationCode,
        issue: `INVALID_QUANTITY ${String(line.quantityOnHand)}`,
      });

      continue;
    }

    const key =
      `${itemCode}::${locationCode}`;

    const current =
      balancePlanMap.get(key);

    if (!current) {
      balancePlanMap.set(
        key,
        {
          itemCode,
          itemName:
            clean(
              line.itemName,
            ),
          locationCode,
          locationName:
            clean(
              line.locationName,
            ) ||
            locationCode,
          quantityOnHand:
            quantity,
          sourceLineIds: [
            line.id,
          ],
        },
      );

      continue;
    }

    current.quantityOnHand +=
      quantity;

    current.sourceLineIds.push(
      line.id,
    );
  }

  const balancePlans = [
    ...balancePlanMap.values(),
  ].sort((a, b) => {
    const byLocation =
      a.locationCode.localeCompare(
        b.locationCode,
      );

    return byLocation !== 0
      ? byLocation
      : a.itemCode.localeCompare(
          b.itemCode,
        );
  });

  const locations = [
    ...locationMap.values(),
  ].sort(
    (a, b) =>
      a.locationCode.localeCompare(
        b.locationCode,
      ),
  );

  const existingLocations =
    await prisma.stockLocation.findMany({
      where: {
        locationCode: {
          in: locations.map(
            (location) =>
              location.locationCode,
          ),
        },
      },
    });

  const existingLocationByCode =
    new Map(
      existingLocations.map(
        (location) => [
          location.locationCode,
          location,
        ],
      ),
    );

  const newLocations =
    locations.filter(
      (location) =>
        !existingLocationByCode.has(
          location.locationCode,
        ),
    );

  const existingLocationConflicts =
    locations.filter(
      (location) => {
        const existing =
          existingLocationByCode.get(
            location.locationCode,
          );

        if (!existing) return false;

        return (
          normalizeName(
            existing.locationName,
          ) !==
          normalizeName(
            location.locationName,
          )
        );
      },
    );

  console.log('');
  console.log(
    'PROVISIONAL MASTER-DATA PLAN',
  );

  console.table({
    catalogueCandidates:
      candidates.length,
    newStockItems:
      newItems.length,
    compatibleExistingItems:
      compatibleExisting.length,
    safeExistingClassificationUpdates:
      safeExistingUpdates.length,
    sourceCatalogueBlockers:
      blockers.length,
    existingNameConflicts:
      existingBlockers.length,
    newStockLocations:
      newLocations.length,
    existingStockLocations:
      existingLocations.length,
    locationConflicts:
      existingLocationConflicts.length,
  });

  if (safeExistingUpdates.length > 0) {
    console.log('');
    console.log(
      'SAFE EXISTING ITEM RECONCILIATIONS',
    );

    console.table(
      safeExistingUpdates.map(
        (row) => ({
          itemCode:
            row.candidate.itemCode,
          itemName:
            row.candidate.itemName,
          changes:
            row.changes.join('; '),
        }),
      ),
    );
  }

  if (
    blockers.length > 0 ||
    existingBlockers.length > 0
  ) {
    console.log('');
    console.log(
      'QUARANTINED ITEM CONFLICTS',
    );

    console.table([
      ...blockers,
      ...existingBlockers,
    ]);
  }

  const totalProvisionalQuantity =
    balancePlans.reduce(
      (sum, row) =>
        sum +
        row.quantityOnHand,
      0,
    );

  console.log('');
  console.log(
    'PROVISIONAL BALANCE PLAN',
  );

  console.table({
    balanceRows:
      balancePlans.length,
    totalProvisionalQuantity,
    quantityBlockers:
      quantityBlockers.length,
    warningSourceRowsExcluded:
      warningLines.length,
    stockMovementsToCreate:
      0,
    ledgerOpeningEntries:
      balancePlans.length,
  });

  if (quantityBlockers.length > 0) {
    console.log('');
    console.log(
      'QUANTITY BLOCKERS',
    );

    console.table(
      quantityBlockers,
    );
  }

  console.log('');
  console.log(
    'IMPORTANT',
  );

  console.log(
    'These are PROVISIONAL production-test balances from the old SCL STORES workbook.',
  );

  console.log(
    'When the new physical stock count arrives, reconcile through Stock Count adjustments; do not delete issue history.',
  );

  if (!apply) {
    console.log('');
    console.log(
      'PREVIEW ONLY - no database records were changed.',
    );

    return;
  }

  if (
    existingLocationConflicts.length > 0
  ) {
    throw new Error(
      `${existingLocationConflicts.length} StockLocation conflict(s) must be resolved before APPLY.`,
    );
  }

  /*
   * Create missing locations.
   */
  for (const location of newLocations) {
    await prisma.stockLocation.create({
      data: {
        locationCode:
          location.locationCode,
        locationName:
          location.locationName,
        locationType:
          'LEGACY_STORE',
        site:
          location.site,
        isActive:
          true,
      },
    });
  }

  /*
   * Create missing item masters.
   */
  for (const candidate of newItems) {
    await prisma.stockItem.create({
      data: {
        itemCode:
          candidate.itemCode,
        itemName:
          candidate.itemName,
        itemType:
          candidate.itemType,
        category:
          candidate.category,
        unitOfMeasure:
          candidate.unitOfMeasure,
        standardCost:
          candidate.standardCost,
        inventoryControlType:
          candidate.inventoryControlType,
        assetRegistrationRequired:
          candidate.assetRegistrationRequired,
        custodyTrackingRequired:
          candidate.custodyTrackingRequired,
        isSerialized:
          candidate.isSerialized,
        isQrTracked:
          false,
        isRfidTracked:
          false,
        isActive:
          true,
        legacyCode:
          candidate.itemCode,
        legacySource:
          'SCL STORES.xlsx',
      },
    });
  }

  /*
   * Safely promote existing same-name master records.
   *
   * We deliberately do not:
   * - rename them,
   * - downgrade serialized=true,
   * - downgrade asset/custody controls,
   * - change their current itemType automatically.
   */
  for (const row of safeExistingUpdates) {
    const candidate =
      row.candidate;

    await prisma.stockItem.update({
      where: {
        id:
          row.existing.id,
      },

      data: {
        inventoryControlType:
          row.existing.inventoryControlType ===
            InventoryControlType.NON_CONSUMABLE
            ? InventoryControlType.NON_CONSUMABLE
            : candidate.inventoryControlType,

        assetRegistrationRequired:
          row.existing.assetRegistrationRequired ||
          candidate.assetRegistrationRequired,

        custodyTrackingRequired:
          row.existing.custodyTrackingRequired ||
          candidate.custodyTrackingRequired,

        isSerialized:
          row.existing.isSerialized ||
          candidate.isSerialized,

        legacyCode:
          row.existing.legacyCode ||
          candidate.itemCode,

        legacySource:
          row.existing.legacySource ||
          'SCL STORES.xlsx',

        standardCost:
          row.existing.standardCost ??
          candidate.standardCost,
      },
    });
  }

  /*
   * Refresh IDs after master creation/reconciliation.
   */
  const liveItems =
    await prisma.stockItem.findMany({
      where: {
        itemCode: {
          in: [
            ...usableCodes,
          ],
        },
      },
    });

  const liveItemByCode =
    new Map(
      liveItems.map(
        (item) => [
          item.itemCode,
          item,
        ],
      ),
    );

  const liveLocations =
    await prisma.stockLocation.findMany({
      where: {
        locationCode: {
          in: locations.map(
            (location) =>
              location.locationCode,
          ),
        },
      },
    });

  const liveLocationByCode =
    new Map(
      liveLocations.map(
        (location) => [
          location.locationCode,
          location,
        ],
      ),
    );

  let balancesCreated = 0;
  let balancesConfirmed = 0;
  let ledgerCreated = 0;
  let sourceLinesPosted = 0;

  for (const plan of balancePlans) {
    const item =
      liveItemByCode.get(
        plan.itemCode,
      );

    const location =
      liveLocationByCode.get(
        plan.locationCode,
      );

    if (!item) {
      throw new Error(
        `Live StockItem missing after master creation: ${plan.itemCode}`,
      );
    }

    if (!location) {
      throw new Error(
        `Live StockLocation missing after master creation: ${plan.locationCode}`,
      );
    }

    const existingBalance =
      await prisma.stockBalance.findUnique({
        where: {
          stockItemId_locationId: {
            stockItemId:
              item.id,
            locationId:
              location.id,
          },
        },
      });

    let balanceId: string;

    if (!existingBalance) {
      const created =
        await prisma.stockBalance.create({
          data: {
            stockItemId:
              item.id,
            locationId:
              location.id,
            quantityOnHand:
              plan.quantityOnHand,
            quantityIssued:
              0,
            quantityDamaged:
              0,
            quantityLost:
              0,
          },
        });

      balanceId =
        created.id;

      balancesCreated++;
    } else {
      const hasActivity =
        numberValue(
          existingBalance.quantityIssued,
        ) !== 0 ||
        numberValue(
          existingBalance.quantityDamaged,
        ) !== 0 ||
        numberValue(
          existingBalance.quantityLost,
        ) !== 0;

      const sameQuantity =
        numberValue(
          existingBalance.quantityOnHand,
        ) ===
        plan.quantityOnHand;

      if (
        hasActivity &&
        !sameQuantity
      ) {
        throw new Error(
          `Refusing to overwrite active balance ${plan.itemCode} @ ${plan.locationCode}. ` +
            `Current on-hand=${existingBalance.quantityOnHand}; provisional=${plan.quantityOnHand}.`,
        );
      }

      if (
        !sameQuantity &&
        numberValue(
          existingBalance.quantityOnHand,
        ) !== 0
      ) {
        throw new Error(
          `Refusing to overwrite non-zero existing balance ${plan.itemCode} @ ${plan.locationCode}. ` +
            `Current=${existingBalance.quantityOnHand}; provisional=${plan.quantityOnHand}.`,
        );
      }

      if (!sameQuantity) {
        await prisma.stockBalance.update({
          where: {
            id:
              existingBalance.id,
          },

          data: {
            quantityOnHand:
              plan.quantityOnHand,
          },
        });
      }

      balanceId =
        existingBalance.id;

      balancesConfirmed++;
    }

    const existingLedger =
      await prisma.stockLedger.findFirst({
        where: {
          stockItemId:
            item.id,

          locationId:
            location.id,

          referenceType:
            REFERENCE_TYPE,

          referenceId:
            batch.id,
        },
      });

    if (!existingLedger) {
      await prisma.stockLedger.create({
        data: {
          stockItemId:
            item.id,

          locationId:
            location.id,

          transactionType:
            'OPENING_BALANCE_PROVISIONAL',

          quantityIn:
            plan.quantityOnHand,

          quantityOut:
            0,

          balanceAfter:
            plan.quantityOnHand,

          unitCost:
            item.standardCost,

          totalCost:
            item.standardCost
              ? Number(
                  item.standardCost,
                ) *
                plan.quantityOnHand
              : null,

          referenceType:
            REFERENCE_TYPE,

          referenceId:
            batch.id,

          referenceNo:
            batch.batchNo,

          site:
            location.site,

          branch:
            location.branch,

          department:
            location.department,

          notes:
            PROVISIONAL_NOTE,

          createdBy:
            SOURCE_ACTOR,
        },
      });

      ledgerCreated++;
    }

    for (const lineId of plan.sourceLineIds) {
      const currentLine =
        batch.lines.find(
          (line) =>
            line.id ===
            lineId,
        );

      if (!currentLine) {
        continue;
      }

      await prisma.assetImportLine.update({
        where: {
          id:
            lineId,
        },

        data: {
          status:
            AssetImportLineStatus.POSTED,

          postedStockItemId:
            item.id,

          postedLocationId:
            location.id,

          postedBalanceId:
            balanceId,
        },
      });

      sourceLinesPosted++;
    }
  }

  const postedLineIds =
    new Set(
      balancePlans.flatMap(
        (plan) =>
          plan.sourceLineIds,
      ),
    );

  await prisma.assetImportBatch.update({
    where: {
      id:
        batch.id,
    },

    data: {
      postedRows:
        postedLineIds.size,

      postedBy:
        SOURCE_ACTOR,

      postedAt:
        new Date(),

      notes:
        `${batch.notes ?? ''}\n${PROVISIONAL_NOTE}`.trim(),
    },
  });

  console.log('');
  console.log(
    'PROVISIONAL STORES BASELINE POSTED',
  );

  console.table({
    stockItemsCreated:
      newItems.length,

    existingItemsReconciled:
      safeExistingUpdates.length,

    compatibleExistingItems:
      compatibleExisting.length,

    quarantinedItemConflicts:
      blockers.length +
      existingBlockers.length,

    stockLocationsCreated:
      newLocations.length,

    balanceRowsCreated:
      balancesCreated,

    balanceRowsAlreadyPresent:
      balancesConfirmed,

    ledgerEntriesCreated:
      ledgerCreated,

    sourceLinesPosted,

    warningRowsStillQuarantined:
      warningLines.length,

    sourceBatchStatus:
      batch.status,
  });

  console.log('');
  console.log(
    'Production Stores can now use these balances for controlled testing.',
  );

  console.log(
    'When the new physical count arrives, load it as a Stock Count and post variances instead of deleting this ledger history.',
  );
}

main()
  .catch((error: unknown) => {
    console.error('');
    console.error(
      'Provisional Stores baseline failed:',
    );

    console.error(error);

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
