import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AssetCategory,
  AssetStatus,
  Prisma,
  ScaffoldComponentType,
  ScaffoldTagStatus,
  StockItemType,
  StockMovementStatus,
  StockMovementType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  private async nextAssetNo() {
    const count = await this.prisma.hubAsset.count();
    return `AST-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }

  private async nextMovementNo() {
    const count = await this.prisma.stockMovement.count();
    return `MOV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }

  private async nextScaffoldNo() {
    const count = await this.prisma.scaffoldComponent.count();
    return `SCF-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }

  private decimal(value: unknown) {
    return new Prisma.Decimal(Number(value || 0));
  }

      private decreasesSourceStock(movementType: StockMovementType) {
    const movementTypes = new Set<StockMovementType>([
      StockMovementType.ISSUE,
      StockMovementType.TRANSFER,
      StockMovementType.DAMAGE,
      StockMovementType.LOSS,
      StockMovementType.WRITE_OFF,
    ]);

    return movementTypes.has(movementType);
  }

  private increasesDestinationStock(movementType: StockMovementType) {
    const movementTypes = new Set<StockMovementType>([
      StockMovementType.RECEIPT,
      StockMovementType.RETURN,
      StockMovementType.TRANSFER,
    ]);

    return movementTypes.has(movementType);
  }

  async getDashboard() {
    const [
      assets,
      stockItems,
      locations,
      movements,
      qrTags,
      scaffoldComponents,
      balances,
    ] = await Promise.all([
      this.prisma.hubAsset.findMany(),
      this.prisma.stockItem.findMany(),
      this.prisma.stockLocation.findMany(),
      this.prisma.stockMovement.findMany(),
      this.prisma.assetQrTag.findMany(),
      this.prisma.scaffoldComponent.findMany(),
      this.prisma.stockBalance.findMany({
        include: {
          stockItem: true,
          location: true,
        },
      }),
    ]);

    return {
      summary: {
        assets: assets.length,
        activeAssets: assets.filter((item) => item.status === AssetStatus.ACTIVE).length,
        stockItems: stockItems.length,
        locations: locations.length,
        movements: movements.length,
        pendingMovements: movements.filter((item) => item.status !== StockMovementStatus.POSTED)
          .length,
        qrTags: qrTags.length,
        scaffoldComponents: scaffoldComponents.length,
        availableScaffolds: scaffoldComponents.filter(
          (item) => item.tagStatus === ScaffoldTagStatus.AVAILABLE,
        ).length,
        issuedScaffolds: scaffoldComponents.filter(
          (item) => item.tagStatus === ScaffoldTagStatus.ISSUED,
        ).length,
        damagedScaffolds: scaffoldComponents.filter(
          (item) => item.tagStatus === ScaffoldTagStatus.DAMAGED,
        ).length,
      },
      lowStock: balances
        .filter((balance) => {
          const minimum = Number(balance.stockItem.minimumLevel || 0);
          return minimum > 0 && Number(balance.quantityOnHand) <= minimum;
        })
        .map((balance) => ({
          itemCode: balance.stockItem.itemCode,
          itemName: balance.stockItem.itemName,
          locationCode: balance.location.locationCode,
          locationName: balance.location.locationName,
          quantityOnHand: Number(balance.quantityOnHand),
          minimumLevel: Number(balance.stockItem.minimumLevel || 0),
        })),
    };
  }

  async getStockItems() {
    return this.prisma.stockItem.findMany({
      orderBy: { itemName: 'asc' },
      include: {
        balances: {
          include: {
            location: true,
          },
        },
        qrTags: true,
        scaffoldComponents: true,
      },
    });
  }

  async createStockItem(body: any) {
    if (!body?.itemCode) {
      throw new BadRequestException('Item code is required.');
    }

    if (!body?.itemName) {
      throw new BadRequestException('Item name is required.');
    }

    return this.prisma.stockItem.upsert({
      where: { itemCode: String(body.itemCode) },
      update: {
        itemName: String(body.itemName),
        itemType: body.itemType || StockItemType.OTHER,
        category: body.category || null,
        description: body.description || null,
        unitOfMeasure: body.unitOfMeasure || 'EA',
        minimumLevel: body.minimumLevel === undefined ? undefined : this.decimal(body.minimumLevel),
        reorderLevel: body.reorderLevel === undefined ? undefined : this.decimal(body.reorderLevel),
        standardCost:
          body.standardCost === undefined ? undefined : this.decimal(body.standardCost),
        isSerialized: Boolean(body.isSerialized || false),
        isQrTracked: Boolean(body.isQrTracked || false),
        isActive: true,
      },
      create: {
        itemCode: String(body.itemCode),
        itemName: String(body.itemName),
        itemType: body.itemType || StockItemType.OTHER,
        category: body.category || null,
        description: body.description || null,
        unitOfMeasure: body.unitOfMeasure || 'EA',
        minimumLevel: body.minimumLevel === undefined ? undefined : this.decimal(body.minimumLevel),
        reorderLevel: body.reorderLevel === undefined ? undefined : this.decimal(body.reorderLevel),
        standardCost:
          body.standardCost === undefined ? undefined : this.decimal(body.standardCost),
        isSerialized: Boolean(body.isSerialized || false),
        isQrTracked: Boolean(body.isQrTracked || false),
      },
    });
  }

  async getLocations() {
    return this.prisma.stockLocation.findMany({
      orderBy: [{ site: 'asc' }, { locationName: 'asc' }],
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
    if (!body?.locationCode) {
      throw new BadRequestException('Location code is required.');
    }

    if (!body?.locationName) {
      throw new BadRequestException('Location name is required.');
    }

    return this.prisma.stockLocation.upsert({
      where: { locationCode: String(body.locationCode) },
      update: {
        locationName: String(body.locationName),
        locationType: body.locationType || 'SITE_STORE',
        site: body.site || null,
        branch: body.branch || null,
        department: body.department || null,
        isActive: true,
      },
      create: {
        locationCode: String(body.locationCode),
        locationName: String(body.locationName),
        locationType: body.locationType || 'SITE_STORE',
        site: body.site || null,
        branch: body.branch || null,
        department: body.department || null,
      },
    });
  }

  async getBalances() {
    return this.prisma.stockBalance.findMany({
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        stockItem: true,
        location: true,
      },
    });
  }

  private async upsertBalance(
    tx: Prisma.TransactionClient,
    stockItemId: string,
    locationId: string,
    quantityDelta: Prisma.Decimal,
  ) {
    const existing = await tx.stockBalance.findUnique({
      where: {
        stockItemId_locationId: {
          stockItemId,
          locationId,
        },
      },
    });

    if (!existing) {
      return tx.stockBalance.create({
        data: {
          stockItemId,
          locationId,
          quantityOnHand: quantityDelta,
        },
      });
    }

    const newQuantity = new Prisma.Decimal(existing.quantityOnHand).plus(quantityDelta);

    if (newQuantity.lessThan(0)) {
      throw new BadRequestException('Stock movement would result in negative stock balance.');
    }

    return tx.stockBalance.update({
      where: {
        stockItemId_locationId: {
          stockItemId,
          locationId,
        },
      },
      data: {
        quantityOnHand: newQuantity,
      },
    });
  }

  async getMovements() {
    return this.prisma.stockMovement.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        fromLocation: true,
        toLocation: true,
        lines: {
          include: {
            stockItem: true,
            qrTag: true,
          },
        },
      },
    });
  }

  async createMovement(body: any) {
    if (!body?.movementType) {
      throw new BadRequestException('Movement type is required.');
    }

    if (!body?.lines || !Array.isArray(body.lines) || body.lines.length === 0) {
      throw new BadRequestException('At least one movement line is required.');
    }

    return this.prisma.stockMovement.create({
      data: {
        movementNo: body.movementNo || (await this.nextMovementNo()),
        movementType: body.movementType as StockMovementType,
        status: StockMovementStatus.SUBMITTED,
        fromLocationId: body.fromLocationId || null,
        toLocationId: body.toLocationId || null,
        requestedBy: body.requestedBy || null,
        requestedByEmail: body.requestedByEmail || null,
        department: body.department || null,
        site: body.site || null,
        projectCode: body.projectCode || null,
        reason: body.reason || null,
        referenceType: body.referenceType || null,
        referenceId: body.referenceId || null,
        submittedAt: new Date(),
        lines: {
          create: body.lines.map((line: any) => ({
            stockItemId: line.stockItemId,
            quantity: this.decimal(line.quantity),
            unitCost: line.unitCost === undefined ? undefined : this.decimal(line.unitCost),
            totalCost:
              line.totalCost === undefined
                ? line.unitCost === undefined
                  ? undefined
                  : this.decimal(Number(line.quantity || 0) * Number(line.unitCost || 0))
                : this.decimal(line.totalCost),
            qrTagId: line.qrTagId || null,
            notes: line.notes || null,
          })),
        },
      },
      include: {
        fromLocation: true,
        toLocation: true,
        lines: {
          include: {
            stockItem: true,
            qrTag: true,
          },
        },
      },
    });
  }

  async approveMovement(id: string, body: any) {
    const movement = await this.prisma.stockMovement.findUnique({
      where: { id },
    });

    if (!movement) {
      throw new NotFoundException('Stock movement not found.');
    }

    if (movement.status !== StockMovementStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted movements can be approved.');
    }

    return this.prisma.stockMovement.update({
      where: { id },
      data: {
        status: StockMovementStatus.APPROVED,
        approvedBy: body?.approvedBy || 'asset-manager-dev',
        approvedAt: new Date(),
      },
    });
  }

  async postMovement(id: string, body: any) {
    const movement = await this.prisma.stockMovement.findUnique({
      where: { id },
      include: {
        lines: true,
      },
    });

    if (!movement) {
      throw new NotFoundException('Stock movement not found.');
    }

    if (movement.status !== StockMovementStatus.APPROVED) {
      throw new BadRequestException('Only approved movements can be posted.');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const line of movement.lines) {
        const quantity = new Prisma.Decimal(line.quantity);

          if (this.decreasesSourceStock(movement.movementType)) {
          if (!movement.fromLocationId) {
            throw new BadRequestException('From location is required for this movement type.');
          }

          await this.upsertBalance(tx, line.stockItemId, movement.fromLocationId, quantity.negated());
        }

          if (this.increasesDestinationStock(movement.movementType)) {
          if (!movement.toLocationId) {
            throw new BadRequestException('To location is required for this movement type.');
          }

          await this.upsertBalance(tx, line.stockItemId, movement.toLocationId, quantity);
        }

        if (line.qrTagId) {
          await tx.assetQrTag.update({
            where: { id: line.qrTagId },
            data: {
              assignedLocationId: movement.toLocationId || movement.fromLocationId || undefined,
              lastScannedAt: new Date(),
              lastScannedBy: body?.postedBy || 'asset-manager-dev',
              lastScanSite: movement.site || null,
              status:
                movement.movementType === StockMovementType.ISSUE
                  ? ScaffoldTagStatus.ISSUED
                  : movement.movementType === StockMovementType.RETURN
                    ? ScaffoldTagStatus.AVAILABLE
                    : movement.movementType === StockMovementType.DAMAGE
                      ? ScaffoldTagStatus.DAMAGED
                      : movement.movementType === StockMovementType.LOSS
                        ? ScaffoldTagStatus.LOST
                        : undefined,
            },
          });
        }
      }

      return tx.stockMovement.update({
        where: { id },
        data: {
          status: StockMovementStatus.POSTED,
          postedBy: body?.postedBy || 'asset-manager-dev',
          postedAt: new Date(),
        },
        include: {
          fromLocation: true,
          toLocation: true,
          lines: {
            include: {
              stockItem: true,
              qrTag: true,
            },
          },
        },
      });
    });
  }

  async getQrTags() {
    return this.prisma.assetQrTag.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        stockItem: true,
        asset: true,
        scaffoldComponent: true,
        assignedLocation: true,
      },
    });
  }

  async createQrTag(body: any) {
    if (!body?.tagCode) {
      throw new BadRequestException('QR tag code is required.');
    }

    return this.prisma.assetQrTag.create({
      data: {
        tagCode: String(body.tagCode),
        qrPayload: body.qrPayload || String(body.tagCode),
        barcodeValue: body.barcodeValue || null,
        stockItemId: body.stockItemId || null,
        assetId: body.assetId || null,
        scaffoldComponentId: body.scaffoldComponentId || null,
        assignedLocationId: body.assignedLocationId || null,
        status: body.status || ScaffoldTagStatus.AVAILABLE,
      },
    });
  }

  async scanQrTag(tagCode: string, body: any = {}) {
    const tag = await this.prisma.assetQrTag.findUnique({
      where: { tagCode },
      include: {
        stockItem: true,
        asset: true,
        scaffoldComponent: true,
        assignedLocation: true,
      },
    });

    if (!tag) {
      throw new NotFoundException('QR tag not found.');
    }

    return this.prisma.assetQrTag.update({
      where: { tagCode },
      data: {
        lastScannedAt: new Date(),
        lastScannedBy: body?.scannedBy || 'scanner-dev-user',
        lastScanSite: body?.site || tag.assignedLocation?.site || null,
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
    return this.prisma.hubAsset.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        qrTags: true,
        movements: true,
        inspections: true,
      },
    });
  }

  async createAsset(body: any) {
    if (!body?.name) {
      throw new BadRequestException('Asset name is required.');
    }

    return this.prisma.hubAsset.create({
      data: {
        assetNo: body.assetNo || (await this.nextAssetNo()),
        assetTag: body.assetTag || null,
        category: body.category || AssetCategory.OTHER,
        name: String(body.name),
        description: body.description || null,
        department: body.department || null,
        site: body.site || null,
        location: body.location || null,
        serialNumber: body.serialNumber || null,
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
        purchaseValue:
          body.purchaseValue === undefined ? undefined : this.decimal(body.purchaseValue),
        currentValue:
          body.currentValue === undefined ? undefined : this.decimal(body.currentValue),
        supplierName: body.supplierName || null,
        procurementRequestId: body.procurementRequestId || null,
        status: body.status || AssetStatus.ACTIVE,
      },
    });
  }

  async getScaffoldComponents() {
    return this.prisma.scaffoldComponent.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        stockItem: true,
        qrTags: true,
        inspections: true,
      },
    });
  }

  async createScaffoldComponent(body: any) {
    return this.prisma.scaffoldComponent.create({
      data: {
        componentNo: body.componentNo || (await this.nextScaffoldNo()),
        componentType: body.componentType || ScaffoldComponentType.OTHER,
        description: body.description || null,
        stockItemId: body.stockItemId || null,
        currentSite: body.currentSite || null,
        currentLocation: body.currentLocation || null,
        conditionStatus: body.conditionStatus || 'GOOD',
        tagStatus: body.tagStatus || ScaffoldTagStatus.AVAILABLE,
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
        purchaseValue:
          body.purchaseValue === undefined ? undefined : this.decimal(body.purchaseValue),
      },
    });
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
      itemType: StockItemType.SCAFFOLD_COMPONENT,
      category: 'Scaffold',
      unitOfMeasure: 'EA',
      minimumLevel: 20,
      reorderLevel: 50,
      isSerialized: true,
      isQrTracked: true,
    });

    const ppeGloves = await this.createStockItem({
      itemCode: 'PPE-GLOVES',
      itemName: 'Safety Gloves',
      itemType: StockItemType.PPE,
      category: 'PPE',
      unitOfMeasure: 'PAIR',
      minimumLevel: 50,
      reorderLevel: 100,
      isSerialized: false,
      isQrTracked: false,
    });

    const scaffold = await this.createScaffoldComponent({
      componentType: ScaffoldComponentType.STANDARD,
      description: 'Demo scaffold standard with QR tag',
      stockItemId: scaffoldStandard.id,
      currentSite: 'Kitwe Main Distribution Centre',
      currentLocation: 'KMD-STORES',
    });

    const qrTag = await this.createQrTag({
      tagCode: 'QR-SCF-0001',
      qrPayload: 'QR-SCF-0001',
      stockItemId: scaffoldStandard.id,
      scaffoldComponentId: scaffold.id,
      assignedLocationId: mainStore.id,
    });

    const receipt = await this.createMovement({
      movementType: StockMovementType.RECEIPT,
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

    await this.prisma.stockMovement.update({
      where: { id: receipt.id },
      data: {
        status: StockMovementStatus.APPROVED,
        approvedBy: 'Asset Manager',
        approvedAt: new Date(),
      },
    });

    await this.postMovement(receipt.id, {
      postedBy: 'Asset Manager',
    });

    return {
      message: 'Demo asset, stores, scaffold and QR data seeded successfully.',
      locations: [mainStore, siteYard],
      stockItems: [scaffoldStandard, ppeGloves],
      scaffold,
      qrTag,
    };
  }
}