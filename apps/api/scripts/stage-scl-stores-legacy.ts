import {
  AssetImportBatchStatus,
  AssetImportLineStatus,
  PrismaClient,
} from '@prisma/client';

import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

type JsonRow = Record<string, unknown> & {
  _stagingRow?: number;
};

type StagingPayload = {
  formatVersion?: number;
  sourceWorkbook?: string;
  normalizedWorkbook?: string;
  purpose?: string;
  quantityAuthority?: string;
  liveStockPostingAllowed?: boolean;
  rows?: JsonRow[];
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

function nullable(
  value: unknown,
): string | null {
  const result = clean(value);

  return result
    ? result
    : null;
}

function numberOrNull(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  const parsed = Number(
    String(value)
      .replace(/,/g, '')
      .trim(),
  );

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function yesNo(
  value: unknown,
): boolean {
  return (
    clean(value)
      .toUpperCase() ===
    'YES'
  );
}

function splitList(
  value: unknown,
): string[] {
  return clean(value)
    .split(';')
    .map((item) =>
      item.trim(),
    )
    .filter(Boolean);
}

async function main() {
  const apply =
    hasFlag('apply');

  const fileArg =
    getArg('file');

  const batchNoArg =
    getArg('batch-no');

  if (!fileArg) {
    throw new Error(
      'Staging JSON is required. Example: --file="../../docs/Southin_SCL_Stores_Legacy_Staging.json"',
    );
  }

  const filePath =
    path.resolve(
      process.cwd(),
      fileArg,
    );

  if (
    !fs.existsSync(filePath)
  ) {
    throw new Error(
      `Staging JSON not found: ${filePath}`,
    );
  }

  const parsed =
    JSON.parse(
      fs.readFileSync(
        filePath,
        'utf8',
      ),
    ) as StagingPayload;

  if (
    parsed.formatVersion !== 1
  ) {
    throw new Error(
      `Unsupported staging formatVersion: ${String(parsed.formatVersion)}`,
    );
  }

  if (
    parsed.liveStockPostingAllowed !==
    false
  ) {
    throw new Error(
      'Safety check failed: staging file must explicitly set liveStockPostingAllowed=false.',
    );
  }

  const rows =
    Array.isArray(
      parsed.rows,
    )
      ? parsed.rows
      : [];

  if (
    rows.length === 0
  ) {
    throw new Error(
      'No staging rows were found in the JSON file.',
    );
  }

  const preparedRows =
    rows.map(
      (
        row,
        index,
      ) => {
        const importStatus =
          clean(
            row[
              'Import Status'
            ],
          ).toUpperCase();

        const inventoryControlType =
          clean(
            row[
              'Inventory Control Type'
            ],
          ).toUpperCase();

        return {
          stagingRow:
            Number(
              row._stagingRow ??
                index + 2,
            ),

          sourceSheet:
            clean(
              row[
                'Source Sheet'
              ],
            ),

          sourceRow:
            Number(
              row[
                'Source Row'
              ] ?? 0,
            ),

          locationCode:
            clean(
              row[
                'Location Code'
              ],
            ),

          sourceSite:
            nullable(
              row[
                'Source Site'
              ],
            ),

          section:
            clean(
              row.Section,
            ),

          itemName:
            clean(
              row[
                'Item Description'
              ],
            ),

          legacyCode:
            nullable(
              row[
                'Legacy Code'
              ],
            ),

          normalizedLegacyCode:
            nullable(
              row[
                'Normalized Legacy Code'
              ],
            ),

          quantityOnHand:
            numberOrNull(
              row[
                'Parsed Qty'
              ],
            ),

          unitOfMeasure:
            clean(
              row.UoM,
            ) || 'EA',

          conditionStatus:
            nullable(
              row.Condition,
            ),

          standardCost:
            numberOrNull(
              row[
                'Unit Price ZMW'
              ],
            ),

          serialNumbers:
            splitList(
              row[
                'Serial Numbers'
              ],
            ),

          itemType:
            clean(
              row[
                'Suggested Item Type'
              ],
            ),

          inventoryControlType,

          assetRegistrationRequired:
            yesNo(
              row[
                'Asset Registration'
              ],
            ),

          custodyTrackingRequired:
            yesNo(
              row[
                'Custody Tracking'
              ],
            ),

          isSerialized:
            yesNo(
              row.Serialized,
            ),

          classificationConfidence:
            clean(
              row[
                'Classification Confidence'
              ],
            ),

          validationIssues:
            splitList(
              row[
                'Validation Issues'
              ],
            ),

          importStatus,
        };
      },
    );

  const emptyNames =
    preparedRows.filter(
      (row) =>
        !row.itemName,
    );

  if (
    emptyNames.length >
    0
  ) {
    throw new Error(
      `${emptyNames.length} staging row(s) have no Item Description.`,
    );
  }

  const unexpectedStatus =
    preparedRows.filter(
      (row) =>
        ![
          'READY',
          'REVIEW',
        ].includes(
          row.importStatus,
        ),
    );

  if (
    unexpectedStatus.length >
    0
  ) {
    console.table(
      unexpectedStatus.map(
        (row) => ({
          stagingRow:
            row.stagingRow,

          itemName:
            row.itemName,

          importStatus:
            row.importStatus,
        }),
      ),
    );

    throw new Error(
      `${unexpectedStatus.length} staging row(s) have an unexpected Import Status.`,
    );
  }

  const unexpectedControl =
    preparedRows.filter(
      (row) =>
        ![
          'CONSUMABLE',
          'NON_CONSUMABLE',
        ].includes(
          row.inventoryControlType,
        ),
    );

  if (
    unexpectedControl.length >
    0
  ) {
    console.table(
      unexpectedControl.map(
        (row) => ({
          stagingRow:
            row.stagingRow,

          itemName:
            row.itemName,

          inventoryControlType:
            row.inventoryControlType,
        }),
      ),
    );

    throw new Error(
      `${unexpectedControl.length} staging row(s) have an invalid Inventory Control Type.`,
    );
  }

  const validRows =
    preparedRows.filter(
      (row) =>
        row.importStatus ===
        'READY',
    ).length;

  const warningRows =
    preparedRows.filter(
      (row) =>
        row.importStatus ===
        'REVIEW',
    ).length;

  console.log('');
  console.log(
    'SCL STORES LEGACY STAGING',
  );

  console.table({
    totalRows:
      preparedRows.length,

    readyRows:
      validRows,

    reviewRows:
      warningRows,

    mode:
      apply
        ? 'APPLY'
        : 'PREVIEW',
  });

  console.log('');
  console.log(
    'BY CONTROL TYPE',
  );

  console.table(
    [
      'CONSUMABLE',
      'NON_CONSUMABLE',
    ].map(
      (
        inventoryControlType,
      ) => ({
        inventoryControlType,

        rows:
          preparedRows.filter(
            (row) =>
              row.inventoryControlType ===
              inventoryControlType,
          ).length,
      }),
    ),
  );

  console.log('');
  console.log(
    'BY LOCATION',
  );

  const sourceSheets =
    [
      ...new Set(
        preparedRows.map(
          (row) =>
            row.sourceSheet,
        ),
      ),
    ].sort();

  console.table(
    sourceSheets.map(
      (sourceSheet) => {
        const locationRows =
          preparedRows.filter(
            (row) =>
              row.sourceSheet ===
              sourceSheet,
          );

        return {
          sourceSheet,

          rows:
            locationRows.length,

          ready:
            locationRows.filter(
              (row) =>
                row.importStatus ===
                'READY',
            ).length,

          review:
            locationRows.filter(
              (row) =>
                row.importStatus ===
                'REVIEW',
            ).length,
        };
      },
    ),
  );

  console.log('');
  console.log(
    'SAFETY CONTROL',
  );

  console.log(
    'Legacy quantities are REFERENCE ONLY.',
  );

  console.log(
    'This script does NOT create StockItem, StockLocation, StockBalance, StockMovement or StockLedger records.',
  );

  if (!apply) {
    console.log('');
    console.log(
      'PREVIEW ONLY - no database records were changed.',
    );

    return;
  }

  const now =
    new Date();

  const batchNo =
    batchNoArg ||
    `SCL-STORES-LEGACY-${now
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, '')}`;

  const existing =
    await prisma
      .assetImportBatch
      .findUnique({
        where: {
          batchNo,
        },

        select: {
          id: true,
          status: true,
        },
      });

  if (existing) {
    throw new Error(
      `Batch ${batchNo} already exists with status ${existing.status}. ` +
      'Use a different --batch-no. Existing staging batches are never overwritten.',
    );
  }

  const batch =
    await prisma
      .assetImportBatch
      .create({
        data: {
          batchNo,

          sourceType:
            'LEGACY_STORES_XLSX',

          fileName:
            path.basename(
              filePath,
            ),

          status:
            AssetImportBatchStatus.DRAFT,

          totalRows:
            preparedRows.length,

          validRows,

          warningRows,

          errorRows:
            0,

          postedRows:
            0,

          notes:
            'Legacy Stores staging only. Do not post these quantities to live StockBalance. ' +
            'Await the new physical stock count before establishing authoritative balances.',

          rawPayload: {
            sourceWorkbook:
              parsed.sourceWorkbook ??
              'SCL STORES.xlsx',

            normalizedWorkbook:
              parsed.normalizedWorkbook ??
              null,

            purpose:
              parsed.purpose ??
              'CATALOGUE_AND_LEGACY_REFERENCE',

            quantityAuthority:
              'REFERENCE_ONLY',

            liveStockPostingAllowed:
              false,
          },
        },
      });

  for (
    const row
    of preparedRows
  ) {
    const lineStatus =
      row.importStatus ===
      'READY'
        ? AssetImportLineStatus.VALID
        : AssetImportLineStatus.WARNING;

    await prisma
      .assetImportLine
      .create({
        data: {
          batchId:
            batch.id,

          rowNumber:
            row.stagingRow,

          itemCode:
            row.importStatus ===
              'READY'
              ? row.normalizedLegacyCode
              : null,

          itemName:
            row.itemName,

          itemType:
            row.itemType ||
            null,

          category:
            row.section ||
            null,

          unitOfMeasure:
            row.unitOfMeasure,

          locationCode:
            row.locationCode ||
            null,

          locationName:
            row.sourceSheet ||
            null,

          locationType:
            'LEGACY_STORE',

          site:
            row.sourceSite,

          quantityOnHand:
            row.quantityOnHand,

          standardCost:
            row.standardCost,

          conditionStatus:
            row.conditionStatus,

          status:
            lineStatus,

          validationErrors:
            row.validationIssues,

          rawPayload: {
            sourceSection:
              row.section,

            sourceRow:
              row.sourceRow,

            serialNumbers:
              row.serialNumbers,

            inventoryControlType:
              row.inventoryControlType,

            assetRegistrationRequired:
              row.assetRegistrationRequired,

            custodyTrackingRequired:
              row.custodyTrackingRequired,

            isSerialized:
              row.isSerialized,

            classificationConfidence:
              row.classificationConfidence,

            quantityIsLegacyReferenceOnly:
              true,

            liveStockPostingAllowed:
              false,
          },

          legacySourceTable:
            row.sourceSheet,

          legacyRecordId:
            `${row.sourceSheet}:${row.sourceRow}`,

          legacyCode:
            row.legacyCode,

          legacyPayload: {
            normalizedLegacyCode:
              row.normalizedLegacyCode,

            originalImportStatus:
              row.importStatus,
          },
        },
      });
  }

  console.log('');
  console.log(
    'LEGACY STAGING CREATED',
  );

  console.table({
    batchNo:
      batch.batchNo,

    batchId:
      batch.id,

    status:
      batch.status,

    totalRows:
      preparedRows.length,

    validRows,

    warningRows,
  });

  console.log('');
  console.log(
    'No live inventory records were posted. The batch is DRAFT and ready for review.',
  );
}

main()
  .catch(
    (error: unknown) => {
      console.error('');
      console.error(
        'Legacy Stores staging failed:',
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
