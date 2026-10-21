const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:4000/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    cache: 'no-store',
  });

  let body: any = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new Error(
      body?.message || body?.error || `Request failed with status ${response.status}`,
    );
  }

  return body as T;
}

export type StoresRequisitionLineRecord = {
  id: string;
  requisitionId: string;
  stockItemId?: string | null;
  itemCode?: string | null;
  itemName: string;
  description?: string | null;
  unitOfMeasure: string;
  quantity: string | number;
  unitCost: string | number;
  totalCost: string | number;
  notes?: string | null;
};

export type StoresRequisitionRecord = {
  id: string;
  requisitionNo: string;
  title?: string | null;
  description?: string | null;
  reason?: string | null;
  requestedBy?: string | null;
  requestedByEmail?: string | null;
  requesterRole?: string | null;
  department?: string | null;
  departmentId?: string | null;
  site?: string | null;
  branch?: string | null;
  projectCode?: string | null;
  status: string;
  approvalRequestId?: string | null;
  totalValue: string | number;
  currency: string;
  submittedAt?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectedBy?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  lines?: StoresRequisitionLineRecord[];
  createdAt?: string;
  updatedAt?: string;
};

export type CreateStoresRequisitionPayload = {
  requestedBy: string;
  requestedByEmail?: string | null;
  department: string;
  site: string;
  branch?: string | null;
  projectCode?: string | null;
  reason: string;
  description?: string | null;
  lines: {
    stockItemId?: string | null;
    itemCode?: string | null;
    itemName: string;
    description?: string | null;
    quantity: string | number;
    unitCost: string | number;
    unitOfMeasure: string;
    notes?: string | null;
  }[];
};

export const getStoresRequisitions = () =>
  request<StoresRequisitionRecord[]>('/stores/requisitions');

export const getStoresRequisition = (id: string) =>
  request<StoresRequisitionRecord>(`/stores/requisitions/${id}`);

export const createStoresRequisition = (payload: CreateStoresRequisitionPayload) =>
  request<{
    requisition: StoresRequisitionRecord;
    approvalWorkflow?: any;
  }>('/stores/requisitions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateStoresRequisitionStatus = (id: string, payload: any) =>
  request<StoresRequisitionRecord>(`/stores/requisitions/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });


/* -------------------------------------------------------------------------- */
/* Stores operations / controlled issuing                                     */
/* -------------------------------------------------------------------------- */

export type StoresAvailabilityStatus =
  | 'PENDING_CHECK'
  | 'IN_STOCK'
  | 'PARTIALLY_AVAILABLE'
  | 'NOT_IN_STOCK'
  | 'ISSUED';

export type StockAssignmentPolicy =
  | 'NONE'
  | 'EMPLOYEE'
  | 'SITE'
  | 'DEPARTMENT'
  | 'PROJECT'
  | 'DEPLOYMENT'
  | 'FLEXIBLE';

export type StoresIssueAssignmentType =
  | 'EMPLOYEE'
  | 'SITE'
  | 'DEPARTMENT'
  | 'PROJECT';

export type StoresIssueAssignment =
  | {
      type: 'EMPLOYEE';
      employeeId: string;
      referenceId?: never;
    }
  | {
      type: 'SITE';
      referenceId: string;
      employeeId?: never;
    }
  | {
      type: 'DEPARTMENT';
      referenceId: string;
      employeeId?: never;
    }
  | {
      type: 'PROJECT';
      referenceId: string;
      employeeId?: never;
    };

export type StoresOperationLocation = {
  balanceId: string;
  locationId: string;
  locationCode?: string | null;
  locationName?: string | null;
  locationType?: string | null;
  site?: string | null;
  branch?: string | null;
  quantityOnHand: number;
};

export type StoresOperationLine = {
  lineId: string;

  stockItemId?: string | null;
  itemCode?: string | null;
  itemName: string;
  description?: string | null;

  unitOfMeasure: string;

  requestedQuantity: number;
  issuedQuantity: number;
  remainingQuantity: number;

  requestedSiteAvailable?: number;
  otherStoresAvailable?: number;

  availableQuantity: number;
  issuePossible: number;

  transferRequiredQuantity?: number;
  shortfallQuantity: number;

  recommendedAction?: string | null;

  availabilityStatus: StoresAvailabilityStatus;

  inventoryControlType?:
    | 'CONSUMABLE'
    | 'NON_CONSUMABLE'
    | null;

  assignmentPolicy:
    StockAssignmentPolicy;

  itemType?: string | null;
  category?: string | null;

  standardCost: number;

  assetRegistrationRequired: boolean;
  custodyTrackingRequired: boolean;

  isSerialized: boolean;
  isQrTracked: boolean;
  isRfidTracked: boolean;

  stockItemActive: boolean;

  locations: StoresOperationLocation[];
};

export type StoresPostedMovement = {
  id: string;
  movementNo: string;
  status: string;

  fromLocationId?: string | null;

  fromLocation?: {
    id?: string;
    locationCode?: string | null;
    locationName?: string | null;
  } | null;

  postedBy?: string | null;
  postedAt?: string | null;

  lines: Array<{
    id: string;
    stockItemId: string;

    itemCode?: string | null;
    itemName?: string | null;

    quantity: number;
    unitCost: number;
  }>;
};

export type StoresCustodyAssignmentRecord = {
  id: string;
  assignmentNo: string;

  assetId?: string | null;
  stockItemId?: string | null;
  qrTagId?: string | null;
  locationId?: string | null;

  quantity?: string | number;

  stockMovementId?: string | null;
  stockMovementLineId?: string | null;
  storesRequisitionId?: string | null;

  assignedToType: StoresIssueAssignmentType;
  assignedToReferenceId?: string | null;

  assignedToName: string;
  assignedToEmail?: string | null;

  employeeId?: string | null;
  employeeNumber?: string | null;

  department?: string | null;
  site?: string | null;
  branch?: string | null;

  assignedBy?: string | null;
  assignedAt?: string | null;

  expectedReturnAt?: string | null;

  returnedBy?: string | null;
  returnedAt?: string | null;

  status: string;

  conditionOut?: string | null;
  conditionIn?: string | null;

  notes?: string | null;

  createdAt?: string;
  updatedAt?: string;
};

export type StoresRequisitionOperations = {
  requisition: StoresRequisitionRecord;

  inventoryControlType?:
    | 'CONSUMABLE'
    | 'NON_CONSUMABLE'
    | null;

  availabilityStatus:
    StoresAvailabilityStatus;

  lines:
    StoresOperationLine[];

  movements:
    StoresPostedMovement[];
};

export type IssueStoresRequisitionPayload = {
  fromLocationId: string;

  issuedBy: string;
  issuedByEmail?: string | null;

  notes?: string | null;

  lines: Array<{
    stockItemId: string;
    quantity: number;

    notes?: string | null;

    assignment?:
      | StoresIssueAssignment
      | null;
  }>;

  /*
   * Temporary compatibility only.
   *
   * The current page still references these
   * fields. We will remove them completely in
   * the next UI change.
   */
  issuedToName?: string | null;
  issuedToEmployeeNumber?: string | null;
};

export type IssueStoresRequisitionResponse = {
  requisitionId: string;
  requisitionNo: string;

  movement:
    StoresPostedMovement;

  custodyAssignments?:
    StoresCustodyAssignmentRecord[];

  custodyWarning?:
    string | null;

  availabilityStatus:
    StoresAvailabilityStatus;

  lines:
    StoresOperationLine[];

  docketDocument?: any;

  documentWarning?:
    string | null;
};

export const getStoresRequisitionOperations = (
  id: string,
) =>
  request<StoresRequisitionOperations>(
    `/stores/requisitions/${id}/operations`,
  );

export const issueStoresRequisition = (
  id: string,
  payload: IssueStoresRequisitionPayload,
) =>
  request<IssueStoresRequisitionResponse>(
    `/stores/requisitions/${id}/issue`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );

  export type StoresShortfallProcurementResult = {
  status:
    | 'CREATED'
    | 'EXISTING';

  procurementRequest:
    any;

  approvalWorkflow?:
    any;

  message:
    string;
};

export const createStoresShortfallProcurementRequest = (
  id: string,
  payload: {
    requestedBy?: string;
    requestedByEmail?: string | null;
    requestedByRole?: string;
    stockItemIds?: string[];
  } = {},
) =>
  request<StoresShortfallProcurementResult>(
    `/stores/requisitions/${id}/create-shortfall-pr`,
    {
      method:
        'POST',

      body:
        JSON.stringify(
          payload,
        ),
    },
  );

  export type StoresSiteOption = {
    id: string;
    name: string;
    code?: string | null;
    isActive: boolean;
  };

  export const getStoresSites = () =>
    request<StoresSiteOption[]>(
      '/stores/sites',
    );
