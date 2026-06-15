import { withDevRoleHeaders } from './dev-role';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export type Employee = {
  id: string;
  employeeNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  gender?: string | null;
  nrcNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  status: string;
  createdAt: string;
  department?: { name: string } | null;
  jobTitle?: { name: string } | null;
  site?: { name: string } | null;
  employmentType?: { name: string } | null;
  portalAccount?: {
    id: string;
    isActive: boolean;
    mustChangePin: boolean;
    lastLoginAt?: string | null;
  } | null;
};

type JsonBody = Record<string, unknown> | any;

async function readApiError(res: Response, fallback: string): Promise<never> {
  let errorBody: any = null;

  try {
    errorBody = await res.json();
  } catch {
    try {
      const text = await res.text();
      throw new Error(text || fallback);
    } catch {
      throw new Error(fallback);
    }
  }

  if (typeof errorBody?.message === 'string') {
    throw new Error(errorBody.message);
  }

  if (Array.isArray(errorBody?.message)) {
    throw new Error(errorBody.message.join(', '));
  }

  if (typeof errorBody?.error === 'string') {
    throw new Error(errorBody.error);
  }

  throw new Error(fallback);
}

function jsonHeaders(): HeadersInit {
  return withDevRoleHeaders({
    'Content-Type': 'application/json',
  });
}

function roleHeaders(): HeadersInit {
  return withDevRoleHeaders();
}

function getSelectedDevActorName() {
  if (typeof window === 'undefined') {
    return 'system-dev';
  }

  const role = window.localStorage.getItem('southin_peoplepay_dev_role') || 'ADMIN';

  const actorByRole: Record<string, string> = {
    ADMIN: 'admin-dev',
    PAYROLL_OFFICER: 'payroll-officer-dev',
    HR_MANAGER: 'hr-manager-dev',
    FINANCE_MANAGER: 'finance-manager-dev',
    DIRECTOR: 'director-dev',
    EMPLOYEE: 'employee-dev',
  };

  return actorByRole[role] || 'system-dev';
}

async function apiGet<T = any>(path: string, fallback: string, protectedRoute = false): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: protectedRoute ? roleHeaders() : undefined,
    cache: 'no-store',
  });

  if (!res.ok) {
    await readApiError(res, fallback);
  }

  return res.json();
}

async function apiPost<T = any>(
  path: string,
  payload?: JsonBody,
  fallback = 'Request failed',
  protectedRoute = true,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: protectedRoute ? jsonHeaders() : { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });

  if (!res.ok) {
    await readApiError(res, fallback);
  }

  return res.json();
}

async function apiPatch<T = any>(
  path: string,
  payload?: JsonBody,
  fallback = 'Request failed',
  protectedRoute = true,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: protectedRoute ? jsonHeaders() : { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
    cache: 'no-store',
  });

  if (!res.ok) {
    await readApiError(res, fallback);
  }

  return res.json();
}

/* -------------------------------------------------------------------------- */
/* Employees                                                                  */
/* -------------------------------------------------------------------------- */

export async function getEmployees(): Promise<Employee[]> {
  return apiGet<Employee[]>('/employees', 'Failed to load employees', true);
}

export async function getEmployee(id: string) {
  return apiGet(`/employees/${id}`, 'Failed to load employee', true);
}

export async function createEmployee(payload: {
  firstName: string;
  middleName?: string;
  lastName: string;
  gender?: string;
  nrcNumber?: string;
  email?: string;
  phone?: string;
  startDate?: string;
}) {
  return apiPost('/employees', payload, 'Failed to create employee', true);
}


export async function updateEmployee(id: string, payload: Record<string, unknown>) {
  return apiPatch(`/employees/${id}`, payload, 'Failed to update employee', true);
}

export async function getEmployeeSetupLookups() {
  return apiGet('/employees/lookups/setup', 'Failed to load setup lookups', true);
}

export async function createPortalAccount(employeeId: string) {
  return apiPost(
    `/employees/${employeeId}/portal-account`,
    {},
    'Failed to create portal account',
    true,
  );
}

export async function updateEmployeeStatutoryDetails(
  id: string,
  payload: Record<string, unknown>,
) {
  return apiPost(
    `/employees/${id}/statutory-details`,
    payload,
    'Failed to update employee statutory details',
    true,
  );
}


export async function addEmployeeBankAccount(id: string, payload: Record<string, unknown>) {
  return apiPost(
    `/employees/${id}/bank-accounts`,
    payload,
    'Failed to add employee bank account',
    true,
  );
}

