import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const requisitionNo =
    process.argv[2] || 'STR-UAT-2026-424844';

  console.log('');
  console.log('VERIFY STRUCTURED CUSTODY TRANSACTION');
  console.log('-------------------------------------');

  const requisition =
    await prisma.storesRequisition.findUnique({
      where: {
        requisitionNo,
      },
      include: {
        lines: true,
        custodyAssignments: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

  if (!requisition) {
    throw new Error(
      `Requisition ${requisitionNo} was not found.`,
    );
  }

  const itemCode =
    requisition.lines[0]?.itemCode;

  if (!itemCode) {
    throw new Error(
      'The requisition does not contain a stock item code.',
    );
  }

  const item =
    await prisma.stockItem.findUnique({
      where: {
        itemCode,
      },
    });

  if (!item) {
    throw new Error(
      `Stock item ${itemCode} was not found.`,
    );
  }

  const movements =
    await prisma.stockMovement.findMany({
      where: {
        referenceType:
          'STORES_REQUISITION',

        referenceId:
          requisition.id,
      },

      include: {
        fromLocation: true,

        lines: {
          include: {
            stockItem: true,
          },
        },

        ledgerEntries: true,
      },

      orderBy: {
        createdAt: 'asc',
      },
    });

  const balance =
    await prisma.stockBalance.findFirst({
      where: {
        stockItemId:
          item.id,

        location: {
          locationCode:
            'SOL-WH',
        },
      },

      include: {
        location: true,
      },
    });

  console.log('');
  console.log('REQUISITION');
  console.log('-------------------------------------');
  console.log(
    `Number:      ${requisition.requisitionNo}`,
  );
  console.log(
    `Status:      ${requisition.status}`,
  );
  console.log(
    `Lines:       ${requisition.lines.length}`,
  );

  for (const line of requisition.lines) {
    const issuedForLine =
      movements.reduce(
        (total, movement) =>
          total +
          movement.lines
            .filter(
              (movementLine) =>
                movementLine.stockItemId ===
                line.stockItemId,
            )
            .reduce(
              (lineTotal, movementLine) =>
                lineTotal +
                Number(
                  movementLine.quantity || 0,
                ),
              0,
            ),
        0,
      );

    console.log(
      `${line.itemCode}: requested=${line.quantity} issued=${issuedForLine}`,
    );

  console.log('');
  console.log('STOCK ITEM');
  console.log('-------------------------------------');
  console.log(
    `Item:        ${item.itemCode} - ${item.itemName}`,
  );
  console.log(
    `Control:     ${item.inventoryControlType}`,
  );
  console.log(
    `Policy:      ${item.assignmentPolicy}`,
  );

  console.log('');
  console.log('BALANCE');
  console.log('-------------------------------------');

  if (!balance) {
    console.log('No SOL-WH balance found.');
  } else {
    console.log(
      `Location:    ${balance.location.locationCode}`,
    );
    console.log(
      `On Hand:     ${balance.quantityOnHand}`,
    );
    console.log(
      `Issued:      ${balance.quantityIssued}`,
    );
  }

  console.log('');
  console.log('MOVEMENTS');
  console.log('-------------------------------------');

  if (!movements.length) {
    console.log('No Stores issue movements found.');
  }

  for (const movement of movements) {
    console.log(
      `${movement.movementNo}`,
    );
    console.log(
      `  Type:      ${movement.movementType}`,
    );
    console.log(
      `  Status:    ${movement.status}`,
    );
    console.log(
      `  Store:     ${movement.fromLocation?.locationCode || '-'}`,
    );
    console.log(
      `  Posted By: ${movement.postedBy || '-'}`,
    );

    for (const line of movement.lines) {
      console.log(
        `  Line:      ${line.stockItem.itemCode} x ${line.quantity}`,
      );
    }

    console.log(
      `  Ledger:    ${movement.ledgerEntries.length} entries`,
    );
  }

  console.log('');
  console.log('CUSTODY ASSIGNMENTS');
  console.log('-------------------------------------');

  if (!requisition.custodyAssignments.length) {
    console.log(
      'ERROR: No AssetCustodyAssignment was created.',
    );
  }

  for (
    const custody of
    requisition.custodyAssignments
  ) {
    console.log(
      `Assignment:  ${custody.assignmentNo}`,
    );
    console.log(
      `Status:      ${custody.status}`,
    );
    console.log(
      `Quantity:    ${custody.quantity}`,
    );
    console.log(
      `Type:        ${custody.assignedToType}`,
    );
    console.log(
      `Reference:   ${custody.assignedToReferenceId || '-'}`,
    );
    console.log(
      `Employee ID: ${custody.employeeId || '-'}`,
    );
    console.log(
      `Employee No: ${custody.employeeNumber || '-'}`,
    );
    console.log(
      `Name:        ${custody.assignedToName}`,
    );
    console.log(
      `Department:  ${custody.department || '-'}`,
    );
    console.log(
      `Site:        ${custody.site || '-'}`,
    );
    console.log(
      `Movement:    ${custody.stockMovementId || '-'}`,
    );
    console.log(
      `Move Line:   ${custody.stockMovementLineId || '-'}`,
    );
    console.log(
      `Requisition: ${custody.storesRequisitionId || '-'}`,
    );
    console.log('');
  }

  /*
   * Simple pass / fail checks.
   */
  const postedMovement =
    movements.find(
      (movement) =>
        String(
          movement.status,
        ).toUpperCase() ===
        'POSTED',
    );

  const custody =
    requisition.custodyAssignments[0];

  const checks = {
    requisitionFound:
      Boolean(requisition),

    stockReducedTo4:
      Number(
        balance?.quantityOnHand || 0,
      ) === 4,

    issuedQuantity1:
      Number(
        balance?.quantityIssued || 0,
      ) === 1,

    postedMovement:
      Boolean(postedMovement),

    movementQuantity1:
      Number(
        postedMovement?.lines[0]
          ?.quantity || 0,
      ) === 1,

    custodyCreated:
      Boolean(custody),

    custodyAssigned:
      custody?.status ===
      'ASSIGNED',

    custodyEmployee:
      custody?.assignedToType ===
      'EMPLOYEE',

    employeeLinked:
      Boolean(
        custody?.employeeId,
      ),

    movementLinked:
      Boolean(
        custody?.stockMovementId,
      ),

    movementLineLinked:
      Boolean(
        custody?.stockMovementLineId,
      ),

    requisitionLinked:
      custody?.storesRequisitionId ===
      requisition.id,
  };

  console.log('CHECKS');
  console.log('-------------------------------------');

  console.table(
    Object.entries(checks).map(
      ([check, passed]) => ({
        check,
        result:
          passed ? 'PASS' : 'FAIL',
      }),
    ),
  );

  const allPassed =
    Object.values(checks).every(Boolean);

  console.log('');

  if (allPassed) {
    console.log(
      'RESULT: STRUCTURED CUSTODY TRANSACTION PASSED ✅',
    );
  } else {
    console.log(
      'RESULT: ONE OR MORE CHECKS FAILED ❌',
    );

    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });}