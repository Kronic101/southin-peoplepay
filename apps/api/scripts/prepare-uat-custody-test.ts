import {
  InventoryControlType,
  Prisma,
  PrismaClient,
  StockAssignmentPolicy,
  StockItemType,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('');
  console.log('LOCAL DEVELOPMENT / UAT TEST DATA ONLY');
  console.log('--------------------------------------');

  /*
   * 1. Find the Solwezi Warehouse stock location.
   */
  const location = await prisma.stockLocation.findFirst({
    where: {
      isActive: true,
      OR: [
        {
          locationName: {
            equals: 'Solwezi Warehouse',
            mode: 'insensitive',
          },
        },
        {
          site: {
            equals: 'Solwezi Warehouse',
            mode: 'insensitive',
          },
        },
      ],
    },
  });

  if (!location) {
    const candidates = await prisma.stockLocation.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        locationCode: true,
        locationName: true,
        site: true,
        branch: true,
      },
      orderBy: {
        locationName: 'asc',
      },
    });

    console.table(candidates);

    throw new Error(
      'Solwezi Warehouse stock location was not found. Review the locations printed above.',
    );
  }

  console.log(`Location:     ${location.locationName}`);
  console.log(`Location ID:  ${location.id}`);
  console.log(`Location Code:${location.locationCode}`);
  console.log(`Site:         ${location.site || '-'}`);
  console.log(`Branch:       ${location.branch || '-'}`);
  console.log('');

  /*
   * 2. Create/update our isolated UAT stock item.
   */
  const item = await prisma.stockItem.upsert({
    where: {
      itemCode: 'UAT-CUST-001',
    },

    update: {
      itemName: 'UAT Custody Tool',
      itemType: StockItemType.TOOL,
      category: 'UAT',
      description:
        'Local development test item for structured Stores custody assignment.',

      unitOfMeasure: 'EA',

      minimumLevel: new Prisma.Decimal(0),
      reorderLevel: new Prisma.Decimal(1),
      standardCost: new Prisma.Decimal(100),

      inventoryControlType:
        InventoryControlType.NON_CONSUMABLE,

      assignmentPolicy:
        StockAssignmentPolicy.EMPLOYEE,

      assetRegistrationRequired: false,
      custodyTrackingRequired: true,

      isSerialized: false,
      isQrTracked: false,
      isRfidTracked: false,

      isActive: true,
    },

    create: {
      itemCode: 'UAT-CUST-001',
      itemName: 'UAT Custody Tool',
      itemType: StockItemType.TOOL,
      category: 'UAT',
      description:
        'Local development test item for structured Stores custody assignment.',

      unitOfMeasure: 'EA',

      minimumLevel: new Prisma.Decimal(0),
      reorderLevel: new Prisma.Decimal(1),
      standardCost: new Prisma.Decimal(100),

      inventoryControlType:
        InventoryControlType.NON_CONSUMABLE,

      assignmentPolicy:
        StockAssignmentPolicy.EMPLOYEE,

      assetRegistrationRequired: false,
      custodyTrackingRequired: true,

      isSerialized: false,
      isQrTracked: false,
      isRfidTracked: false,

      isActive: true,
    },
  });

  console.log(`Stock Item:   ${item.itemCode} - ${item.itemName}`);
  console.log(`Item ID:      ${item.id}`);
  console.log(`Control:      ${item.inventoryControlType}`);
  console.log(`Assignment:   ${item.assignmentPolicy}`);
  console.log('');

  /*
   * 3. Give this UAT-only item exactly 5 EA at
   *    Solwezi Warehouse.
   *
   * Because this is isolated UAT seed data,
   * we may safely reset this item's test balance.
   */
  const balance = await prisma.stockBalance.upsert({
    where: {
      stockItemId_locationId: {
        stockItemId: item.id,
        locationId: location.id,
      },
    },

    update: {
      quantityOnHand: new Prisma.Decimal(5),
      quantityIssued: new Prisma.Decimal(0),
      quantityDamaged: new Prisma.Decimal(0),
      quantityLost: new Prisma.Decimal(0),
    },

    create: {
      stockItemId: item.id,
      locationId: location.id,

      quantityOnHand: new Prisma.Decimal(5),
      quantityIssued: new Prisma.Decimal(0),
      quantityDamaged: new Prisma.Decimal(0),
      quantityLost: new Prisma.Decimal(0),
    },

    include: {
      location: true,
      stockItem: true,
    },
  });

  console.log(
    `Opening UAT Stock: ${balance.quantityOnHand} ${item.unitOfMeasure}`,
  );
  console.log('');

  /*
   * 4. Create a fresh APPROVED UAT requisition.
   *
   * A unique requisition is generated on every run so old
   * issued movements cannot interfere with a new test.
   */
  const stamp = String(Date.now()).slice(-6);

  const requisitionNo =
    `STR-UAT-${new Date().getFullYear()}-${stamp}`;

  const requisition =
    await prisma.storesRequisition.create({
      data: {
        requisitionNo,

        title: 'UAT Structured Custody Test',

        description:
          'End-to-end test of Stores issue to AssetCustodyAssignment.',

        reason:
          'UAT structured employee custody transaction',

        requestedBy:
          'Chongo Mwesa',

        requestedByEmail:
          'chongomwesa@southincon.com',

        requesterRole:
          'STORES_OFFICER',

        department:
          'Asset',

        site:
          location.site ||
          location.locationName,

        branch:
          location.branch ||
          null,

        status:
          'APPROVED',

        approvedBy:
          'LOCAL_DEV_TEST',

        approvedAt:
          new Date(),

        totalValue:
          new Prisma.Decimal(100),

        currency:
          'ZMW',

        payload: {
          inventoryControlType:
            'NON_CONSUMABLE',

          testScenario:
            'STRUCTURED_EMPLOYEE_CUSTODY',

          localDevOnly:
            true,
        },

        lines: {
          create: [
            {
              stockItemId:
                item.id,

              itemCode:
                item.itemCode,

              itemName:
                item.itemName,

              description:
                item.description,

              unitOfMeasure:
                item.unitOfMeasure,

              quantity:
                new Prisma.Decimal(1),

              unitCost:
                new Prisma.Decimal(100),

              totalCost:
                new Prisma.Decimal(100),

              notes:
                'UAT structured custody issue test',
            },
          ],
        },
      },

      include: {
        lines: true,
      },
    });

  console.log('TEST READY');
  console.log('--------------------------------------');
  console.log(`Requisition:  ${requisition.requisitionNo}`);
  console.log(`Status:       ${requisition.status}`);
  console.log(`Site:         ${requisition.site}`);
  console.log(`Item:         ${item.itemCode}`);
  console.log(`Requested:    1 EA`);
  console.log(`Stock:        5 EA`);
  console.log(`Policy:       ${item.assignmentPolicy}`);
  console.log('');
  console.log(`Requisition ID: ${requisition.id}`);
  console.log('');
  console.log(
    `Open: http://localhost:3000/stores/requisitions/${requisition.id}`,
  );
  console.log('');
}

main()
  .catch((error) => {
    console.error('');
    console.error('UAT setup failed.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });