import {
  ProcurementOrigin,
  ProcurementRequestStatus,
  ProcurementRequestType,
  Prisma,
} from '@prisma/client';

import { StoresService } from '../src/stores/stores.service';

let createdRecords: any[] = [];
let approvalCalls = 0;

const fakePrisma: any = {
  procurementRequest: {
    count: async () => createdRecords.length,

    findFirst: async ({ where }: any) => {
      return (
        createdRecords.find(
          (record) =>
            record.sourceStoresRequisitionId ===
              where.sourceStoresRequisitionId &&
            record.origin === where.origin &&
            record.requestType === where.requestType &&
            ![
              ProcurementRequestStatus.REJECTED,
              ProcurementRequestStatus.CLOSED,
            ].includes(record.status),
        ) || null
      );
    },

    create: async ({ data }: any) => {
      const record = {
        id: `pr-${createdRecords.length + 1}`,
        ...data,
        lines: data.lines?.create || [],
        approvalRequestId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      createdRecords.push(record);
      return record;
    },

    update: async ({ where, data }: any) => {
      const record = createdRecords.find((item) => item.id === where.id);

      if (!record) {
        throw new Error('Mock procurement record not found.');
      }

      Object.assign(record, data);
      return record;
    },
  },
};

const fakeApprovalWorkflowService: any = {
  startWorkflowSafe: async (input: any) => {
    approvalCalls += 1;

    return {
      status: 'PENDING_APPROVAL',
      approvalRequest: {
        id: `approval-${approvalCalls}`,
      },
      input,
    };
  },
};

const fakeAssetsService: any = {};
const fakeDocumentsService: any = {
  createStoresIssueDocketDocument: async () => null,
};

const service = new StoresService(
  fakePrisma,
  fakeApprovalWorkflowService,
  fakeAssetsService,
  fakeDocumentsService,
);

const approvedRequisition = {
  id: 'stores-req-1',
  requisitionNo: 'STR-REQ-2026-00001',
  status: 'APPROVED',
  requestedBy: 'Original Requester',
  requestedByEmail: 'requester@southincon.com',
  department: 'Operations',
  site: 'Kansanshi',
  branch: 'KMDC',
  currency: 'ZMW',
  submittedAt: new Date('2026-10-15T06:00:00Z'),
  createdAt: new Date('2026-10-15T06:00:00Z'),
};

let operations: any = {
  requisition: approvedRequisition,
  inventoryControlType: 'CONSUMABLE',
  lines: [
    {
      stockItemId: 'stock-1',
      itemCode: 'SCL/PPE/0001',
      itemName: 'Safety Gloves',
      description: 'General purpose gloves',
      category: 'PPE',
      inventoryControlType: 'CONSUMABLE',
      requestedQuantity: 20,
      issuedQuantity: 8,
      availableQuantity: 7,
      shortfallQuantity: 5,
      unitOfMeasure: 'PAIR',
      standardCost: 25,
    },
  ],
};

(service as any).getRequisitionOperations = async () => operations;

async function expectBlocked(
  name: string,
  action: () => Promise<any>,
  expectedText: string,
) {
  const before = createdRecords.length;

  try {
    await action();
    throw new Error(`${name}: unexpectedly passed.`);
  } catch (error: any) {
    const message = String(error?.message || error);

    if (!message.includes(expectedText)) {
      throw new Error(
        `${name}: unexpected error: ${message}`,
      );
    }
  }

  if (createdRecords.length !== before) {
    throw new Error(
      `${name}: procurement record was created despite the blocker.`,
    );
  }
}

async function main() {
  console.log('');
  console.log('STORES SHORTFALL -> PROCUREMENT TESTS');
  console.log('');

  const first = await service.createShortfallProcurementRequest(
    approvedRequisition.id,
    {
      requestedBy: 'Stores Officer',
      requestedByEmail: 'stores@southincon.com',
      requestedByRole: 'STORES_OFFICER',
    },
  );

  if (first.status !== 'CREATED') {
    throw new Error(`Expected CREATED, got ${first.status}.`);
  }

  const pr = first.procurementRequest;

  if (pr.requestType !== ProcurementRequestType.STOCK_REPLENISHMENT) {
    throw new Error('PR requestType is not STOCK_REPLENISHMENT.');
  }

  if (pr.origin !== ProcurementOrigin.STORES_STOCKOUT) {
    throw new Error('PR origin is not STORES_STOCKOUT.');
  }

  if (pr.sourceStoresRequisitionId !== approvedRequisition.id) {
    throw new Error('PR is not linked to the source Stores requisition.');
  }

  if (Number(pr.lines[0].quantity) !== 5) {
    throw new Error(
      `Expected PR quantity 5, got ${String(pr.lines[0].quantity)}.`,
    );
  }

  if (Number(pr.estimatedAmount) !== 125) {
    throw new Error(
      `Expected PR estimated amount 125, got ${String(pr.estimatedAmount)}.`,
    );
  }

  console.log(
    'PASS 1 - Current shortfall creates one STOCK_REPLENISHMENT PR linked to the Stores requisition.',
  );

  const second = await service.createShortfallProcurementRequest(
    approvedRequisition.id,
    {
      requestedBy: 'Stores Officer',
    },
  );

  if (second.status !== 'EXISTING') {
    throw new Error(
      `Expected duplicate guard to return EXISTING, got ${second.status}.`,
    );
  }

  if (createdRecords.length !== 1) {
    throw new Error('Duplicate guard allowed another active PR.');
  }

  console.log(
    'PASS 2 - Duplicate active shortfall PR is blocked and the existing PR is returned.',
  );

  operations = {
    ...operations,
    lines: [
      {
        ...operations.lines[0],
        shortfallQuantity: 0,
      },
    ],
  };

  await expectBlocked(
    'No shortfall',
    () =>
      service.createShortfallProcurementRequest(
        approvedRequisition.id,
        {},
      ),
    'There is no current Stores shortfall',
  );

  console.log(
    'PASS 3 - No current shortfall cannot create a Procurement Request.',
  );

  operations = {
    requisition: {
      ...approvedRequisition,
      status: 'SUBMITTED',
    },
    inventoryControlType: 'CONSUMABLE',
    lines: [
      {
        ...operations.lines[0],
        shortfallQuantity: 5,
      },
    ],
  };

  await expectBlocked(
    'Not approved',
    () =>
      service.createShortfallProcurementRequest(
        approvedRequisition.id,
        {},
      ),
    'only be created after final requisition approval',
  );

  console.log(
    'PASS 4 - Shortfall PR cannot be created before final Stores approval.',
  );

  console.log('');
  console.table({
    procurementRecords: createdRecords.length,
    approvalWorkflowCalls: approvalCalls,
  });

  console.log('');
  console.log(
    'ALL STORES SHORTFALL -> PROCUREMENT TESTS PASSED',
  );
  console.log(
    'No live ProcurementRequest, Supabase balance, or approval record was created.',
  );
}

main().catch((error) => {
  console.error('');
  console.error('STORES SHORTFALL -> PROCUREMENT TEST FAILED');
  console.error(error);
  process.exit(1);
});
