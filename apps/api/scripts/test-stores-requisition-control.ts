import { Prisma } from '@prisma/client';

import { StoresService } from '../src/stores/stores.service';

type MockStockItem = {
  id: string;
  itemCode: string;
  itemName: string;
  itemType: string;
  category: string | null;
  description: string | null;
  unitOfMeasure: string;
  standardCost: Prisma.Decimal;
  inventoryControlType: 'CONSUMABLE' | 'NON_CONSUMABLE';
  assetRegistrationRequired: boolean;
  custodyTrackingRequired: boolean;
  isSerialized: boolean;
  isActive: boolean;
};

const stockItems: MockStockItem[] = [
  {
    id: 'con-001',
    itemCode: 'TEST-CON-001',
    itemName: 'Safety Gloves',
    itemType: 'PPE',
    category: 'PPE',
    description: 'Test consumable PPE',
    unitOfMeasure: 'PAIR',
    standardCost: new Prisma.Decimal(25),
    inventoryControlType: 'CONSUMABLE',
    assetRegistrationRequired: false,
    custodyTrackingRequired: false,
    isSerialized: false,
    isActive: true,
  },
  {
    id: 'con-002',
    itemCode: 'TEST-CON-002',
    itemName: 'Welding Rods',
    itemType: 'MATERIAL',
    category: 'Materials',
    description: 'Test consumable material',
    unitOfMeasure: 'BOX',
    standardCost: new Prisma.Decimal(120),
    inventoryControlType: 'CONSUMABLE',
    assetRegistrationRequired: false,
    custodyTrackingRequired: false,
    isSerialized: false,
    isActive: true,
  },
  {
    id: 'non-001',
    itemCode: 'TEST-NON-001',
    itemName: 'Allen Keys',
    itemType: 'TOOL',
    category: 'Tools',
    description: 'Test non-consumable tool',
    unitOfMeasure: 'SET',
    standardCost: new Prisma.Decimal(150),
    inventoryControlType: 'NON_CONSUMABLE',
    assetRegistrationRequired: false,
    custodyTrackingRequired: true,
    isSerialized: false,
    isActive: true,
  },
  {
    id: 'non-002',
    itemCode: 'TEST-NON-002',
    itemName: 'Power Drill',
    itemType: 'TOOL',
    category: 'Tools',
    description: 'Test controlled tool',
    unitOfMeasure: 'EA',
    standardCost: new Prisma.Decimal(900),
    inventoryControlType: 'NON_CONSUMABLE',
    assetRegistrationRequired: true,
    custodyTrackingRequired: true,
    isSerialized: true,
    isActive: true,
  },
];

let createCount = 0;
let updateCount = 0;
let workflowCount = 0;

const fakePrisma: any = {
  stockItem: {
    findUnique: async ({ where }: any) =>
      stockItems.find((item) => item.id === where.id) ?? null,

    findFirst: async ({ where }: any) => {
      const requestedCode = String(where?.itemCode?.equals ?? '').toUpperCase();

      return (
        stockItems.find(
          (item) => item.itemCode.toUpperCase() === requestedCode,
        ) ?? null
      );
    },
  },

  storesRequisition: {
    count: async () => 0,

    create: async ({ data }: any) => {
      createCount += 1;

      return {
        id: `req-${createCount}`,
        requisitionNo: data.requisitionNo,
        title: data.title,
        description: data.description,
        reason: data.reason,
        requestedBy: data.requestedBy,
        requestedByEmail: data.requestedByEmail,
        requesterRole: data.requesterRole,
        department: data.department,
        departmentId: data.departmentId,
        site: data.site,
        branch: data.branch,
        projectCode: data.projectCode,
        status: data.status,
        totalValue: data.totalValue,
        currency: data.currency,
        payload: data.payload,
        approvalRequestId: null,
        lines: data.lines.create,
      };
    },

    update: async ({ where, data }: any) => {
      updateCount += 1;

      return {
        id: where.id,
        requisitionNo: 'STR-REQ-TEST',
        title: 'Test requisition',
        description: null,
        reason: 'Test',
        requestedBy: 'Test User',
        requestedByEmail: 'test@southincon.com',
        requesterRole: 'REQUESTER',
        department: 'Operations',
        departmentId: null,
        site: 'Test Site',
        branch: null,
        totalValue: new Prisma.Decimal(0),
        currency: 'ZMW',
        approvalRequestId: data.approvalRequestId,
        status: data.status,
        lines: [],
      };
    },
  },
};

const fakeApprovalWorkflowService: any = {
  startWorkflowSafe: async () => {
    workflowCount += 1;

    return {
      status: 'STARTED',
      approvalRequest: null,
    };
  },
};

const service = new StoresService(
  fakePrisma,
  fakeApprovalWorkflowService,
);

