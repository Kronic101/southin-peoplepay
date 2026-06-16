import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateAssetImportPreviewDto,
  PostAssetImportBatchDto,
} from '../dto/asset-import.dto';

type CsvRow = Record<string, string>;

function clean(value: unknown) {
  return String(value ?? '').trim();
}

function numberOrNull(value: unknown) {
  const parsed = Number(clean(value).replace(/,/g, ''));

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function normaliseHeader(value: string) {
  return clean(value)
    .replace(/\uFEFF/g, '')
    .replace(/\s+/g, '')
    .replace(/_/g, '')
    .replace(/-/g, '')
    .toLowerCase();
}

function splitCsvLine(line: string) {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current.trim());

  return result;
}

function parseCsv(csvText: string): CsvRow[] {
  const lines = csvText
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = splitCsvLine(lines[0]).map(normaliseHeader);

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row: CsvRow = {};

    headers.forEach((header, index) => {
      row[header] = clean(values[index]);
    });

    return row;
  });
}

function getValue(row: CsvRow, keys: string[]) {
  for (const key of keys) {
    const normalised = normaliseHeader(key);

    if (row[normalised] !== undefined && row[normalised] !== '') {
      return row[normalised];
    }
  }

  return '';
}

function makeBatchNo() {
  const year = new Date().getFullYear();
  const stamp = Date.now().toString().slice(-6);

  return `IMP-${year}-${stamp}`;
}

/**
 * Allows imported Omni Core codes to remain intact while also allowing
 * new Southin-generated codes when a source file has no code.
 */
function buildStockItemCode(input: {
  itemCode?: string | null;
  itemType?: string | null;
  category?: string | null;
  rowNumber?: number;
}) {
  const provided = clean(input.itemCode);

  if (provided) {
    return provided.toUpperCase();
  }

  const sourcePrefix = clean(input.itemType || input.category || 'STOCK')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 14);

  const prefix = sourcePrefix || 'STOCK';
  const sequence = String(input.rowNumber || Date.now()).padStart(5, '0');

  return `${prefix}-${sequence}`;
}

function buildMovementNo(lineRowNumber: number) {
  const year = new Date().getFullYear();
  const stamp = String(Date.now()).slice(-8);

  return `IMP-MOV-${year}-${stamp}-${lineRowNumber}`;
}

@Injectable()
export class AssetsImportService {
  constructor(private readonly prisma: PrismaService) {}

