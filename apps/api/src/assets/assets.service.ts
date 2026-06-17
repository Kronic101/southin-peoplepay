import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAssetImportPreviewDto,
  PostAssetImportBatchDto,
} from './dto/asset-import.dto';

type CsvRow = Record<string, string>;

function clean(value: unknown) {
  return String(value ?? '').trim();
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
  const lines = clean(csvText)
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

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

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(clean(value).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toDecimal(value: unknown, fallback = 0) {
  return new Prisma.Decimal(toNumber(value, fallback));
}

function makeBatchNo() {
  const year = new Date().getFullYear();
  const stamp = Date.now().toString().slice(-6);
  return `IMP-${year}-${stamp}`;
}

function makeMovementNo(prefix = 'MOV') {
  const year = new Date().getFullYear();
  const stamp = Date.now().toString().slice(-8);
  return `${prefix}-${year}-${stamp}`;
}

function makeImportMovementNo(rowNumber: number) {
  const year = new Date().getFullYear();
  const stamp = Date.now().toString().slice(-8);
  return `IMP-MOV-${year}-${stamp}-${rowNumber}`;
}

function statusText(value: unknown) {
  return clean(value).toUpperCase() || 'GOOD';
}

function itemTypeDefault(value: unknown) {
  return clean(value).toUpperCase() || 'OTHER';
}

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma as any;
  }

  private decimal(value: unknown, fallback = 0) {
    return toDecimal(value, fallback);
  }

  private async nextStockCode(body: any) {
    if (body?.itemCode && body?.codeMode !== 'AUTO') {
      return clean(body.itemCode).toUpperCase();
    }

    const itemType = clean(body?.itemType || 'STOCK').toUpperCase();
    const category = clean(body?.category || itemType || 'STK').toUpperCase();

    const prefix =
      body?.sequencePrefix ||
      (itemType === 'PPE'
        ? 'PPE'
        : itemType === 'SCAFFOLD_COMPONENT'
          ? 'SCF'
          : category.slice(0, 3) || 'STK');

    const count = await this.db().stockItem.count({
      where: {
        itemCode: {
          startsWith: `${prefix}-`,
          mode: 'insensitive',
        },
      },
    });

    const sequence = String(count + 1).padStart(5, '0');
    return `${prefix}-${sequence}`;
  }

  private async nextScaffoldNo() {
    const year = new Date().getFullYear();

    const count = await this.db().scaffoldComponent.count({
      where: {
        componentNo: {
          startsWith: `SCF-${year}-`,
          mode: 'insensitive',
        },
      },
    });

    return `SCF-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  private async nextAssetNo() {
    const year = new Date().getFullYear();

    const count = await this.db().hubAsset.count({
      where: {
        assetNo: {
          startsWith: `AST-${year}-`,
          mode: 'insensitive',
        },
      },
    });

    return `AST-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  async getDashboard() {
    const [assets, stockItems, locations, movements, assetQrTags, scaffolds, balances] =
      await Promise.all([
        this.db().hubAsset.findMany(),
        this.db().stockItem.findMany(),
        this.db().stockLocation.findMany(),
        this.db().stockMovement.findMany({
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            fromLocation: true,
            toLocation: true,
            lines: {
              include: {
                stockItem: true,
              },
            },
          },
        }),
        this.db().assetQrTag.findMany(),
        this.db().scaffoldComponent.findMany(),
        this.db().stockBalance.findMany({
          include: {
            stockItem: true,
            location: true,
          },
        }),
      ]);

    const lowStock = balances
      .filter((balance: any) => {
        const onHand = toNumber(balance.quantityOnHand);
        const minimumLevel = toNumber(balance.stockItem?.minimumLevel);
        return balance.stockItem && onHand <= minimumLevel;
      })
      .map((balance: any) => ({
        itemCode: balance.stockItem?.itemCode,
        itemName: balance.stockItem?.itemName,
        locationCode: balance.location?.locationCode,
        locationName: balance.location?.locationName,
        quantityOnHand: Number(balance.quantityOnHand || 0),
        minimumLevel: Number(balance.stockItem?.minimumLevel || 0),
      }));

    return {
      summary: {
        assets: assets.length,
        activeAssets: assets.filter((asset: any) => asset.status === 'ACTIVE').length,
        stockItems: stockItems.length,
        locations: locations.length,
        movements: movements.length,
        pendingMovements: movements.filter((movement: any) => movement.status !== 'POSTED').length,
        qrTags: assetQrTags.length,
        scaffoldComponents: scaffolds.length,
        availableScaffolds: scaffolds.filter((item: any) => item.tagStatus === 'AVAILABLE').length,
        issuedScaffolds: scaffolds.filter((item: any) => item.tagStatus === 'ISSUED').length,
        damagedScaffolds: scaffolds.filter((item: any) => item.conditionStatus === 'DAMAGED').length,
      },
      lowStock,
      recentMovements: movements,
    };
  }

  async getStockItems() {
    return this.db().stockItem.findMany({
      orderBy: [
        {
          itemCode: 'asc',
        },
      ],
      include: {
        balances: {
          include: {
            location: true,
          },
        },
        qrTags: true,
        scaffoldComponents: true,
        supplier: true,
      },
    });
  }

  async previewStockItemCode(body: any) {
    const itemCode = await this.nextStockCode(body);

    return {
      codeMode: body?.codeMode || 'AUTO',
      itemCode,
      sequencePrefix: itemCode.split('-')[0] || 'STK',
      sequenceNumber: Number(itemCode.split('-')[1] || 1),
      source: 'SOUTHIN_OPERATIONS_HUB',
    };
  }

  async createStockItem(body: any) {
    const itemCode = await this.nextStockCode(body);

    const existing = await this.db().stockItem.findUnique({
      where: { itemCode },
    });

    if (existing && !body?.allowExistingCode && !body?.allowUpdateIfCodeExists) {
      throw new BadRequestException(`Stock item code ${itemCode} already exists.`);
    }

    if (existing && (body?.allowExistingCode || body?.allowUpdateIfCodeExists)) {
      return this.db().stockItem.update({
        where: { itemCode },
        data: {
          itemName: clean(body.itemName || existing.itemName),
          itemType: itemTypeDefault(body.itemType || existing.itemType),
          category: clean(body.category || existing.category || 'General'),
          description: body.description ?? existing.description,
          unitOfMeasure: clean(body.unitOfMeasure || existing.unitOfMeasure || 'EA'),
          minimumLevel: this.decimal(body.minimumLevel ?? existing.minimumLevel ?? 0),
          reorderLevel: this.decimal(body.reorderLevel ?? existing.reorderLevel ?? 0),
          standardCost:
            body.standardCost === undefined
              ? existing.standardCost
              : this.decimal(body.standardCost, 0),
          isSerialized: Boolean(body.isSerialized ?? existing.isSerialized),
          isQrTracked: Boolean(body.isQrTracked ?? existing.isQrTracked),
          isRfidTracked: Boolean(body.isRfidTracked ?? existing.isRfidTracked ?? false),
          isActive: body.isActive === undefined ? existing.isActive : Boolean(body.isActive),
        },
      });
    }

    return this.db().stockItem.create({
      data: {
        itemCode,
        itemName: clean(body.itemName),
        itemType: itemTypeDefault(body.itemType),
        category: clean(body.category || 'General'),
        description: body.description || null,
        unitOfMeasure: clean(body.unitOfMeasure || 'EA'),
        minimumLevel: this.decimal(body.minimumLevel, 0),
        reorderLevel: this.decimal(body.reorderLevel, 0),
        standardCost:
          body.standardCost === undefined || body.standardCost === ''
            ? null
            : this.decimal(body.standardCost, 0),
        isSerialized: Boolean(body.isSerialized),
        isQrTracked: Boolean(body.isQrTracked),
        isRfidTracked: Boolean(body.isRfidTracked ?? body.rfidReady ?? false),
        isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      },
    });
  }

  async getLocations() {
    return this.db().stockLocation.findMany({
      orderBy: [{ locationCode: 'asc' }],
      include: {
        balances: {
          include: {
            stockItem: true,
          },
        },
      },
    });
  }

  async createLocation(body: any) {
    const locationCode = clean(body.locationCode).toUpperCase();

    if (!locationCode) {
      throw new BadRequestException('Location code is required.');
    }

    const existing = await this.db().stockLocation.findUnique({
      where: { locationCode },
    });

    if (existing) {
      return this.db().stockLocation.update({
        where: { locationCode },
        data: {
          locationName: clean(body.locationName || existing.locationName),
          locationType: body.locationType || existing.locationType || 'SITE_STORE',
          site: body.site || existing.site || null,
          branch: body.branch || existing.branch || null,
          department: body.department || existing.department || null,
          isActive: body.isActive === undefined ? existing.isActive : Boolean(body.isActive),
        },
      });
    }

    return this.db().stockLocation.create({
      data: {
        locationCode,
        locationName: clean(body.locationName || locationCode),
        locationType: body.locationType || 'SITE_STORE',
        site: body.site || null,
        branch: body.branch || null,
        department: body.department || null,
        isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      },
    });
  }

  async getBalances() {
    return this.db().stockBalance.findMany({
      orderBy: [{ updatedAt: 'desc' }],
      include: {
        stockItem: true,
        location: true,
      },
    });
  }

  private async getOrCreateBalance(stockItemId: string, locationId: string) {
    const existing = await this.db().stockBalance.findFirst({
      where: {
        stockItemId,
        locationId,
      },
    });

    if (existing) return existing;

    return this.db().stockBalance.create({
      data: {
        stockItemId,
        locationId,
        quantityOnHand: this.decimal(0),
        quantityIssued: this.decimal(0),
        quantityDamaged: this.decimal(0),
        quantityLost: this.decimal(0),
      },
    });
  }

  async getMovements() {
    return this.db().stockMovement.findMany({
      orderBy: [
        {
          createdAt: 'desc',
        },
      ],
      include: {
        fromLocation: true,
        toLocation: true,
        lines: {
          include: {
            stockItem: true,
            qrTag: true,
            ledgerEntries: true,
          },
        },
        ledgerEntries: true,

        // These are the actual relations currently available in your Prisma schema.
        financeExpense: true,
        procurementRequest: true,
        workshopJob: true,
        workshopPartsIssued: true,
      },
    });
  }

  async createMovement(body: any) {
    const lines = Array.isArray(body.lines)
      ? body.lines
      : body.stockItemId
        ? [
            {
              stockItemId: body.stockItemId,
              quantity: body.quantity || 1,
              unitCost: body.unitCost || body.standardCost || 0,
              assetQrTagId: body.assetQrTagId || null,
              notes: body.notes || null,
            },
          ]
        : [];

    if (lines.length === 0) {
      throw new BadRequestException('At least one movement line is required.');
    }

    return this.db().stockMovement.create({
      data: {
        movementNo: body.movementNo || makeMovementNo(),
        movementType: clean(body.movementType || 'ISSUE').toUpperCase(),
        status: body.status || 'SUBMITTED',
        fromLocationId: body.fromLocationId || null,
        toLocationId: body.toLocationId || null,
        requestedBy: body.requestedBy || 'Asset Manager',
        requestedByEmail: body.requestedByEmail || null,
        department: body.department || null,
        site: body.site || body.branch || null,
        projectCode: body.projectCode || null,
        reason: body.reason || null,
        referenceType: body.referenceType || null,
        referenceId: body.referenceId || null,
        submittedAt: new Date(),
        approvalRequestId: body.approvalRequestId || null,
        lines: {
          create: lines.map((line: any) => {
            const quantity = this.decimal(line.quantity || 1);
            const unitCost = this.decimal(line.unitCost || 0);
            return {
              stockItemId: line.stockItemId,
              quantity,
              unitCost,
              totalCost: quantity.mul(unitCost),
              assetQrTagId: line.assetQrTagId || null,
              notes: line.notes || null,
            };
          }),
        },
      },
      include: {
        fromLocation: true,
        toLocation: true,
        lines: {
          include: {
            stockItem: true,
            qrTags: true,
          },
        },
      },
    });
  }

  async approveMovement(id: string, body: any) {
    const movement = await this.db().stockMovement.findUnique({
      where: { id },
    });

    if (!movement) {
      throw new NotFoundException('Stock movement not found.');
    }

    return this.db().stockMovement.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: body.approvedBy || body.approver || 'Asset Manager',
        approvedAt: new Date(),
      },
      include: {
        fromLocation: true,
        toLocation: true,
        lines: {
          include: {
            stockItem: true,
            qrTags: true,
          },
        },
      },
    });
  }

  private isOutboundMovement(type: string) {
    return ['ISSUE', 'LOSS', 'DAMAGE', 'WRITE_OFF'].includes(type);
  }

  private isInboundMovement(type: string) {
    return ['RECEIPT', 'RETURN'].includes(type);
  }

  private isTransferMovement(type: string) {
    return type === 'TRANSFER';
  }

  private async updateBalanceForPostedLine(movement: any, line: any) {
    const movementType = clean(movement.movementType).toUpperCase();
    const quantity = this.decimal(line.quantity || 0);

    if (this.isInboundMovement(movementType)) {
      if (!movement.toLocationId) {
        throw new BadRequestException('To location is required for receipt or return movement.');
      }

      const balance = await this.getOrCreateBalance(line.stockItemId, movement.toLocationId);

      await this.db().stockBalance.update({
        where: { id: balance.id },
        data: {
          quantityOnHand: new Prisma.Decimal(balance.quantityOnHand || 0).plus(quantity),
        },
      });
    }

    if (this.isOutboundMovement(movementType)) {
      if (!movement.fromLocationId) {
        throw new BadRequestException('From location is required for issue, loss, damage or write-off.');
      }

      const balance = await this.getOrCreateBalance(line.stockItemId, movement.fromLocationId);
      const current = new Prisma.Decimal(balance.quantityOnHand || 0);

      if (current.lessThan(quantity)) {
        throw new BadRequestException('Insufficient stock balance for this movement.');
      }

      const updateData: any = {
        quantityOnHand: current.minus(quantity),
      };

      if (movementType === 'ISSUE') {
        updateData.quantityIssued = new Prisma.Decimal(balance.quantityIssued || 0).plus(quantity);
      }

      if (movementType === 'DAMAGE') {
        updateData.quantityDamaged = new Prisma.Decimal(balance.quantityDamaged || 0).plus(quantity);
      }

      if (movementType === 'LOSS' || movementType === 'WRITE_OFF') {
        updateData.quantityLost = new Prisma.Decimal(balance.quantityLost || 0).plus(quantity);
      }

      await this.db().stockBalance.update({
        where: { id: balance.id },
        data: updateData,
      });
    }

    if (this.isTransferMovement(movementType)) {
      if (!movement.fromLocationId || !movement.toLocationId) {
        throw new BadRequestException('From and to locations are required for transfer movement.');
      }

      const fromBalance = await this.getOrCreateBalance(line.stockItemId, movement.fromLocationId);
      const toBalance = await this.getOrCreateBalance(line.stockItemId, movement.toLocationId);

      const fromCurrent = new Prisma.Decimal(fromBalance.quantityOnHand || 0);

      if (fromCurrent.lessThan(quantity)) {
        throw new BadRequestException('Insufficient stock balance for transfer.');
      }

      await this.db().stockBalance.update({
        where: { id: fromBalance.id },
        data: {
          quantityOnHand: fromCurrent.minus(quantity),
        },
      });

      await this.db().stockBalance.update({
        where: { id: toBalance.id },
        data: {
          quantityOnHand: new Prisma.Decimal(toBalance.quantityOnHand || 0).plus(quantity),
        },
      });
    }
  }

  private async createLedgerEntry(movement: any, line: any) {
    const db = this.db();

    if (!db.stockLedger?.create) {
      return null;
    }

    const movementType = clean(movement.movementType).toUpperCase();
    const quantity = this.decimal(line.quantity || 0);
    const unitCost = this.decimal(line.unitCost || 0);
    const totalCost = this.decimal(line.totalCost || quantity.mul(unitCost));

    const locationId =
      this.isOutboundMovement(movementType) || this.isTransferMovement(movementType)
        ? movement.fromLocationId
        : movement.toLocationId;

    return db.stockLedger.create({
      data: {
        stockItemId: line.stockItemId,
        locationId,
        movementId: movement.id,
        movementLineId: line.id,
        ledgerType: movementType,
        quantityIn: this.isInboundMovement(movementType) ? quantity : this.decimal(0),
        quantityOut: this.isOutboundMovement(movementType) || this.isTransferMovement(movementType)
          ? quantity
          : this.decimal(0),
        unitCost,
        totalCost,
        referenceType: movement.referenceType || 'STOCK_MOVEMENT',
        referenceId: movement.referenceId || movement.movementNo,
        postedBy: movement.postedBy || movement.approvedBy || movement.requestedBy,
        postedAt: movement.postedAt || new Date(),
      },
    });
  }

  private async createFinancePostingForMovement(movement: any) {
    const db = this.db();

    const lines = movement.lines || [];
    const totalValue = lines.reduce((sum: Prisma.Decimal, line: any) => {
      return sum.plus(new Prisma.Decimal(line.totalCost || 0));
    }, new Prisma.Decimal(0));

    if (totalValue.lessThanOrEqualTo(0)) {
      return null;
    }

    const movementType = clean(movement.movementType).toUpperCase();

    if (!['RECEIPT', 'ISSUE', 'LOSS', 'DAMAGE', 'WRITE_OFF'].includes(movementType)) {
      return null;
    }

    if (db.financeAssetPosting?.create) {
      return db.financeAssetPosting.create({
        data: {
          sourceModule: 'ASSET_MANAGEMENT',
          sourceType: 'STOCK_MOVEMENT',
          sourceId: movement.id,
          referenceNo: movement.movementNo,
          postingType: movementType,
          department: movement.department || null,
          site: movement.site || null,
          description: movement.reason || `Posted stock movement ${movement.movementNo}`,
          amount: totalValue,
          status: 'READY_FOR_FINANCE',
          createdBy: movement.postedBy || movement.approvedBy || movement.requestedBy,
        },
      });
    }

    if (db.financeExpense?.create) {
      return db.financeExpense.create({
        data: {
          expenseNo: `AST-${movement.movementNo}`,
          category: 'Asset / Stores',
          description: movement.reason || `Posted stock movement ${movement.movementNo}`,
          department: movement.department || 'Operations',
          site: movement.site || null,
          amount: totalValue,
          status: 'APPROVED',
          evidenceStatus: 'PENDING',
          sourceModule: 'ASSET_MANAGEMENT',
          sourceReference: movement.movementNo,
          createdBy: movement.postedBy || movement.apvedBy || movement.requestedBy,
        },
      });
    }

    return null;
  }

  async postMovement(id: string, body: any) {
    const movement = await this.db().stockMovement.findUnique({
      where: { id },
      include: {
        fromLocation: true,
        toLocation: true,
        lines: true,
      },
    });

    if (!movement) {
      throw new NotFoundException('Stock movement not found.');
    }

    if (movement.status === 'POSTED') {
      return movement;
    }

    if (!['APPROVED', 'SUBMITTED'].includes(movement.status)) {
      throw new BadRequestException('Only submitted or approved stock movements can be posted.');
    }

    for (const line of movement.lines || []) {
      await this.updateBalanceForPostedLine(movement, line);
    }

    const postedMovement = await this.db().stockMovement.update({
      where: { id },
      data: {
        status: 'POSTED',
        approvedBy: movement.approvedBy || body.approvedBy || body.postedBy || 'Asset Manager',
        approvedAt: movement.approvedAt || new Date(),
        postedBy: body.postedBy || body.approvedBy || 'Asset Manager',
        postedAt: new Date(),
      },
      include: {
        fromLocation: true,
        toLocation: true,
        lines: {
          include: {
            stockItem: true,
            qrTags: true,
          },
        },
      },
    });

    for (const line of postedMovement.lines || []) {
      await this.createLedgerEntry(postedMovement, line);
    }

    await this.createFinancePostingForMovement(postedMovement);

    return postedMovement;
  }

  async getQrTags() {
    return this.db().assetQrTag.findMany({
      orderBy: [{ createdAt: 'desc' }],
      include: {
        stockItem: true,
        asset: true,
        scaffoldComponent: true,
        assignedLocation: true,
      },
    });
  }

  async createQrTag(body: any) {
    const tagCode = clean(body.tagCode || body.qrPayload).toUpperCase();

    if (!tagCode) {
      throw new BadRequestException('Tag code is required.');
    }

    const existing = await this.db().assetQrTag.findUnique({
      where: { tagCode },
    });

    if (existing) {
      return existing;
    }

    return this.db().assetQrTag.create({
      data: {
        tagCode,
        qrPayload: body.qrPayload || tagCode,
        barcodeValue: body.barcodeValue || null,
        stockItemId: body.stockItemId || null,
        assetId: body.assetId || null,
        scaffoldComponentId: body.scaffoldComponentId || null,
        assignedLocationId: body.assignedLocationId || null,
        status: body.status || 'AVAILABLE',
      },
    });
  }

  async scanQrTag(tagCode: string, body: any) {
    const code = clean(tagCode).toUpperCase();

    const tag = await this.db().assetQrTag.findFirst({
      where: {
        OR: [
          { tagCode: code },
          { qrPayload: code },
          { barcodeValue: code },
        ],
      },
    });

    if (!tag) {
      throw new NotFoundException(`QR/RFID/barcode tag ${code} was not found.`);
    }

    return this.db().assetQrTag.update({
      where: { id: tag.id },
      data: {
        lastScannedAt: new Date(),
        lastScannedBy: body.scannedBy || body.user || 'scanner-dev-user',
        lastScanSite: body.site || body.scanSite || null,
      },
      include: {
        stockItem: true,
        asset: true,
        scaffoldComponent: true,
        assignedLocation: true,
      },
    });
  }

  async getAssets() {
    return this.db().hubAsset.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        stockItem: true,
        qrTags: true,
      },
    });
  }

  async createAsset(body: any) {
    return this.db().hubAsset.create({
      data: {
        assetNo: body.assetNo || (await this.nextAssetNo()),
        assetName: clean(body.assetName || body.name),
        assetType: body.assetType || 'GENERAL',
        category: body.category || null,
        serialNo: body.serialNo || null,
        stockItemId: body.stockItemId || null,
        currentSite: body.currentSite || body.site || null,
        currentLocation: body.currentLocation || body.location || null,
        conditionStatus: body.conditionStatus || 'GOOD',
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
        purchaseValue:
          body.purchaseValue === undefined ? undefined : this.decimal(body.purchaseValue),
        currentValue:
          body.currentValue === undefined ? undefined : this.decimal(body.currentValue),
        supplierName: body.supplierName || null,
        procurementRequestId: body.procurementRequestId || null,
        status: body.status || 'ACTIVE',
      },
    });
  }

  async getScaffoldComponents() {
    return this.db().scaffoldComponent.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        stockItem: true,
        qrTags: true,
        inspections: true,
      },
    });
  }

  async createScaffoldComponent(body: any) {
    return this.db().scaffoldComponent.create({
      data: {
        componentNo: body.componentNo || (await this.nextScaffoldNo()),
        componentType: body.componentType || 'OTHER',
        description: body.description || null,
        stockItemId: body.stockItemId || null,
        currentSite: body.currentSite || null,
        currentLocation: body.currentLocation || null,
        conditionStatus: body.conditionStatus || 'GOOD',
        tagStatus: body.tagStatus || 'AVAILABLE',
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
        purchaseValue:
          body.purchaseValue === undefined ? undefined : this.decimal(body.purchaseValue),
      },
    });
  }

  async getImportBatches() {
    return this.db().assetImportBatch.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        lines: {
          orderBy: { rowNumber: 'asc' },
        },
      },
    });
  }

  async createImportPreview(body: CreateAssetImportPreviewDto) {
    const csvText = clean((body as any).csvText);

    if (!csvText) {
      throw new BadRequestException('CSV text is required.');
    }

    const rows = parseCsv(csvText);

    if (rows.length === 0) {
      throw new BadRequestException('CSV does not contain any valid rows.');
    }

    const batch = await this.db().assetImportBatch.create({
      data: {
        batchNo: makeBatchNo(),
        sourceType: (body as any).sourceType || 'OMNI_CORE',
        fileName: (body as any).fileName || 'omni-core-import.csv',
        status: 'VALIDATED',
        totalRows: rows.length,
        validRows: rows.length,
        warningRows: 0,
        errorRows: 0,
        postedRows: 0,
        createdBy: (body as any).createdBy || 'Asset Manager',
        rawPayload: {
          fileName: (body as any).fileName || 'omni-core-import.csv',
          sourceType: (body as any).sourceType || 'OMNI_CORE',
        },
        lines: {
          create: rows.map((row, index) => {
            const itemCode = getValue(row, ['itemCode', 'code', 'stockCode']);
            const itemName = getValue(row, ['itemName', 'description', 'name']);
            const locationCode = getValue(row, ['locationCode', 'storeCode']);
            const locationName = getValue(row, ['locationName', 'storeName']);
            const quantityOnHand = toNumber(getValue(row, ['quantityOnHand', 'qtyOnHand', 'quantity']), 0);

            const hasError = !itemCode || !itemName || !locationCode;

            return {
              rowNumber: index + 2,
              status: hasError ? 'ERROR' : 'VALID',
              errorMessage: hasError ? 'Missing itemCode, itemName or locationCode.' : null,
              warningMessage: quantityOnHand <= 0 ? 'Quantity on hand is zero or less.' : null,
              itemCode,
              itemName,
              itemType: itemTypeDefault(getValue(row, ['itemType', 'type'])),
              category: getValue(row, ['category']) || 'General',
              unitOfMeasure: getValue(row, ['unitOfMeasure', 'uom']) || 'EA',
              locationCode,
              locationName: locationName || locationCode,
              quantityOnHand: this.decimal(quantityOnHand),
              minimumLevel: this.decimal(getValue(row, ['minimumLevel', 'minimum']), 0),
              reorderLevel: this.decimal(getValue(row, ['reorderLevel', 'reorder']), 0),
              standardCost: this.decimal(getValue(row, ['standardCost', 'cost']), 0),
              assetQrTagCode: getValue(row, ['assetQrTagCode', 'tagCode', 'qrCode']) || null,
              scaffoldComponentNo: getValue(row, ['scaffoldComponentNo', 'componentNo']) || null,
              componentType: getValue(row, ['componentType']) || null,
              conditionStatus: statusText(getValue(row, ['conditionStatus', 'condition'])),
              site: getValue(row, ['site']) || null,
              branch: getValue(row, ['branch']) || null,
              department: getValue(row, ['department']) || null,
              rawRow: row,
            };
          }),
        },
      },
      include: {
        lines: {
          orderBy: { rowNumber: 'asc' },
        },
      },
    });

    const lines = batch.lines || [];
    const errorRows = lines.filter((line: any) => line.status === 'ERROR').length;
    const warningRows = lines.filter((line: any) => line.warningMessage).length;
    const validRows = lines.length - errorRows;

    const updated = await this.db().assetImportBatch.update({
      where: { id: batch.id },
      data: {
        status: errorRows > 0 ? 'VALIDATED_WITH_ERRORS' : 'VALIDATED',
        validRows,
        warningRows,
        errorRows,
      },
      include: {
        lines: {
          orderBy: { rowNumber: 'asc' },
        },
      },
    });

    return {
      message: 'Asset import preview created successfully.',
      batch: updated,
    };
  }

  async postImportBatch(id: string, body: PostAssetImportBatchDto) {
    const batch = await this.db().assetImportBatch.findUnique({
      where: { id },
      include: {
        lines: {
          orderBy: { rowNumber: 'asc' },
        },
      },
    });

    if (!batch) {
      throw new NotFoundException('Import batch not found.');
    }

    if (batch.status === 'POSTED') {
      return {
        message: 'Import batch already posted.',
        batch,
      };
    }

    const validLines = (batch.lines || []).filter((line: any) => line.status === 'VALID');

    if (validLines.length === 0) {
      throw new BadRequestException('No valid import rows available to post.');
    }

    let postedRows = 0;

    for (const line of validLines) {
      const stockItem = await this.createStockItem({
        itemCode: line.itemCode,
        itemName: line.itemName,
        itemType: line.itemType,
        category: line.category,
        unitOfMeasure: line.unitOfMeasure,
        minimumLevel: line.minimumLevel,
        reorderLevel: line.reorderLevel,
        standardCost: line.standardCost,
        isSerialized: Boolean(line.scaffoldComponentNo),
        isQrTracked: Boolean(line.assetQrTagCode || line.scaffoldComponentNo),
        isRfidTracked: false,
        allowExistingCode: true,
        allowUpdateIfCodeExists: true,
      });

      const location = await this.createLocation({
        locationCode: line.locationCode,
        locationName: line.locationName || line.locationCode,
        locationType: 'SITE_STORE',
        site: line.site,
        branch: line.branch,
        department: line.department,
      });

      if (line.scaffoldComponentNo) {
        const existingComponent = await this.db().scaffoldComponent.findFirst({
          where: {
            componentNo: line.scaffoldComponentNo,
          },
        });

        if (!existingComponent) {
          await this.db().scaffoldComponent.create({
            data: {
              componentNo: line.scaffoldComponentNo,
              componentType: line.componentType || 'OTHER',
              description: line.itemName,
              stockItemId: stockItem.id,
              currentSite: line.site || null,
              currentLocation: line.locationCode,
              conditionStatus: line.conditionStatus || 'GOOD',
              tagStatus: 'AVAILABLE',
            },
          });
        }
      }

      if (line.assetQrTagCode) {
        await this.createQrTag({
          tagCode: line.assetQrTagCode,
          qrPayload: line.assetQrTagCode,
          stockItemId: stockItem.id,
          assignedLocationId: location.id,
          status: 'AVAILABLE',
        });
      }

      const movement = await this.db().stockMovement.create({
        data: {
          movementNo: makeImportMovementNo(line.rowNumber),
          movementType: 'RECEIPT',
          status: 'APPROVED',
          toLocationId: location.id,
          requestedBy: (body as any).postedBy || batch.createdBy || 'Asset Manager',
          department: line.department || null,
          site: line.site || null,
          reason: `Opening/import stock balance from ${batch.sourceType}`,
          referenceType: 'ASSET_IMPORT',
          referenceId: batch.batchNo,
          submittedAt: new Date(),
          approvedBy: (body as any).postedBy || batch.createdBy || 'Asset Manager',
          approvedAt: new Date(),
          lines: {
            create: [
              {
                stockItemId: stockItem.id,
                quantity: line.quantityOnHand,
                unitCost: line.standardCost || this.decimal(0),
                totalCost: new Prisma.Decimal(line.quantityOnHand || 0).mul(
                  new Prisma.Decimal(line.standardCost || 0),
                ),
                notes: `Opening balance imported from ${batch.sourceType}`,
              },
            ],
          },
        },
      });

      await this.postMovement(movement.id, {
        postedBy: (body as any).postedBy || batch.createdBy || 'Asset Manager',
      });

      await this.db().assetImportLine.update({
        where: { id: line.id },
        data: {
          status: 'POSTED',
          postedAt: new Date(),
        },
      });

      postedRows += 1;
    }

    const updatedBatch = await this.db().assetImportBatch.update({
      where: { id },
      data: {
        status: 'POSTED',
        postedRows,
        postedBy: (body as any).postedBy || batch.createdBy || 'Asset Manager',
        postedAt: new Date(),
      },
      include: {
        lines: {
          orderBy: { rowNumber: 'asc' },
        },
      },
    });

    return {
      message:
        'Approved import posted into stock items, balances, movements, QR tags and scaffold records.',
      batch: updatedBatch,
    };
  }

  async seedDemoAssetData() {
    const mainStore = await this.createLocation({
      locationCode: 'KMD-STORES',
      locationName: 'Kitwe Main Distribution Centre Stores',
      locationType: 'SITE_STORE',
      site: 'Kitwe Main Distribution Centre',
      branch: 'Kitwe',
      department: 'Operations',
    });

    const siteYard = await this.createLocation({
      locationCode: 'KMD-YARD',
      locationName: 'Kitwe Main Distribution Centre Yard',
      locationType: 'YARD',
      site: 'Kitwe Main Distribution Centre',
      branch: 'Kitwe',
      department: 'Operations',
    });

    const scaffoldStandard = await this.createStockItem({
      itemCode: 'SCF-STANDARD',
      itemName: 'Scaffold Standard',
      itemType: 'SCAFFOLD_COMPONENT',
      category: 'Scaffold',
      unitOfMeasure: 'EA',
      minimumLevel: 20,
      reorderLevel: 50,
      standardCost: 0,
      isSerialized: true,
      isQrTracked: true,
      allowExistingCode: true,
      allowUpdateIfCodeExists: true,
    });

    const ppeGloves = await this.createStockItem({
      itemCode: 'PPE-GLOVES',
      itemName: 'Safety Gloves',
      itemType: 'PPE',
      category: 'PPE',
      unitOfMeasure: 'PAIR',
      minimumLevel: 50,
      reorderLevel: 100,
      isSerialized: false,
      isQrTracked: false,
      allowExistingCode: true,
      allowUpdateIfCodeExists: true,
    });

    const component = await this.createScaffoldComponent({
      componentNo: 'SCF-2026-00001',
      componentType: 'STANDARD',
      description: 'Demo scaffold standard with QR tag',
      stockItemId: scaffoldStandard.id,
      currentSite: 'Kitwe Main Distribution Centre',
      currentLocation: 'KMD-STORES',
      conditionStatus: 'GOOD',
      tagStatus: 'AVAILABLE',
    });

    await this.createQrTag({
      tagCode: 'QR-SCF-0001',
      qrPayload: 'QR-SCF-0001',
      stockItemId: scaffoldStandard.id,
      scaffoldComponentId: component.id,
      assignedLocationId: mainStore.id,
      status: 'AVAILABLE',
    });

    const existingReceipt = await this.db().stockMovement.findFirst({
      where: {
        movementNo: 'MOV-2026-00001',
      },
    });

    if (!existingReceipt) {
      const receipt = await this.createMovement({
        movementNo: 'MOV-2026-00001',
        movementType: 'RECEIPT',
        status: 'APPROVED',
        toLocationId: mainStore.id,
        requestedBy: 'Asset Manager',
        department: 'Operations',
        site: 'Kitwe Main Distribution Centre',
        reason: 'Opening stock receipt',
        lines: [
          {
            stockItemId: scaffoldStandard.id,
            quantity: 10,
            unitCost: 500,
          },
          {
            stockItemId: ppeGloves.id,
            quantity: 100,
            unitCost: 25,
          },
        ],
      });

      await this.postMovement(receipt.id, {
        postedBy: 'Asset Manager',
      });
    }

    return {
      message: 'Demo asset, stores, scaffold and QR data seeded successfully.',
      locations: [mainStore, siteYard],
      stockItems: [scaffoldStandard, ppeGloves],
    };
  }
}