import { Prisma } from '@prisma/client';
import { StoresService } from '../src/stores/stores.service';

type Item = {
  id: string;
  itemCode: string;
  itemName: string;
  itemType: string;
  category: string | null;
  unitOfMeasure: string;
  standardCost: Prisma.Decimal;
  inventoryControlType: 'CONSUMABLE' | 'NON_CONSUMABLE';
  assetRegistrationRequired: boolean;
  custodyTrackingRequired: boolean;
  isSerialized: boolean;
  isQrTracked: boolean;
  isRfidTracked: boolean;
  isActive: boolean;
};

type Req = any;
type Move = any;

const location = {
  id: 'loc-main',
  locationCode: 'STORE-001',
  locationName: 'Main Test Store',
  locationType: 'STORE',
  site: 'Test Site',
  branch: 'TEST',
  isActive: true,
};

const items: Item[] = [
  {
    id: 'con', itemCode: 'TEST-CON-001', itemName: 'Safety Gloves',
    itemType: 'PPE', category: 'PPE', unitOfMeasure: 'PAIR',
    standardCost: new Prisma.Decimal(25), inventoryControlType: 'CONSUMABLE',
    assetRegistrationRequired: false, custodyTrackingRequired: false,
    isSerialized: false, isQrTracked: false, isRfidTracked: false, isActive: true,
  },
  {
    id: 'low', itemCode: 'TEST-LOW-001', itemName: 'Grinding Discs',
    itemType: 'MATERIAL', category: 'Workshop', unitOfMeasure: 'EA',
    standardCost: new Prisma.Decimal(10), inventoryControlType: 'CONSUMABLE',
    assetRegistrationRequired: false, custodyTrackingRequired: false,
    isSerialized: false, isQrTracked: false, isRfidTracked: false, isActive: true,
  },
  {
    id: 'custody', itemCode: 'TEST-NON-001', itemName: 'Allen Keys',
    itemType: 'TOOL', category: 'Tools', unitOfMeasure: 'SET',
    standardCost: new Prisma.Decimal(150), inventoryControlType: 'NON_CONSUMABLE',
    assetRegistrationRequired: false, custodyTrackingRequired: true,
    isSerialized: false, isQrTracked: false, isRfidTracked: false, isActive: true,
  },
  {
    id: 'asset', itemCode: 'TEST-ASSET-001', itemName: 'Power Drill',
    itemType: 'TOOL', category: 'Tools', unitOfMeasure: 'EA',
    standardCost: new Prisma.Decimal(900), inventoryControlType: 'NON_CONSUMABLE',
    assetRegistrationRequired: true, custodyTrackingRequired: true,
    isSerialized: true, isQrTracked: true, isRfidTracked: false, isActive: true,
  },
];

function req(id: string, status: string, stockItemId: string, qty: number): Req {
  const item = items.find((x) => x.id === stockItemId)!;
  const quantity = new Prisma.Decimal(qty);
  return {
    id,
    requisitionNo: `STR-${id.toUpperCase()}`,
    status,
    requestedBy: 'Test Requester',
    requestedByEmail: 'requester@southincon.com',
    requesterRole: 'REQUESTER',
    department: 'Operations',
    departmentId: null,
    site: 'Test Site',
    branch: 'TEST',
    projectCode: null,
    approvedBy: status === 'APPROVED' ? 'Approver' : null,
    approvedAt: status === 'APPROVED' ? new Date('2026-10-14T08:00:00Z') : null,
    availabilityStatus: 'PENDING_CHECK',
    payload: { inventoryControlType: item.inventoryControlType },
    procurementRequests: [],
    lines: [{
      id: `${id}-line`, requisitionId: id, stockItemId,
      itemCode: item.itemCode, itemName: item.itemName, description: null,
      quantity, unitOfMeasure: item.unitOfMeasure,
      unitCost: item.standardCost, totalCost: quantity.mul(item.standardCost), notes: null,
    }],
  };
}

const requisitions: Req[] = [
  req('good', 'APPROVED', 'con', 10),
  req('over', 'APPROVED', 'con', 5),
  req('lowstock', 'APPROVED', 'low', 5),
  req('pending', 'SUBMITTED', 'con', 5),
  req('custodyreq', 'APPROVED', 'custody', 1),
  req('assetreq', 'APPROVED', 'asset', 1),
  req('partial', 'APPROVED', 'con', 10),
];