export async function approveEmployeeBankAccount(
  employeeId: string,
  bankAccountId: string,
  payload?: Record<string, unknown>,
) {
  return apiPost(
    `/employees/${employeeId}/bank-accounts/${bankAccountId}/approve`,
    payload || {
      approvedBy: getSelectedDevActorName(),
    },
    'Failed to approve employee bank account',
    true,
  );
}

export async function approveEmployeeServiceCondition(
  employeeId: string,
  conditionId: string,
  payload: Record<string, unknown> = {},
) {
  return apiPost(
    `/employees/${employeeId}/service-conditions/${conditionId}/approve`,
    {
      approvedBy: 'hr-manager-dev',
      ...payload,
    },
    'Failed to approve employee condition of service',
    true,
  );
}

export async function approveServiceCondition(
  employeeId: string,
  conditionId: string,
  payload: Record<string, unknown> = {},
) {
  return approveEmployeeServiceCondition(employeeId, conditionId, payload);
}

export async function createEmployeeBankAccount(employeeId: string, payload: Record<string, unknown>) {
  return apiPost(
    `/employees/${employeeId}/bank-accounts`,
    payload,
    'Failed to create employee bank account',
    true,
  );
}

export async function createEmployeeContract(employeeId: string, payload: Record<string, unknown>) {
  return apiPost(
    `/employees/${employeeId}/contracts`,
    payload,
    'Failed to create employee contract',
    true,
  );
}

export async function assignEmployeeServiceCondition(
  employeeId: string,
  payload: Record<string, unknown>,
) {
  return apiPost(
    `/employees/${employeeId}/service-conditions`,
    payload,
    'Failed to assign employee condition of service',
    true,
  );
}

export async function validateEmployeeBankDetails(employeeId: string, input: any) {
  return apiPost(
    `/employees/${employeeId}/validate-bank-details`,
    {
      reviewedBy: input?.reviewedBy || getSelectedDevActorName(),
      notes: input?.notes || 'Employee bank details validated from PeoplePay.',
    },
    'Failed to validate employee bank details',
    true,
  );
}

export async function getEmployeeBankAuditHistory(employeeId: string) {
  return apiGet(
    `/employees/${employeeId}/bank-audit-history`,
    'Failed to load employee bank audit history',
    true,
  );
}

/* -------------------------------------------------------------------------- */
/* Employee portal auth                                                       */
/* -------------------------------------------------------------------------- */

export async function employeeLogin(payload: { employeeNumber: string; pin: string }) {
  return apiPost('/auth/employee/login', payload, 'Invalid employee number or PIN', false);
}

export async function employeeChangePin(payload: {
  employeeNumber: string;
  currentPin: string;
  newPin: string;
}) {
  return apiPost('/auth/employee/change-pin', payload, 'Failed to change PIN', false);
}

export async function employeeForgotPin(payload: { employeeNumber: string }) {
  return apiPost('/auth/employee/forgot-pin', payload, 'Failed to request PIN reset', false);
}

export async function requestEmployeePinReset(payload: {
  employeeNumber: string;
  email?: string;
}) {
  return apiPost('/auth/employee/forgot-pin', payload, 'Failed to request PIN reset', false);
}

export async function getEmployeeMe(token: string) {
  const res = await fetch(`${API_URL}/auth/employee/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    await readApiError(res, 'Failed to load employee profile');
  }

  return res.json();
}

export async function getEmployeePayslips(token: string) {
  const res = await fetch(`${API_URL}/auth/employee/payslips`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    await readApiError(res, 'Failed to load employee payslips');
  }

  return res.json();
}

export async function getEmployeePayslip(id: string, token: string) {
  const res = await fetch(`${API_URL}/auth/employee/payslips/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    await readApiError(res, 'Failed to load employee payslip');
  }

  return res.json();
}

/* -------------------------------------------------------------------------- */
/* Payroll periods and runs                                                   */
/* -------------------------------------------------------------------------- */

