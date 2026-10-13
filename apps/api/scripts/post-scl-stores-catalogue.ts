import {
  AssetImportLineStatus,
  InventoryControlType,
  PrismaClient,
  StockItemType,
} from '@prisma/client';

const prisma = new PrismaClient();

type CandidateIssue = {
  itemCode: string;
  itemName: string;
  issue: string;
  detail?: string;
};

type CatalogueCandidate = {
  itemCode: string;
  itemName: string;
  itemType: StockItemType;
  inventoryControlType: InventoryControlType;
  unitOfMeasure: string;
  standardCost: number | null;
  assetRegistrationRequired: boolean;
  custodyTrackingRequired: boolean;
  isSerialized: boolean;
  sourceRows: number;
  sourceLocations: string[];
};

type LocationCandidate = {
  locationCode: string;
  locationName: string;
  site: string | null;
};

function getArg(name: string): string | null {
  const prefix = `--${name}=`;

  const found = process.argv.find((arg) =>
    arg.startsWith(prefix),
  );

  return found
    ? found.slice(prefix.length)
    : null;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function clean(value: unknown): string {
  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

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

function jsonObject(
  value: unknown,
): Record<string, unknown> {
  if (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  ) {
    return value as Record<
      string,
      unknown
    >;
  }

  return {};
}

function boolFromJson(
  value: unknown,
): boolean {
  return value === true;
}

function stringFromJson(
  value: unknown,
): string {
  return clean(value);
}

function uniqueStrings(
  values: Array<
    string | null | undefined
  >,
): string[] {
  return [
    ...new Set(
      values
        .map((value) =>
          clean(value),
        )
        .filter(Boolean),
    ),
  ].sort();
}

function uniqueNumbers(
  values: Array<
    unknown
  >,
): number[] {
  const result =
    new Set<number>();

  for (
    const value
    of values
  ) {
    if (
      value === null ||
      value === undefined
    ) {
      continue;
    }

    const parsed =
      Number(value);

    if (
      Number.isFinite(
        parsed,
      )
    ) {
      result.add(parsed);
    }
  }

  return [
    ...result,
  ].sort(
    (a, b) =>
      a - b,
  );
}

function asStockItemType(
  value: string,
): StockItemType | null {
  if (
    Object.values(
      StockItemType,
    ).includes(
      value as StockItemType,
    )
  ) {
    return value as StockItemType;
  }

  return null;
}

function asInventoryControlType(
  value: string,
): InventoryControlType | null {
  if (
    Object.values(
      InventoryControlType,
    ).includes(
      value as InventoryControlType,
    )
  ) {
    return value as InventoryControlType;
  }

  return null;
}

async function main() {
  const apply =
    hasFlag('apply');

  const batchNo =
    getArg(
      'batch-no',
    );

  if (!batchNo) {
    throw new Error(
      'Use --batch-no="SCL-STORES-LEGACY-20261013"',
    );
  }

  const batch =
    await prisma
      .assetImportBatch
      .findUnique({
        where: {
          batchNo,
        },

        include: {
          lines: {
            orderBy: {
              rowNumber:
                'asc',
            },
          },
        },
      });

  if (!batch) {
    throw new Error(
      `Import batch ${batchNo} was not found.`,
    );
  }

  if (
    batch.sourceType !==
    'LEGACY_STORES_XLSX'
  ) {
    throw new Error(
      `Batch ${batchNo} is ${batch.sourceType}, not LEGACY_STORES_XLSX.`,
    );
  }

  if (
    batch.status !==
    'DRAFT'
  ) {
    throw new Error(
      `Batch ${batchNo} must remain DRAFT during catalogue staging. Current status: ${batch.status}.`,
    );
  }

  const allLines =
    batch.lines;

  const validLines =
    allLines.filter(
      (line) =>
        line.status ===
        AssetImportLineStatus.VALID,
    );

  const warningLines =
    allLines.filter(
      (line) =>
        line.status ===
        AssetImportLineStatus.WARNING,
    );

  if (
    allLines.length !==
    batch.totalRows
  ) {
    throw new Error(
      `Batch integrity failure: header says ${batch.totalRows} rows but ${allLines.length} lines were found.`,
    );
  }

  console.log('');
  console.log(
    'SCL STORES CATALOGUE PREPARATION',
  );

  console.table({
    batchNo:
      batch.batchNo,

    batchStatus:
      batch.status,

    totalStagingRows:
      allLines.length,

    validRows:
      validLines.length,

    warningRows:
      warningLines.length,

    mode:
      apply
        ? 'APPLY'
        : 'PREVIEW',
  });

  /*
   * Build legacy StockLocation candidates from ALL staging lines.
   * This creates only location master records. It never creates balances.
   */
  const locationMap =
    new Map<
      string,
      LocationCandidate
    >();

  const locationIssues:
    string[] = [];

  for (
    const line
    of allLines
  ) {
    const locationCode =
      clean(
        line.locationCode,
      );

    if (!locationCode) {
      continue;
    }

    const locationName =
      clean(
        line.locationName,
      ) ||
      locationCode;

    const site =
      clean(
        line.site,
      ) || null;

    const existing =
      locationMap.get(
        locationCode,
      );

    if (!existing) {
      locationMap.set(
        locationCode,
        {
          locationCode,
          locationName,
          site,
        },
      );

      continue;
    }

    if (
      existing.locationName !==
      locationName
    ) {
      locationIssues.push(
        `${locationCode}: names "${existing.locationName}" and "${locationName}"`,
      );
    }

    if (
      existing.site &&
      site &&
      existing.site !==
      site
    ) {
      locationIssues.push(
        `${locationCode}: sites "${existing.site}" and "${site}"`,
      );
    }

    if (
      !existing.site &&
      site
    ) {
      existing.site =
        site;
    }
  }

  /*
   * Group only VALID rows by itemCode.
   * WARNING rows remain quarantined in the import batch.
   */
  const grouped =
    new Map<
      string,
      typeof validLines
    >();

  for (
    const line
    of validLines
  ) {
    const itemCode =
      clean(
        line.itemCode,
      );

    if (!itemCode) {
      continue;
    }

    const group =
      grouped.get(
        itemCode,
      ) ?? [];

    group.push(
      line,
    );

    grouped.set(
      itemCode,
      group,
    );
  }

  const candidates:
    CatalogueCandidate[] = [];

  const blocked:
    CandidateIssue[] = [];

  const mergedGroups:
    Array<{
      itemCode: string;
      itemName: string;
      sourceRows: number;
      sourceLocations: string;
      serializedPromoted: boolean;
    }> = [];

  for (
    const [
      itemCode,
      lines,
    ]
    of grouped.entries()
  ) {
    const names =
      uniqueStrings(
        lines.map(
          (line) =>
            line.itemName,
        ),
      );

    if (
      names.length !== 1
    ) {
      blocked.push({
        itemCode,

        itemName:
          names.join(
            ' / ',
          ),

        issue:
          'ITEM_NAME_CONFLICT',

        detail:
          names.join(
            ' | ',
          ),
      });

      continue;
    }

    const itemName =
      names[0];

    const itemTypes =
      uniqueStrings(
        lines.map(
          (line) =>
            line.itemType,
        ),
      );

    if (
      itemTypes.length !== 1
    ) {
      blocked.push({
        itemCode,
        itemName,

        issue:
          'ITEM_TYPE_CONFLICT',

        detail:
          itemTypes.join(
            ' / ',
          ),
      });

      continue;
    }

    const itemType =
      asStockItemType(
        itemTypes[0],
      );

    if (!itemType) {
      blocked.push({
        itemCode,
        itemName,

        issue:
          'INVALID_ITEM_TYPE',

        detail:
          itemTypes[0],
      });

      continue;
    }

    const controlTypes =
      uniqueStrings(
        lines.map(
          (line) =>
            stringFromJson(
              jsonObject(
                line.rawPayload,
              )
                .inventoryControlType,
            ),
        ),
      );

    if (
      controlTypes.length !==
      1
    ) {
      blocked.push({
        itemCode,
        itemName,

        issue:
          'INVENTORY_CONTROL_CONFLICT',

        detail:
          controlTypes.join(
            ' / ',
          ),
      });

      continue;
    }

    const inventoryControlType =
      asInventoryControlType(
        controlTypes[0],
      );

    if (
      !inventoryControlType
    ) {
      blocked.push({
        itemCode,
        itemName,

        issue:
          'INVALID_INVENTORY_CONTROL',

        detail:
          controlTypes[0],
      });

      continue;
    }

    const units =
      uniqueStrings(
        lines.map(
          (line) =>
            line.unitOfMeasure,
        ),
      );

    if (
      units.length > 1
    ) {
      blocked.push({
        itemCode,
        itemName,

        issue:
          'UNIT_OF_MEASURE_CONFLICT',

        detail:
          units.join(
            ' / ',
          ),
      });

      continue;
    }

    const unitOfMeasure =
      units[0] ||
      'EA';

    const costs =
      uniqueNumbers(
        lines.map(
          (line) =>
            line.standardCost,
        ),
      );

    const standardCost =
      costs.length === 1
        ? costs[0]
        : null;

    const assetRegistrationRequired =
      lines.some(
        (line) =>
          boolFromJson(
            jsonObject(
              line.rawPayload,
            )
              .assetRegistrationRequired,
          ),
      );

    const custodyTrackingRequired =
      lines.some(
        (line) =>
          boolFromJson(
            jsonObject(
              line.rawPayload,
            )
              .custodyTrackingRequired,
          ),
      );

    const serializedValues =
      lines.map(
        (line) =>
          boolFromJson(
            jsonObject(
              line.rawPayload,
            )
              .isSerialized,
          ),
      );

    const isSerialized =
      serializedValues.some(
        Boolean,
      );

    const sourceLocations =
      uniqueStrings(
        lines.map(
          (line) =>
            line.locationName,
        ),
      );

    if (
      lines.length > 1
    ) {
      mergedGroups.push({
        itemCode,
        itemName,

        sourceRows:
          lines.length,

        sourceLocations:
          sourceLocations.join(
            ', ',
          ),

        serializedPromoted:
          isSerialized &&
          serializedValues.some(
            (value) =>
              value === false,
          ),
      });
    }

    candidates.push({
      itemCode,
      itemName,
      itemType,
      inventoryControlType,
      unitOfMeasure,
      standardCost,
      assetRegistrationRequired,
      custodyTrackingRequired,
      isSerialized,
      sourceRows:
        lines.length,
      sourceLocations,
    });
  }

  candidates.sort(
    (
      a,
      b,
    ) =>
      a.itemCode.localeCompare(
        b.itemCode,
      ),
  );

  blocked.sort(
    (
      a,
      b,
    ) =>
      a.itemCode.localeCompare(
        b.itemCode,
      ),
  );

  const locationCandidates =
    [
      ...locationMap.values(),
    ].sort(
      (
        a,
        b,
      ) =>
        a.locationCode.localeCompare(
          b.locationCode,
        ),
    );

  console.log('');
  console.log(
    'CATALOGUE GROUPING',
  );

  console.table({
    validSourceRows:
      validLines.length,

    uniqueValidCodes:
      grouped.size,

    mergedDuplicateCodeGroups:
      mergedGroups.length,

    catalogueCandidates:
      candidates.length,

    blockedCandidates:
      blocked.length,

    quarantinedWarningRows:
      warningLines.length,
  });

  if (
    mergedGroups.length >
    0
  ) {
    console.log('');
    console.log(
      'MERGED DUPLICATE-CODE GROUPS',
    );

    console.table(
      mergedGroups,
    );
  }

  if (
    blocked.length >
    0
  ) {
    console.log('');
    console.log(
      'BLOCKED CATALOGUE CANDIDATES',
    );

    console.table(
      blocked,
    );
  }

  if (
    locationIssues.length >
    0
  ) {
    console.log('');
    console.log(
      'LOCATION MASTER CONFLICTS',
    );

    console.table(
      locationIssues.map(
        (issue) => ({
          issue,
        }),
      ),
    );

    throw new Error(
      'Location master conflicts must be resolved before catalogue creation.',
    );
  }

  /*
   * Compare candidates against current production master data.
   * Existing items are NOT modified by this script.
   */
  const existingItems =
    await prisma
      .stockItem
      .findMany({
        where: {
          itemCode: {
            in:
              candidates.map(
                (candidate) =>
                  candidate.itemCode,
              ),
          },
        },

        select: {
          id: true,
          itemCode: true,
          itemName: true,
          itemType: true,
          inventoryControlType:
            true,
          unitOfMeasure:
            true,
          assetRegistrationRequired:
            true,
          custodyTrackingRequired:
            true,
          isSerialized:
            true,
        },
      });

  const existingItemMap =
    new Map(
      existingItems.map(
        (item) => [
          item.itemCode,
          item,
        ],
      ),
    );

  const createCandidates:
    CatalogueCandidate[] = [];

  const existingCompatible:
    CatalogueCandidate[] = [];

  const existingConflicts:
    CandidateIssue[] = [];

  for (
    const candidate
    of candidates
  ) {
    const existing =
      existingItemMap.get(
        candidate.itemCode,
      );

    if (!existing) {
      createCandidates.push(
        candidate,
      );

      continue;
    }

    if (
      normalizeName(
        existing.itemName,
      ) !==
      normalizeName(
        candidate.itemName,
      )
    ) {
      existingConflicts.push({
        itemCode:
          candidate.itemCode,

        itemName:
          candidate.itemName,

        issue:
          'EXISTING_ITEM_NAME_CONFLICT',

        detail:
          `Database="${existing.itemName}" Import="${candidate.itemName}"`,
      });

      continue;
    }

    const differences:
      string[] = [];

    if (
      existing.itemType !==
      candidate.itemType
    ) {
      differences.push(
        `itemType ${existing.itemType} -> ${candidate.itemType}`,
      );
    }

    if (
      existing.inventoryControlType !==
      candidate.inventoryControlType
    ) {
      differences.push(
        `control ${existing.inventoryControlType} -> ${candidate.inventoryControlType}`,
      );
    }

    if (
      existing.unitOfMeasure !==
      candidate.unitOfMeasure
    ) {
      differences.push(
        `UoM ${existing.unitOfMeasure} -> ${candidate.unitOfMeasure}`,
      );
    }

    if (
      existing.assetRegistrationRequired !==
      candidate.assetRegistrationRequired
    ) {
      differences.push(
        `assetRegistrationRequired ${existing.assetRegistrationRequired} -> ${candidate.assetRegistrationRequired}`,
      );
    }

    if (
      existing.custodyTrackingRequired !==
      candidate.custodyTrackingRequired
    ) {
      differences.push(
        `custodyTrackingRequired ${existing.custodyTrackingRequired} -> ${candidate.custodyTrackingRequired}`,
      );
    }

    if (
      existing.isSerialized !==
      candidate.isSerialized
    ) {
      differences.push(
        `isSerialized ${existing.isSerialized} -> ${candidate.isSerialized}`,
      );
    }

    if (
      differences.length >
      0
    ) {
      existingConflicts.push({
        itemCode:
          candidate.itemCode,

        itemName:
          candidate.itemName,

        issue:
          'EXISTING_ITEM_CLASSIFICATION_DIFFERS',

        detail:
          differences.join(
            '; ',
          ),
      });

      continue;
    }

    existingCompatible.push(
      candidate,
    );
  }

  const existingLocations =
    await prisma
      .stockLocation
      .findMany({
        where: {
          locationCode: {
            in:
              locationCandidates.map(
                (candidate) =>
                  candidate.locationCode,
              ),
          },
        },

        select: {
          id: true,
          locationCode: true,
          locationName: true,
          site: true,
          locationType: true,
        },
      });

  const existingLocationMap =
    new Map(
      existingLocations.map(
        (location) => [
          location.locationCode,
          location,
        ],
      ),
    );

  const locationsToCreate =
    locationCandidates.filter(
      (candidate) =>
        !existingLocationMap.has(
          candidate.locationCode,
        ),
    );

  const locationExistingConflicts =
    locationCandidates
      .filter(
        (candidate) => {
          const existing =
            existingLocationMap.get(
              candidate.locationCode,
            );

          if (!existing) {
            return false;
          }

          return (
            normalizeName(
              existing.locationName,
            ) !==
              normalizeName(
                candidate.locationName,
              ) ||
            (
              existing.site &&
              candidate.site &&
              normalizeName(
                existing.site,
              ) !==
                normalizeName(
                  candidate.site,
                )
            )
          );
        },
      )
      .map(
        (candidate) => {
          const existing =
            existingLocationMap.get(
              candidate.locationCode,
            )!;

          return {
            locationCode:
              candidate.locationCode,

            existingName:
              existing.locationName,

            stagedName:
              candidate.locationName,

            existingSite:
              existing.site,

            stagedSite:
              candidate.site,
          };
        },
      );

  console.log('');
  console.log(
    'DATABASE IMPACT PREVIEW',
  );

  console.table({
    stockItemsToCreate:
      createCandidates.length,

    stockItemsAlreadyCompatible:
      existingCompatible.length,

    stockItemsBlockedByExistingData:
      existingConflicts.length,

    stockLocationsToCreate:
      locationsToCreate.length,

    stockLocationsAlreadyExist:
      existingLocations.length,

    stockLocationConflicts:
      locationExistingConflicts.length,

    stockBalancesToCreate:
      0,

    quantitiesToPost:
      0,

    warningRowsStillQuarantined:
      warningLines.length,

    candidateConflictsStillBlocked:
      blocked.length,
  });

  if (
    existingConflicts.length >
    0
  ) {
    console.log('');
    console.log(
      'EXISTING STOCK ITEM CONFLICTS',
    );

    console.table(
      existingConflicts,
    );
  }

  if (
    locationExistingConflicts.length >
    0
  ) {
    console.log('');
    console.log(
      'EXISTING STOCK LOCATION CONFLICTS',
    );

    console.table(
      locationExistingConflicts,
    );
  }

  console.log('');
  console.log(
    'SAFETY CONTROL',
  );

  console.log(
    'This script creates catalogue/location MASTER DATA only.',
  );

  console.log(
    'It never creates or changes StockBalance, StockMovement or StockLedger quantities.',
  );

  if (!apply) {
    console.log('');
    console.log(
      'PREVIEW ONLY - no database records were changed.',
    );

    return;
  }

  if (
    existingConflicts.length >
    0
  ) {
    throw new Error(
      `${existingConflicts.length} existing StockItem conflict(s) must be reviewed before APPLY.`,
    );
  }

  if (
    locationExistingConflicts.length >
    0
  ) {
    throw new Error(
      `${locationExistingConflicts.length} existing StockLocation conflict(s) must be reviewed before APPLY.`,
    );
  }

  let createdLocations =
    0;

  for (
    const location
    of locationsToCreate
  ) {
    await prisma
      .stockLocation
      .create({
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

    createdLocations++;
  }

  let createdItems =
    0;

  for (
    const candidate
    of createCandidates
  ) {
    await prisma
      .stockItem
      .create({
        data: {
          itemCode:
            candidate.itemCode,

          itemName:
            candidate.itemName,

          itemType:
            candidate.itemType,

          category:
            candidate.itemType,

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

    createdItems++;
  }

  console.log('');
  console.log(
    'CATALOGUE MASTER DATA CREATED',
  );

  console.table({
    createdStockItems:
      createdItems,

    compatibleExistingStockItems:
      existingCompatible.length,

    blockedCatalogueCandidates:
      blocked.length,

    createdStockLocations:
      createdLocations,

    existingStockLocations:
      existingLocations.length,

    createdStockBalances:
      0,

    quantityPosted:
      0,

    sourceBatchStatus:
      batch.status,
  });

  console.log('');
  console.log(
    'The source import batch remains DRAFT. WARNING rows remain quarantined for review.',
  );

  console.log(
    'Wait for the new physical stock count before establishing authoritative StockBalance quantities.',
  );
}

main()
  .catch(
    (error: unknown) => {
      console.error('');
      console.error(
        'Catalogue preparation failed:',
      );

      console.error(error);

      process.exit(1);
    },
  )
  .finally(
    async () => {
      await prisma.$disconnect();
    },
  );