const balances: any[] = [
  { id: 'b-con', stockItemId: 'con', locationId: location.id,
    quantityOnHand: new Prisma.Decimal(100), quantityIssued: new Prisma.Decimal(0),
    quantityDamaged: new Prisma.Decimal(0), quantityLost: new Prisma.Decimal(0), location },
  { id: 'b-low', stockItemId: 'low', locationId: location.id,
    quantityOnHand: new Prisma.Decimal(2), quantityIssued: new Prisma.Decimal(0),
    quantityDamaged: new Prisma.Decimal(0), quantityLost: new Prisma.Decimal(0), location },
  { id: 'b-custody', stockItemId: 'custody', locationId: location.id,
    quantityOnHand: new Prisma.Decimal(5), quantityIssued: new Prisma.Decimal(0),
    quantityDamaged: new Prisma.Decimal(0), quantityLost: new Prisma.Decimal(0), location },
  { id: 'b-asset', stockItemId: 'asset', locationId: location.id,
    quantityOnHand: new Prisma.Decimal(2), quantityIssued: new Prisma.Decimal(0),
    quantityDamaged: new Prisma.Decimal(0), quantityLost: new Prisma.Decimal(0), location },
];

const movements: Move[] = [];
let movementCounter = 0;

const fakePrisma: any = {
  storesRequisition: {
    findUnique: async ({ where }: any) => requisitions.find((x) => x.id === where.id) ?? null,
    update: async ({ where, data }: any) => {
      const row = requisitions.find((x) => x.id === where.id);
      if (!row) throw new Error(`Unknown requisition ${where.id}`);
      Object.assign(row, data);
      return row;
    },
  },
  stockItem: {
    findMany: async ({ where }: any) => {
      const ids: string[] = where?.id?.in ?? [];
      return items.filter((x) => ids.includes(x.id));
    },
  },
  stockBalance: {
    findMany: async ({ where }: any) => {
      const ids: string[] = where?.stockItemId?.in ?? [];
      return balances.filter((x) => ids.includes(x.stockItemId) && x.location.isActive);
    },
    findUnique: async ({ where }: any) => {
      const key = where?.stockItemId_locationId;
      return balances.find((x) => x.stockItemId === key?.stockItemId && x.locationId === key?.locationId) ?? null;
    },
  },
  stockLocation: {
    findUnique: async ({ where }: any) => where.id === location.id ? location : null,
  },
  stockMovement: {
    findMany: async ({ where }: any) => movements
      .filter((m) => m.referenceType === where.referenceType && m.referenceId === where.referenceId && m.status === where.status)
      .map((m) => ({ ...m, fromLocation: location, lines: m.lines.map((l: any) => ({ ...l, stockItem: items.find((x) => x.id === l.stockItemId) })) })),
    count: async ({ where }: any) => movements.filter((m) => m.referenceType === where.referenceType && m.referenceId === where.referenceId).length,
    create: async ({ data }: any) => {
      movementCounter += 1;
      const movement = {
        id: `move-${movementCounter}`,
        ...data,
        postedBy: null,
        postedAt: null,
        lines: (data.lines?.create ?? []).map((l: any, i: number) => ({
          id: `move-${movementCounter}-line-${i + 1}`,
          stockItemId: l.stockItemId,
          quantity: new Prisma.Decimal(l.quantity),
          unitCost: new Prisma.Decimal(l.unitCost),
          totalCost: new Prisma.Decimal(l.totalCost),
          notes: l.notes ?? null,
          stockItem: items.find((x) => x.id === l.stockItemId),
        })),
        fromLocation: location,
      };
      movements.push(movement);
      return movement;
    },
  },
};

const fakeApprovalWorkflowService: any = {
  startWorkflowSafe: async () => {
    throw new Error('Approval workflow must not start in issue tests.');
  },
};