  async createPreview(dto: CreateAssetImportPreviewDto) {
    if (!dto.csvText || !dto.csvText.trim()) {
      throw new BadRequestException('CSV data is required.');
    }

    const rows = parseCsv(dto.csvText);

    if (rows.length === 0) {
      throw new BadRequestException(
        'No import rows found. Make sure the CSV has a header row and at least one data row.',
      );
    }

    const mappedRows = rows.map((row, index) => {
      const rowNumber = index + 2;

      const rawItemCode = getValue(row, [
        'itemCode',
        'Item Code',
        'Stock Code',
        'Code',
        'Omni Code',
        'Omini Code',
      ]);

      const itemName = getValue(row, [
        'itemName',
        'Item Name',
        'Description',
        'Item Description',
      ]);

      const itemTypeFromFile = getValue(row, ['itemType', 'Item Type']);
      const categoryFromFile = getValue(row, ['category', 'Category']);

      const itemType =
        itemTypeFromFile ||
        (rawItemCode.toUpperCase().includes('SCF') ? 'SCAFFOLD_COMPONENT' : 'OTHER');

      const category =
        categoryFromFile ||
        (rawItemCode.toUpperCase().includes('SCF') ? 'Scaffold' : 'General');

      const itemCode = buildStockItemCode({
        itemCode: rawItemCode,
        itemType,
        category,
        rowNumber,
      });

      const locationCode =
        getValue(row, ['locationCode', 'Location Code', 'Store Code']) || 'KMD-STORES';

      const locationName =
        getValue(row, ['locationName', 'Location Name', 'Store Room', 'Location']) ||
        'Kitwe Main Distribution Centre Stores';

      const quantityOnHand = numberOrNull(
        getValue(row, ['quantityOnHand', 'Qty', 'Quantity', 'Physical Qty', 'System Qty']),
      );

      const errors: string[] = [];
      const warnings: string[] = [];

      if (!itemName) {
        errors.push('Item name is required.');
      }

      if (!rawItemCode) {
        warnings.push(
          `No source item code supplied. System generated stock item code ${itemCode}.`,
        );
      }

      if (!locationCode) {
        errors.push('Location code is required.');
      }

      if (!locationName) {
        errors.push('Location name is required.');
      }

      if (quantityOnHand === null) {
        errors.push('Quantity on hand must be numeric.');
      }

      const qrTagCode = getValue(row, ['qrTagCode', 'QR Tag', 'QR Code']);

      const scaffoldComponentNo = getValue(row, [
        'scaffoldComponentNo',
        'Scaffold Component No',
        'Component No',
      ]);

      if (qrTagCode && !scaffoldComponentNo && !itemCode.toUpperCase().includes('SCF')) {
        warnings.push('QR tag supplied for non-scaffold or unclassified item.');
      }

      return {
        rowNumber,
        itemCode,
        itemName,
        itemType,
        category,
        unitOfMeasure: getValue(row, ['unitOfMeasure', 'UOM', 'Unit']) || 'EA',
        locationCode,
        locationName,
        locationType: getValue(row, ['locationType', 'Location Type']) || 'SITE_STORE',
        site: getValue(row, ['site', 'Site']) || 'Kitwe Main Distribution Centre',
        branch: getValue(row, ['branch', 'Branch']) || 'Kitwe',
        department: getValue(row, ['department', 'Department']) || 'Operations',
        quantityOnHand,
        minimumLevel: numberOrNull(getValue(row, ['minimumLevel', 'Minimum Level', 'Min'])),
        reorderLevel: numberOrNull(getValue(row, ['reorderLevel', 'Reorder Level'])),
        standardCost: numberOrNull(getValue(row, ['standardCost', 'Standard Cost', 'Unit Cost'])),
        scaffoldComponentNo,
        componentType: getValue(row, ['componentType', 'Component Type']),
        conditionStatus: getValue(row, ['conditionStatus', 'Condition']) || 'GOOD',
        tagStatus: getValue(row, ['tagStatus', 'Tag Status']) || 'AVAILABLE',
        qrTagCode,
        status: errors.length > 0 ? 'ERROR' : warnings.length > 0 ? 'WARNING' : 'VALID',
        validationErrors: {
          errors,
          warnings,
          sourceItemCode: rawItemCode || null,
          systemItemCode: itemCode,
        },
        rawPayload: {
          ...row,
          sourceItemCode: rawItemCode || null,
          systemItemCode: itemCode,
        },
      };
    });

    const totalRows = mappedRows.length;
    const validRows = mappedRows.filter((row) => row.status === 'VALID').length;
    const warningRows = mappedRows.filter((row) => row.status === 'WARNING').length;
    const errorRows = mappedRows.filter((row) => row.status === 'ERROR').length;

    const batch = await (this.prisma as any).assetImportBatch.create({
      data: {
        batchNo: makeBatchNo(),
        sourceType: clean(dto.sourceType) || 'OMNI_CORE',
        fileName: clean(dto.fileName) || null,
        status: errorRows > 0 ? 'DRAFT' : 'VALIDATED',
        totalRows,
        validRows,
        warningRows,
        errorRows,
        createdBy: clean(dto.createdBy) || 'Asset Manager',
        rawPayload: {
          sourceType: dto.sourceType,
          fileName: dto.fileName,
        },
        lines: {
          create: mappedRows.map((row) => ({
            rowNumber: row.rowNumber,
            itemCode: row.itemCode || null,
            itemName: row.itemName || null,
            itemType: row.itemType || null,
            category: row.category || null,
            unitOfMeasure: row.unitOfMeasure || null,
            locationCode: row.locationCode || null,
            locationName: row.locationName || null,
            locationType: row.locationType || null,
            site: row.site || null,
            branch: row.branch || null,
            department: row.department || null,
            quantityOnHand: row.quantityOnHand,
            minimumLevel: row.minimumLevel,
            reorderLevel: row.reorderLevel,
            standardCost: row.standardCost,
            scaffoldComponentNo: row.scaffoldComponentNo || null,
            componentType: row.componentType || null,
            conditionStatus: row.conditionStatus || null,
            tagStatus: row.tagStatus || null,
            qrTagCode: row.qrTagCode || null,
            status: row.status,
            validationErrors: row.validationErrors,
            rawPayload: row.rawPayload,
          })),
        },
      },
      include: {
        lines: {
          orderBy: {
            rowNumber: 'asc',
          },
        },
      },
    });

    return {
      message: 'Asset import preview created successfully.',
      batch,
    };
  }

