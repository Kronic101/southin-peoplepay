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