export async function getPayrollDashboard() {
  const [dashboard, readyEmployees] = await Promise.all([
    apiGet('/executive/dashboard', 'Failed to load executive payroll dashboard.', true),
    apiGet('/payroll/ready-employees', 'Failed to load payroll-ready employees.', true),
  ]);

  return {
    summary: {
      payrollPeriods: dashboard?.summary?.payrollPeriods ?? 0,
      openPayrollPeriods:
        dashboard?.payrollPeriods?.filter((period: any) => period.status === 'OPEN')?.length ?? 0,
      payrollReadyEmployees:
        readyEmployees?.totalReturned ??
        readyEmployees?.employees?.length ??
        readyEmployees?.length ??
        0,
      payrollRuns: dashboard?.summary?.payrollRuns ?? 0,
    },
    payrollPeriods: dashboard?.payrollPeriods || [],
    payrollReadyEmployees: readyEmployees?.employees || readyEmployees || [],
    payrollRuns: dashboard?.recentPayrollRuns || [],
  };
}

export async function getPayrollPeriods() {
  return apiGet('/payroll/periods', 'Failed to load payroll periods', true);
}

export async function createPayrollPeriod(payload: {
  periodName: string;
  startDate: string;
  endDate: string;
  payDate?: string | null;
  status?: string;
}) {
  return apiPost('/payroll/periods', payload, 'Failed to create payroll period', true);
}

export async function getPayrollRuns() {
  return apiGet('/payroll/runs', 'Failed to load payroll runs', true);
}

export async function getPayrollRun(id: string) {
  return apiGet(`/payroll/runs/${id}`, 'Failed to load payroll run', true);
}

export async function createPayrollRun(input: any) {
  return apiPost('/payroll/runs', input, 'Failed to create payroll run', true);
}

export async function getPayrollReadinessGates() {
  return apiGet('/payroll/readiness-gates', 'Failed to load payroll readiness gates', true);
}

export async function getPayrollReadiness() {
  return getPayrollReadinessGates();
}

export async function getPayrollReadyEmployees() {
  return apiGet('/payroll/ready-employees', 'Failed to load payroll-ready employees', true);
}

export async function getPayrollRunCreationReadiness() {
  return apiGet(
    '/payroll/run-creation-readiness',
    'Failed to load payroll run creation readiness',
    true,
  );
}

export async function updatePayrollLineGrossPay(
  runId: string,
  lineId: string,
  payload: {
    grossPay: number;
    description?: string;
  },
) {
  return apiPost(
    `/payroll/runs/${runId}/employees/${lineId}/gross-pay`,
    payload,
    'Failed to update payroll line gross pay',
    true,
  );
}

export async function calculatePayrollLineStatutory(runId: string, lineId: string) {
  return apiPost(
    `/payroll/runs/${runId}/employees/${lineId}/calculate-statutory`,
    {},
    'Failed to calculate statutory deductions',
    true,
  );
}

export async function submitPayrollRunToHr(
  id: string,
  payload?: { actorId?: string; comments?: string },
) {
  return apiPost(
    `/payroll/runs/${id}/submit-hr`,
    {
      actorId: payload?.actorId || getSelectedDevActorName(),
      comments: payload?.comments || 'Submitted to HR review.',
    },
    'Failed to submit payroll to HR',
    true,
  );
}

export async function hrReviewPayrollRun(
  id: string,
  payload: { actorId?: string; approved: boolean; comments?: string },
) {
  return apiPost(
    `/payroll/runs/${id}/hr-review`,
    {
      actorId: payload?.actorId || getSelectedDevActorName(),
      approved: payload.approved,
      comments: payload?.comments || 'HR review completed.',
    },
    'Failed to complete HR review',
    true,
  );
}

export async function submitPayrollRunToFinance(
  id: string,
  payload?: { actorId?: string; comments?: string },
) {
  return apiPost(
    `/payroll/runs/${id}/submit-finance`,
    {
      actorId: payload?.actorId || getSelectedDevActorName(),
      comments: payload?.comments || 'Submitted to Finance review.',
    },
    'Failed to submit payroll to Finance',
    true,
  );
}

export async function financeReviewPayrollRun(
  id: string,
  payload: { actorId?: string; approved: boolean; comments?: string },
) {
  return apiPost(
    `/payroll/runs/${id}/finance-review`,
    {
      actorId: payload?.actorId || getSelectedDevActorName(),
      approved: payload.approved,
      comments: payload?.comments || 'Finance review completed.',
    },
    'Failed to complete Finance review',
    true,
  );
}

export async function submitPayrollRunToDirector(
  id: string,
  payload?: { actorId?: string; comments?: string },
) {
  return apiPost(
    `/payroll/runs/${id}/submit-director`,
    {
      actorId: payload?.actorId || getSelectedDevActorName(),
      comments: payload?.comments || 'Submitted to Director approval.',
    },
    'Failed to submit payroll to Director',
    true,
  );
}

