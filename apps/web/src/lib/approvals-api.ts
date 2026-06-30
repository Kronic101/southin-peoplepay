const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  let body: any = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new Error(body?.message || body?.error || `Request failed with status ${response.status}`);
  }

  return body as T;
}

export type ApprovalMatrixRuleRecord = {
  id: string;
  module: string;
  workflowType: string;
  name: string;
  description?: string | null;
  site?: string | null;
  branch?: string | null;
  minAmount?: string | number | null;
  maxAmount?: string | number | null;
  requiresFinance: boolean;
  requiresDirector: boolean;
  approvalSteps: any;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ApprovalUserRecord = {
  id: string;
  email?: string | null;
  displayName: string;
  microsoftUserId?: string | null;
  isActive: boolean;
  roles?: {
    role?: {
      name: string;
    };
  }[];
};

export const getApprovalMatrixRules = () =>
  request<ApprovalMatrixRuleRecord[]>('/approvals/matrix');

export const getApprovalMatrixOptions = () =>
  request<{
    modules: string[];
    workflowTypes: string[];
    approvalRoles: string[];
  }>('/approvals/matrix/options');

export const createApprovalMatrixRule = (payload: any) =>
  request<ApprovalMatrixRuleRecord>('/approvals/matrix', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateApprovalMatrixRule = (id: string, payload: any) =>
  request<ApprovalMatrixRuleRecord>(`/approvals/matrix/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const toggleApprovalMatrixRule = (id: string) =>
  request<ApprovalMatrixRuleRecord>(`/approvals/matrix/${id}/toggle`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });

export const seedApprovalMatrixDefaults = () =>
  request<any>('/approvals/matrix/seed-defaults', {
    method: 'POST',
    body: JSON.stringify({}),
  });

export const getApprovalUsers = () => request<ApprovalUserRecord[]>('/approvals/users');

export const upsertApprovalUser = (payload: any) =>
  request<ApprovalUserRecord>('/approvals/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export type ApprovalApproverAssignmentRecord = {
  id: string;
  module?: string | null;
  workflowType?: string | null;
  approvalRole: string;
  site?: string | null;
  branch?: string | null;
  departmentId?: string | null;
  assigneeType: string;
  userEmail?: string | null;
  userName?: string | null;
  microsoftUserId?: string | null;
  entraGroupId?: string | null;
  entraGroupName?: string | null;
  isPrimary: boolean;
  isDefault: boolean;
  priority: number;
  isActive: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
};

export type ApprovalDelegationRecord = {
  id: string;
  approvalRole?: string | null;
  module?: string | null;
  workflowType?: string | null;
  site?: string | null;
  branch?: string | null;
  departmentId?: string | null;
  fromUserEmail: string;
  fromUserName?: string | null;
  toUserEmail: string;
  toUserName?: string | null;
  reason?: string | null;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

export const getApprovalAssignments = () =>
  request<ApprovalApproverAssignmentRecord[]>('/approvals/assignments');

export const createApprovalAssignment = (payload: any) =>
  request<ApprovalApproverAssignmentRecord>('/approvals/assignments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateApprovalAssignment = (id: string, payload: any) =>
  request<ApprovalApproverAssignmentRecord>(`/approvals/assignments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const toggleApprovalAssignment = (id: string) =>
  request<ApprovalApproverAssignmentRecord>(`/approvals/assignments/${id}/toggle`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });

export const getApprovalDelegations = () =>
  request<ApprovalDelegationRecord[]>('/approvals/delegations');

export const createApprovalDelegation = (payload: any) =>
  request<ApprovalDelegationRecord>('/approvals/delegations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateApprovalDelegation = (id: string, payload: any) =>
  request<ApprovalDelegationRecord>(`/approvals/delegations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const toggleApprovalDelegation = (id: string) =>
  request<ApprovalDelegationRecord>(`/approvals/delegations/${id}/toggle`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });

export const resolveApprovalApprover = (payload: any) =>
  request<any>('/approvals/resolve', {
    method: 'POST',
    body: JSON.stringify(payload),
  });