const fakeAssetsService: any = {
  postMovement: async (movementId: string, body: any) => {
    const movement = movements.find((x) => x.id === movementId);
    if (!movement) throw new Error(`Unknown movement ${movementId}`);

    for (const line of movement.lines) {
      const balance = balances.find((x) => x.stockItemId === line.stockItemId && x.locationId === movement.fromLocationId);
      if (!balance) throw new Error(`Missing balance for ${line.stockItemId}`);
      const qty = Number(line.quantity);
      if (Number(balance.quantityOnHand) < qty) throw new Error('Mock insufficient stock');
      balance.quantityOnHand = new Prisma.Decimal(Number(balance.quantityOnHand) - qty);
      balance.quantityIssued = new Prisma.Decimal(Number(balance.quantityIssued) + qty);
    }

    movement.status = 'POSTED';
    movement.postedBy = body.postedBy;
    movement.postedAt = new Date('2026-10-14T10:00:00Z');
    return movement;
  },
};

const fakeDocumentsService: any = {
  createStoresIssueDocketDocument: async () => null,
};

const service = new StoresService(fakePrisma, fakeApprovalWorkflowService, fakeAssetsService, fakeDocumentsService);

function body(stockItemId: string, quantity: number, extra: Record<string, unknown> = {}) {
  return {
    fromLocationId: location.id,
    issuedBy: 'Stores Officer',
    issuedByEmail: 'stores@southincon.com',
    lines: [{ stockItemId, quantity }],
    ...extra,
  };
}

async function blocked(name: string, fn: () => Promise<any>, expected: string) {
  const before = movements.length;
  try {
    await fn();
    throw new Error(`${name}: unexpectedly passed`);
  } catch (error: any) {
    const message = String(error?.message ?? error);
    if (!message.includes(expected)) throw new Error(`${name}: unexpected message: ${message}`);
  }
  if (movements.length !== before) throw new Error(`${name}: movement created despite blocker`);
}

async function main() {
  console.log('\nSTORES ISSUE / AVAILABILITY CONTROL TESTS\n');

  const good = await service.issueRequisition('good', body('con', 3));
  if (good.availabilityStatus !== 'IN_STOCK') throw new Error(`Unexpected availability ${good.availabilityStatus}`);
  console.log('PASS 1 - Approved requisition with enough stock posts successfully.');

  await blocked('over-approved', () => service.issueRequisition('over', body('con', 6)), 'Only 5 remain approved for issue');
  console.log('PASS 2 - Quantity greater than approved remaining is blocked.');

  await blocked('low-stock', () => service.issueRequisition('lowstock', body('low', 3)), 'Insufficient stock');
  console.log('PASS 3 - Quantity greater than selected-store stock is blocked.');

  await blocked('pending', () => service.issueRequisition('pending', body('con', 1)), 'only be issued after the requisition has received final approval');
  console.log('PASS 4 - Non-approved requisition cannot issue stock.');

  await blocked('custody', () => service.issueRequisition('custodyreq', body('custody', 1)), 'Issued To is required');
  console.log('PASS 5 - Custody item without recipient is blocked.');

  await blocked('asset', () => service.issueRequisition('assetreq', body('asset', 1, { issuedToName: 'Test Custodian' })), 'requires asset registration before issue');
  console.log('PASS 6 - Asset-registration item is blocked.');

  const beforePartial = await service.getRequisitionOperations('partial');
  if (beforePartial.lines[0].remainingQuantity !== 10) throw new Error('Partial test did not start at 10 remaining');

  await service.issueRequisition('partial', body('con', 4));
  const afterPartial = await service.getRequisitionOperations('partial');

  if (afterPartial.lines[0].issuedQuantity !== 4) throw new Error(`Expected issued=4, got ${afterPartial.lines[0].issuedQuantity}`);
  if (afterPartial.lines[0].remainingQuantity !== 6) throw new Error(`Expected remaining=6, got ${afterPartial.lines[0].remainingQuantity}`);
  console.log('PASS 7 - Partial issue recalculates issued and remaining quantities correctly.');

  console.log('');
  console.table({
    postedMovements: movements.filter((m) => m.status === 'POSTED').length,
    totalMovements: movements.length,
  });
  console.log('\nALL STORES ISSUE / AVAILABILITY CONTROL TESTS PASSED');
  console.log('No Supabase data, live balances, or real approval workflows were used.');
}

main().catch((error) => {
  console.error('\nSTORES ISSUE / AVAILABILITY CONTROL TEST FAILED');
  console.error(error);
  process.exit(1);
});