export async function directorApprovePayrollRun(
  id: string,
  payload: { actorId?: string; approved: boolean; comments?: string },
) {
  return apiPost(
    `/payroll/runs/${id}/director-approve`,
    {
      actorId: payload?.actorId || getSelectedDevActorName(),
      approved: payload.approved,
      comments: payload?.comments || 'Director approval completed.',
    },
    'Failed to complete Director approval',
    true,
  );
}

export async function lockPayrollRun(
  id: string,
  payload?: { actorId?: string; comments?: string },
) {
  return apiPost(
    `/payroll/runs/${id}/lock`,
    {
      actorId: payload?.actorId || getSelectedDevActorName(),
      comments: payload?.comments || 'Payroll run locked.',
    },
    'Failed to lock payroll run',
    true,
  );
}

export async function generatePayslipsForRun(
  id: string,
  payload?: {
    actorId?: string;
    comments?: string;
  },
) {
  return apiPost(
    `/payroll/runs/${id}/generate-payslips`,
    {
      actorId: payload?.actorId || getSelectedDevActorName(),
      comments: payload?.comments || 'Payslips generated.',
    },
    'Failed to generate payslips',
    true,
  );
}

/* -------------------------------------------------------------------------- */
/* Statutory                                                                  */
/* -------------------------------------------------------------------------- */

export async function getStatutorySettings() {
  return apiGet('/statutory/settings', 'Failed to load statutory settings', true);
}

export async function createTaxYear(payload: {
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}) {
  return apiPost('/statutory/tax-years', payload, 'Failed to create tax year', true);
}

export async function createPayeBand(payload: {
  taxYearId: string;
  lowerBound: number;
  upperBound?: number | null;
  rate: number;
}) {
  return apiPost('/statutory/paye-bands', payload, 'Failed to create PAYE band', true);
}

export async function updatePayeBand(
  id: string,
  payload: {
    lowerBound?: number;
    upperBound?: number | null;
    rate?: number;
  },
) {
  return apiPatch(`/statutory/paye-bands/${id}`, payload, 'Failed to update PAYE band', true);
}

export async function createNapsaRate(payload: {
  name: string;
  employeeRate: number;
  employerRate: number;
  monthlyCeiling?: number | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
}) {
  return apiPost('/statutory/napsa-rates', payload, 'Failed to create NAPSA rate', true);
}

export async function updateNapsaRate(
  id: string,
  payload: {
    name?: string;
    employeeRate?: number;
    employerRate?: number;
    monthlyCeiling?: number | null;
    effectiveFrom?: string;
    effectiveTo?: string | null;
  },
) {
  return apiPatch(`/statutory/napsa-rates/${id}`, payload, 'Failed to update NAPSA rate', true);
}

export async function approveNapsaRate(id: string) {
  return apiPost(`/statutory/napsa-rates/${id}/approve`, {}, 'Failed to approve NAPSA rate', true);
}

export async function createNhimaRate(payload: {
  name: string;
  employeeRate: number;
  employerRate: number;
  calculationBase: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
}) {
  return apiPost('/statutory/nhima-rates', payload, 'Failed to create NHIMA rate', true);
}

export async function updateNhimaRate(
  id: string,
  payload: {
    name?: string;
    employeeRate?: number;
    employerRate?: number;
    calculationBase?: string;
    effectiveFrom?: string;
    effectiveTo?: string | null;
  },
) {
  return apiPatch(`/statutory/nhima-rates/${id}`, payload, 'Failed to update NHIMA rate', true);
}

export async function approveNhimaRate(id: string) {
  return apiPost(`/statutory/nhima-rates/${id}/approve`, {}, 'Failed to approve NHIMA rate', true);
}

export async function createSdlRate(payload: {
  name: string;
  employerRate: number;
  calculationBase: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
}) {
  return apiPost('/statutory/sdl-rates', payload, 'Failed to create SDL rate', true);
}

export async function updateSdlRate(
  id: string,
  payload: {
    name?: string;
    employerRate?: number;
    calculationBase?: string;
    effectiveFrom?: string;
    effectiveTo?: string | null;
  },
) {
  return apiPatch(`/statutory/sdl-rates/${id}`, payload, 'Failed to update SDL rate', true);
}

export async function approveSdlRate(id: string) {
  return apiPost(`/statutory/sdl-rates/${id}/approve`, {}, 'Failed to approve SDL rate', true);
}

/* -------------------------------------------------------------------------- */
/* Executive / reports                                                        */
/* -------------------------------------------------------------------------- */