  async listBatches() {
    return (this.prisma as any).assetImportBatch.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        lines: {
          orderBy: {
            rowNumber: 'asc',
          },
        },
      },
      take: 25,
    });
  }

  async getBatch(id: string) {
    const batch = await (this.prisma as any).assetImportBatch.findUnique({
      where: {
        id,
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
      throw new NotFoundException('Import batch not found.');
    }

    return batch;
  }

  async postBatch(id: string, dto: PostAssetImportBatchDto) {
    const batch = await this.getBatch(id);

    if (batch.status === 'POSTED') {
      throw new BadRequestException('Import batch has already been posted.');
    }

    if (batch.errorRows > 0) {
      throw new BadRequestException(
        'Import batch has validation errors. Fix the file and create a new preview before posting.',
      );
    }

    const lines = batch.lines.filter((line: any) =>
      ['VALID', 'WARNING'].includes(line.status),
    );

    const postedBy = clean(dto.postedBy) || batch.createdBy || 'Asset Manager';
    const now = new Date();

    let postedRows = 0;

    for (const line of lines) {
      const itemCode = buildStockItemCode({
        itemCode: line.itemCode,
        itemType: line.itemType,
        category: line.category,
        rowNumber: line.rowNumber,
      });

      const quantityOnHand = Number(line.quantityOnHand ?? 0);
      const standardCost =
        line.standardCost === null || line.standardCost === undefined
          ? null
          : Number(line.standardCost);

      const unitCost = standardCost ?? 0;
      const totalCost = quantityOnHand * unitCost;

      const stockItem = await (this.prisma as any).stockItem.upsert({
        where: {
          itemCode,
        },
        update: {
          itemName: line.itemName,
          itemType: line.itemType || 'OTHER',
          category: line.category || 'General',
          unitOfMeasure: line.unitOfMeasure || 'EA',
          minimumLevel: line.minimumLevel ?? 0,
          reorderLevel: line.reorderLevel ?? 0,
          standardCost,
          isQrTracked: Boolean(line.qrTagCode),
          isSerialized: Boolean(line.scaffoldComponentNo),
          isActive: true,
        },
        create: {
          itemCode,
          itemName: line.itemName,
          itemType: line.itemType || 'OTHER',
          category: line.category || 'General',
          unitOfMeasure: line.unitOfMeasure || 'EA',
          minimumLevel: line.minimumLevel ?? 0,
          reorderLevel: line.reorderLevel ?? 0,
          standardCost,
          isQrTracked: Boolean(line.qrTagCode),
          isSerialized: Boolean(line.scaffoldComponentNo),
          isActive: true,
        },
      });

      const location = await (this.prisma as any).stockLocation.upsert({
        where: {
          locationCode: line.locationCode,
        },
        update: {
          locationName: line.locationName,
          locationType: line.locationType || 'SITE_STORE',
          site: line.site || null,
          branch: line.branch || null,
          department: line.department || null,
          isActive: true,
        },
        create: {
          locationCode: line.locationCode,
          locationName: line.locationName,
          locationType: line.locationType || 'SITE_STORE',
          site: line.site || null,
          branch: line.branch || null,
          department: line.department || null,
          isActive: true,
        },
      });

      const existingBalance = await (this.prisma as any).stockBalance.findFirst({
        where: {
          stockItemId: stockItem.id,
          locationId: location.id,
        },
      });

      const balance = existingBalance
        ? await (this.prisma as any).stockBalance.update({
            where: {
              id: existingBalance.id,
            },
            data: {
              quantityOnHand,
            },
          })
        : await (this.prisma as any).stockBalance.create({
            data: {
              stockItemId: stockItem.id,
              locationId: location.id,
              quantityOnHand,
              quantityIssued: 0,
              quantityDamaged: 0,
              quantityLost: 0,
            },
          });

      let scaffoldComponent = null;

      if (line.scaffoldComponentNo) {
        scaffoldComponent = await (this.prisma as any).scaffoldComponent.upsert({
          where: {
            componentNo: line.scaffoldComponentNo,
          },
          update: {
            componentType: line.componentType || 'STANDARD',
            description: line.itemName,
            stockItemId: stockItem.id,
            currentSite: line.site || null,
            currentLocation: location.locationCode,
            conditionStatus: line.conditionStatus || 'GOOD',
            tagStatus: line.tagStatus || 'AVAILABLE',
          },
          create: {
            componentNo: line.scaffoldComponentNo,
            componentType: line.componentType || 'STANDARD',
            description: line.itemName,
            stockItemId: stockItem.id,
            currentSite: line.site || null,
            currentLocation: location.locationCode,
            conditionStatus: line.conditionStatus || 'GOOD',
            tagStatus: line.tagStatus || 'AVAILABLE',
          },
        });
      }

      if (line.qrTagCode) {
        await (this.prisma as any).assetQrTag.upsert({
          where: {
            tagCode: line.qrTagCode,
          },
          update: {
            qrPayload: line.qrTagCode,
            stockItemId: stockItem.id,
            scaffoldComponentId: scaffoldComponent?.id || null,
            assignedLocationId: location.id,
            status: line.tagStatus || 'AVAILABLE',
          },
          create: {
            tagCode: line.qrTagCode,
            qrPayload: line.qrTagCode,
            stockItemId: stockItem.id,
            scaffoldComponentId: scaffoldComponent?.id || null,
            assignedLocationId: location.id,
            status: line.tagStatus || 'AVAILABLE',
          },
        });
      }

      const movementNo = buildMovementNo(line.rowNumber);

      const movement = await (this.prisma as any).stockMovement.create({
        data: {
          movementNo,
          movementType: 'RECEIPT',
          status: 'POSTED',

          toLocation: {
            connect: {
              id: location.id,
            },
          },

          requestedBy: postedBy,
          department: line.department || location.department || 'Operations',
          site: line.site || location.site || 'Unknown Site',
          reason: `Opening/import stock balance from ${batch.sourceType}`,
          referenceType: 'ASSET_IMPORT',
          referenceId: batch.batchNo,
          submittedAt: now,
          approvedBy: postedBy,
          approvedAt: now,
          postedBy,
          postedAt: now,

          lines: {
            create: [
              {
                stockItem: {
                  connect: {
                    id: stockItem.id,
                  },
                },
                quantity: quantityOnHand,
                unitCost,
                totalCost,
                notes: `Opening balance imported from ${batch.sourceType}`,
              },
            ],
          },
        },
        include: {
          lines: true,
          toLocation: true,
        },
      });

      await (this.prisma as any).assetImportLine.update({
        where: {
          id: line.id,
        },
        data: {
          status: 'POSTED',
          itemCode,
          postedStockItemId: stockItem.id,
          postedLocationId: location.id,
          postedBalanceId: balance.id,
          postedMovementId: movement.id,
        },
      });

      postedRows += 1;
    }

    const updatedBatch = await (this.prisma as any).assetImportBatch.update({
      where: {
        id,
      },
      data: {
        status: 'POSTED',
        postedRows,
        postedBy,
        postedAt: now,
      },
      include: {
        lines: {
          orderBy: {
            rowNumber: 'asc',
          },
        },
      },
    });

    return {
      message:
        'Approved import posted into stock items, balances, movements, QR tags and scaffold records.',
      batch: updatedBatch,
    };
  }
}