function baseBody(lines: any[]) {
  return {
    requestedBy: 'Test User',
    requestedByEmail: 'test@southincon.com',
    requesterRole: 'REQUESTER',
    department: 'Operations',
    site: 'Test Site',
    reason: 'Stores validation test',
    lines,
  };
}

function line(
  stockItemId: string,
  quantity = 1,
  spoof?: Partial<any>,
) {
  return {
    stockItemId,
    quantity,
    itemCode: spoof?.itemCode ?? 'SPOOF-CODE',
    itemName: spoof?.itemName ?? 'Spoofed Browser Name',
    unitOfMeasure: spoof?.unitOfMeasure ?? 'BAD-UOM',
    unitCost: spoof?.unitCost ?? 0.01,
  };
}

async function expectPass(
  name: string,
  body: any,
  expectedControlType: 'CONSUMABLE' | 'NON_CONSUMABLE',
) {
  const beforeCreate = createCount;

  const result = await service.createRequisition(body);

  if (createCount !== beforeCreate + 1) {
    throw new Error(`${name}: requisition was not created.`);
  }

  if (result.inventoryControlType !== expectedControlType) {
    throw new Error(
      `${name}: expected ${expectedControlType}, got ${String(
        result.inventoryControlType,
      )}.`,
    );
  }

  return result;
}

async function expectBlocked(
  name: string,
  body: any,
  expectedText: string,
) {
  const beforeCreate = createCount;
  const beforeWorkflow = workflowCount;

  try {
    await service.createRequisition(body);

    throw new Error(`${name}: request unexpectedly passed.`);
  } catch (error: any) {
    const message = String(error?.message ?? error);

    if (!message.includes(expectedText)) {
      throw new Error(
        `${name}: blocked with unexpected message: ${message}`,
      );
    }
  }

  if (createCount !== beforeCreate) {
    throw new Error(`${name}: database create was called despite the blocker.`);
  }

  if (workflowCount !== beforeWorkflow) {
    throw new Error(`${name}: approval workflow started despite the blocker.`);
  }
}

async function main() {
  console.log('');
  console.log('STORES REQUISITION CONTROL TESTS');
  console.log('');

  const consumable = await expectPass(
    'Consumable-only request',
    baseBody([
      line('con-001', 2),
      line('con-002', 3),
    ]),
    'CONSUMABLE',
  );

  console.log(
    'PASS 1 - Consumable + Consumable accepted:',
    consumable.inventoryControlType,
  );

  const nonConsumable = await expectPass(
    'Non-consumable-only request',
    baseBody([
      line('non-001', 1),
      line('non-002', 1),
    ]),
    'NON_CONSUMABLE',
  );

  console.log(
    'PASS 2 - Non-Consumable + Non-Consumable accepted:',
    nonConsumable.inventoryControlType,
  );

  await expectBlocked(
    'Mixed request',
    baseBody([
      line('con-001', 1),
      line('non-001', 1),
    ]),
    'Consumable and non-consumable stock cannot be raised on the same Stores Requisition',
  );

  console.log(
    'PASS 3 - Consumable + Non-Consumable correctly blocked before DB create/workflow.',
  );

  const spoofed = await expectPass(
    'Browser spoof test',
    baseBody([
      line('non-001', 2, {
        itemCode: 'PPE-GLOVES',
        itemName: 'Safety Gloves',
        unitOfMeasure: 'BOX',
        unitCost: 1,
      }),
    ]),
    'NON_CONSUMABLE',
  );

  const savedLine = spoofed.requisition.payload.lines[0];

  if (
    savedLine.itemCode !== 'TEST-NON-001' ||
    savedLine.itemName !== 'Allen Keys' ||
    savedLine.unitOfMeasure !== 'SET' ||
    savedLine.unitCost !== '150'
  ) {
    throw new Error(
      `Browser spoof test failed. Saved line: ${JSON.stringify(savedLine)}`,
    );
  }

  console.log(
    'PASS 4 - Browser-supplied code/name/UOM/cost ignored; catalogue values used.',
  );

  await expectBlocked(
    'Duplicate item test',
    baseBody([
      line('con-001', 1),
      line('con-001', 2),
    ]),
    'has been added more than once',
  );

  console.log(
    'PASS 5 - Duplicate catalogue item correctly blocked.',
  );

  console.log('');
  console.table({
    createCalls: createCount,
    approvalWorkflowCalls: workflowCount,
    updateCalls: updateCount,
  });

  console.log('');
  console.log('ALL STORES REQUISITION CONTROL TESTS PASSED');
  console.log(
    'No database or external approval system was used; the test runs entirely with in-memory mocks.',
  );
}

main().catch((error) => {
  console.error('');
  console.error('STORES REQUISITION CONTROL TEST FAILED');
  console.error(error);
  process.exit(1);
});