export async function getExecutiveDashboard() {
  return apiGet('/executive/dashboard', 'Failed to load executive dashboard', true);
}

export async function getExecutiveSharePointFeed() {
  return apiGet('/executive/sharepoint-feed', 'Failed to load SharePoint executive feed', true);
}

export async function getPayrollAudit(runId?: string) {
  const query = runId ? `?runId=${encodeURIComponent(runId)}` : '';
  return apiGet(`/executive/payroll-audit${query}`, 'Failed to load payroll audit', true);
}

export function getPayrollAuditCsvUrl(runId?: string) {
  return runId
    ? `${API_URL}/executive/payroll-audit.csv?runId=${encodeURIComponent(runId)}`
    : `${API_URL}/executive/payroll-audit.csv`;
}

/* -------------------------------------------------------------------------- */
/* SharePoint                                                                 */
/* -------------------------------------------------------------------------- */

export async function getSharePointExportPackage() {
  return apiGet(
    '/executive/sharepoint/export-package',
    'Failed to load SharePoint export package',
    true,
  );
}

export async function getExecutivePagePayload() {
  return apiGet(
    '/executive/sharepoint/executive-page-payload',
    'Failed to load executive SharePoint page payload',
    true,
  );
}

export async function getFinanceAuditPayload(runId?: string) {
  const query = runId ? `?runId=${encodeURIComponent(runId)}` : '';
  return apiGet(
    `/executive/sharepoint/finance-audit-payload${query}`,
    'Failed to load finance audit SharePoint payload',
    true,
  );
}

export async function getPublicDashboardPayload() {
  return apiGet(
    '/executive/sharepoint/public-dashboard-payload',
    'Failed to load public dashboard payload',
    true,
  );
}

export async function logSharePointExportRequest(payload: {
  targetSite: string;
  targetPage: string;
  payloadEndpoint: string;
  requestedBy: string;
  notes?: string;
}) {
  return apiPost(
    '/executive/sharepoint/export-dev-log',
    payload,
    'Failed to log SharePoint export request',
    true,
  );
}

export async function getSharePointExportLog(id: string) {
  return apiGet(
    `/executive/sharepoint/export-logs/${id}`,
    'Failed to load SharePoint export log',
    true,
  );
}

export async function getSharePointExportLogs() {
  return apiGet('/executive/sharepoint/export-logs', 'Failed to load SharePoint export logs', true);
}

export async function getSharePointGraphStatus() {
  return apiGet('/executive/sharepoint/graph-status', 'Failed to load SharePoint Graph status', true);
}

export async function publishToSharePoint(payload: {
  targetSite: string;
  targetPage?: string;
  targetLibrary?: string;
  payloadEndpoint: string;
  payloadType?: string;
  confidentiality?: string;
  requestedBy?: string;
  notes?: string;
}) {
  return apiPost(
    '/executive/sharepoint/publish',
    {
      ...payload,
      requestedBy: payload.requestedBy || getSelectedDevActorName(),
    },
    'Failed to publish/log SharePoint export request',
    true,
  );
}

export async function getSharePointTargets() {
  return apiGet('/executive/sharepoint/targets', 'Failed to load SharePoint targets', true);
}

export async function validateSharePointTarget(payload: {
  targetKey?: string;
  targetSite: string;
  targetPage?: string;
  targetLibrary?: string;
  payloadEndpoint: string;
}) {
  return apiPost(
    '/executive/sharepoint/validate-target',
    payload,
    'Failed to validate SharePoint target',
    true,
  );
}

export async function getSharePointSetupGuide() {
  return apiGet(
    '/executive/sharepoint/setup-guide',
    'Failed to load SharePoint Graph setup guide',
    true,
  );
}

export async function getSharePointDiscoveryGuide() {
  return apiGet(
    '/executive/sharepoint/discovery-guide',
    'Failed to load SharePoint discovery guide',
    true,
  );
}

export async function getSharePointDiscoveryPreview(input: any) {
  return apiPost(
    '/executive/sharepoint/discovery-preview',
    input,
    'Failed to generate SharePoint discovery preview',
    true,
  );
}

/* -------------------------------------------------------------------------- */
/* Payment batches                                                            */
/* -------------------------------------------------------------------------- */

export async function getPaymentBatches() {
  return apiGet('/payment-batches', 'Failed to load payment batches', true);
}

export async function getPaymentBatch(id: string) {
  return apiGet(`/payment-batches/${id}`, 'Failed to load payment batch', true);
}

export async function createPaymentBatchFromPayrollRun(
  payrollRunId: string,
  payload: {
    batchName?: string;
    preparedBy?: string;
  },
) {
  return apiPost(
    `/payment-batches/from-payroll-run/${payrollRunId}`,
    {
      ...payload,
      preparedBy: payload?.preparedBy || getSelectedDevActorName(),
    },
    'Failed to create payment batch',
    true,
  );
}

export async function recheckPaymentBatchPayslips(batchId: string) {
  return apiPost(
    `/payment-batches/${batchId}/recheck-payslips`,
    {
      checkedBy: getSelectedDevActorName(),
    },
    'Failed to recheck payment batch payslips',
    true,
  );
}

export async function validatePaymentBatchBankDetails(batchId: string) {
  return apiPost(
    `/payment-batches/${batchId}/validate-bank-details`,
    {
      validatedBy: getSelectedDevActorName(),
    },
    'Failed to validate payment batch bank details',
    true,
  );
}

export async function preparePaymentBatch(batchId: string) {
  return apiPost(
    `/payment-batches/${batchId}/prepare`,
    {
      preparedBy: getSelectedDevActorName(),
    },
    'Failed to prepare payment batch',
    true,
  );
}

export async function approvePaymentBatch(batchId: string) {
  return apiPost(
    `/payment-batches/${batchId}/approve`,
    {
      approvedBy: getSelectedDevActorName(),
    },
    'Failed to approve payment batch',
    true,
  );
}

export async function getPaymentBatchEvidence(batchId: string) {
  return apiGet(
    `/payment-batches/${batchId}/evidence`,
    'Failed to load payment batch evidence',
    true,
  );
}

export function getPaymentBatchEvidenceCsvUrl(batchId: string) {
  return `${API_URL}/payment-batches/${batchId}/evidence.csv`;
}

export async function downloadPaymentBatchEvidenceCsv(batchId: string) {
  const res = await fetch(`${API_URL}/payment-batches/${batchId}/evidence.csv`, {
    method: 'GET',
    headers: roleHeaders(),
    cache: 'no-store',
  });

  if (!res.ok) {
    await readApiError(res, 'Failed to download payment batch evidence CSV');
  }

  const blob = await res.blob();

  if (typeof window === 'undefined') {
    return;
  }

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = 'payment-batch-evidence.csv';

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(url);
}

export async function getBankPaymentPreparation(runId?: string) {
  /**
   * Bank Payment Preparation front-end payload builder.
   *
   * This keeps the page working before we create a dedicated backend endpoint.
   * It combines:
   * - latest payroll audit data
   * - existing payment batches
   * - finance readiness controls
   *
   * Later we can replace this with:
   * GET /api/reports/bank-payment-preparation
   */
  const audit = await getPayrollAudit(runId);
  const paymentBatchData = await getPaymentBatches();

  const batches = paymentBatchData?.batches || [];
  const latestBatch = batches[0] || null;

  const payrollRun = audit?.run || latestBatch?.payrollRun || null;
  const items = latestBatch?.items || [];

  return {
    payrollRun,
    paymentBatch: latestBatch,
    batch: latestBatch,
    items,
    readiness: [
      {
        control: 'Payroll locked',
        requiredBeforePayment: 'Payroll must be locked after Director approval.',
        status: payrollRun?.status === 'LOCKED' ? 'READY' : 'TO_CONFIRM',
      },
      {
        control: 'Payslips generated',
        requiredBeforePayment: 'Each payable employee should have a generated payslip.',
        status: items.length > 0 ? 'READY' : 'TO_CONFIRM',
      },
      {
        control: 'Finance audit evidence',
        requiredBeforePayment: 'Payroll audit CSV and approval evidence must be available.',
        status: audit?.run ? 'TO_CONFIRM' : 'MISSING',
      },
      {
        control: 'Bank account validation',
        requiredBeforePayment: 'Employee bank details must be validated by Finance.',
        status: 'MANUAL_STEP',
      },
      {
        control: 'Payment authorisation',
        requiredBeforePayment: 'Payment file must be approved by authorised Finance/Director signatories.',
        status: latestBatch?.status === 'APPROVED' ? 'READY' : 'MANUAL_STEP',
      },
    ],
    evidenceChecklist: [
      {
        evidenceRequired: 'Payroll audit CSV',
        storageLocation: 'Finance → Payroll Audit Reports',
        status: 'TO_UPLOAD',
      },
      {
        evidenceRequired: 'Approval evidence JSON',
        storageLocation: 'Finance → Payroll Audit Reports',
        status: 'TO_UPLOAD',
      },
      {
        evidenceRequired: 'Payment/bank preparation evidence',
        storageLocation: 'Finance restricted document library',
        status: 'MANUAL_STEP',
      },
      {
        evidenceRequired: 'Director/payment sign-off evidence',
        storageLocation: 'Finance restricted document library',
        status: 'MANUAL_STEP',
      },
      {
        evidenceRequired: 'Bank confirmation/proof of payment',
        storageLocation: 'Finance restricted document library',
        status: 'MANUAL_STEP',
      },
    ],
    financeControls: [
      'Confirm payroll totals match approved Finance review.',
      'Confirm locked payroll followed Director approval.',
      'Confirm payslips were generated after payroll lock.',
      'Confirm statutory configuration used for payroll was approved before live payroll use.',
      'Confirm bank payment preparation evidence is stored separately in Finance.',
    ],
  };
}

/* -------------------------------------------------------------------------- */
/* Finance                                                                    */
/* -------------------------------------------------------------------------- */

export type FinanceExpense = {
  id: string;
  expenseNo: string;
  category: string;
  description: string;
  amount: string | number;
  department?: string | null;
  site?: string | null;
  payee?: string | null;
  requestedBy?: string | null;
  requestedByEmail?: string | null;
  status: string;
  evidenceStatus: string;
  approvalRequestId?: string | null;
  paidBy?: string | null;
  paidAt?: string | null;
  paymentReference?: string | null;
  financeComment?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FinanceExpensesResponse = {
  summary: {
    totalRecords: number;
    totalValue: number;
    submitted: number;
    approved: number;
    rejected: number;
    paid: number;
  };
  expenses: FinanceExpense[];
};

export async function getFinanceDashboard() {
  return apiGet('/finance/dashboard', 'Failed to load finance dashboard', true);
}

export async function getFinanceExpenses(): Promise<FinanceExpensesResponse> {
  return apiGet<FinanceExpensesResponse>(
    '/finance/expenses',
    'Failed to load finance expenses',
    true,
  );
}

export async function createFinanceExpense(payload: {
  category: string;
  description: string;
  amount: number;
  department?: string;
  site?: string;
  payee?: string;
  requestedBy?: string;
  requestedByEmail?: string;
}) {
  return apiPost<{ message: string; expense: FinanceExpense }>(
    '/finance/expenses',
    payload,
    'Failed to create finance expense',
    true,
  );
}

export async function approveFinanceExpense(id: string, financeComment?: string) {
  return apiPatch<{ message: string; expense: FinanceExpense }>(
    `/finance/expenses/${id}/approve`,
    { financeComment },
    'Failed to approve finance expense',
    true,
  );
}

export async function rejectFinanceExpense(id: string, financeComment?: string) {
  return apiPatch<{ message: string; expense: FinanceExpense }>(
    `/finance/expenses/${id}/reject`,
    { financeComment },
    'Failed to reject finance expense',
    true,
  );
}

export async function markFinanceExpensePaid(
  id: string,
  payload: {
    paidBy?: string;
    paymentReference?: string;
    financeComment?: string;
  } = {},
) {
  return apiPatch<{ message: string; expense: FinanceExpense }>(
    `/finance/expenses/${id}/mark-paid`,
    payload,
    'Failed to mark finance expense as paid',
    true,
  );
}

export type ProcurementPaymentRecord = {
  id: string;
  requisitionNo: string;
  department: string;
  site?: string | null;
  requestedBy?: string | null;
  supplierName?: string | null;
  description: string;
  amount: string | number;
  procurementStage: string;
  financeStage: string;
  status: string;
  invoiceStatus: string;
  paymentStatus: string;
  proofOfPaymentStatus: string;
  purchaseOrderNo?: string | null;
  invoiceNo?: string | null;
  goodsReceivedNote?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProcurementPaymentsResponse = {
  summary: {
    totalRecords: number;
    totalValue: number;
    invoicePending: number;
    paymentPending: number;
    paid: number;
  };
  records: ProcurementPaymentRecord[];
};

export async function getProcurementPayments(): Promise<ProcurementPaymentsResponse> {
  return apiGet<ProcurementPaymentsResponse>(
    '/finance/procurement-payments',
    'Failed to load procurement payments',
    true,
  );
}

export async function createProcurementPayment(payload: {
  department: string;
  site?: string;
  supplierName?: string;
  description: string;
  amount: number;
  requestedBy?: string;
}) {
  return apiPost<{ message: string; record: ProcurementPaymentRecord }>(
    '/finance/procurement-payments',
    payload,
    'Failed to create procurement payment',
    true,
  );
}

export async function markProcurementInvoiceReceived(id: string, invoiceNo?: string) {
  return apiPatch<{ message: string; record: ProcurementPaymentRecord }>(
    `/finance/procurement-payments/${id}/invoice-received`,
    { invoiceNo },
    'Failed to mark invoice received',
    true,
  );
}

export async function markProcurementPaid(id: string) {
  return apiPatch<{ message: string; record: ProcurementPaymentRecord }>(
    `/finance/procurement-payments/${id}/mark-paid`,
    {},
    'Failed to mark procurement payment as paid',
    true,
  );
}

export async function markProcurementPopUploaded(id: string) {
  return apiPatch<{ message: string; record: ProcurementPaymentRecord }>(
    `/finance/procurement-payments/${id}/pop-uploaded`,
    {},
    'Failed to mark proof of payment uploaded',
    true,
  );
}

export type FinanceEvidenceRecord = {
  id: string;
  expenseId?: string | null;
  paymentBatchId?: string | null;
  procurementId?: string | null;
  evidenceType: string;
  title: string;
  status: string;
  documentId?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FinanceEvidenceResponse = {
  summary: {
    totalRecords: number;
    required: number;
    uploaded: number;
    approved: number;
    published: number;
  };
  evidence: FinanceEvidenceRecord[];
};

export async function getFinanceEvidence(): Promise<FinanceEvidenceResponse> {
  return apiGet<FinanceEvidenceResponse>(
    '/finance/evidence',
    'Failed to load finance evidence',
    true,
  );
}

export async function markFinanceEvidenceUploaded(id: string, documentId?: string) {
  return apiPatch<{ message: string; evidence: FinanceEvidenceRecord }>(
    `/finance/evidence/${id}/mark-uploaded`,
    { documentId },
    'Failed to mark finance evidence uploaded',
    true,
  );
}

export async function approveFinanceEvidence(id: string) {
  return apiPatch<{ message: string; evidence: FinanceEvidenceRecord }>(
    `/finance/evidence/${id}/approve`,
    {},
    'Failed to approve finance evidence',
    true,
  );
}

export async function markFinanceEvidencePublishReady(id: string) {
  return apiPatch<{ message: string; evidence: FinanceEvidenceRecord }>(
    `/finance/evidence/${id}/publish-ready`,
    {},
    'Failed to mark finance evidence ready for SharePoint',
    true,
  );
}

export type FinanceSharePointDocument = {
  id: string;
  module: string;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
  title: string;
  documentType: string;
  fileName?: string | null;
  storageProvider: string;
  storagePath?: string | null;
  sharePointUrl?: string | null;
  status: string;
  confidentiality: string;
  uploadedBy?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FinanceSharePointPackageResponse = {
  summary: {
    totalRecords: number;
    draft: number;
    uploaded: number;
    approved: number;
    published: number;
  };
  documents: FinanceSharePointDocument[];
};

export async function getFinanceSharePointPackage(): Promise<FinanceSharePointPackageResponse> {
  return apiGet<FinanceSharePointPackageResponse>(
    '/finance/sharepoint-package',
    'Failed to load finance SharePoint package',
    true,
  );
}

export async function prepareFinanceSharePointPackage(payload: {
  title: string;
  documentType?: string;
  sourceEntityType?: string;
  sourceEntityId?: string;
  confidentiality?: string;
  uploadedBy?: string;
}) {
  return apiPost<{ message: string; document: FinanceSharePointDocument }>(
    '/finance/sharepoint-package/prepare',
    payload,
    'Failed to prepare finance SharePoint package',
    true,
  );
}

export async function markFinanceSharePointPackageReady(id: string) {
  return apiPatch<{ message: string; document: FinanceSharePointDocument }>(
    `/finance/sharepoint-package/${id}/mark-ready`,
    {},
    'Failed to mark finance package ready',
    true,
  );
}

export async function markFinanceSharePointPackagePublished(id: string, sharePointUrl?: string) {
  return apiPatch<{ message: string; document: FinanceSharePointDocument }>(
    `/finance/sharepoint-package/${id}/mark-published`,
    { sharePointUrl },
    'Failed to mark finance package published',
    true,
  );
}