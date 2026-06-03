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

export async function getEmployees(): Promise<Employee[]> {
  const res = await fetch(`${API_URL}/employees`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to load employees');
  }

  return res.json();
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
  const res = await fetch(`${API_URL}/employees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error('Failed to create employee');
  }

  return res.json();
}

export async function createPortalAccount(employeeId: string) {
  const res = await fetch(`${API_URL}/employees/${employeeId}/portal-account`, {
    method: 'POST',
  });

  if (!res.ok) {
    throw new Error('Failed to create portal account');
  }

  return res.json();
}

export async function employeeLogin(payload: { employeeNumber: string; pin: string }) {
  const res = await fetch(`${API_URL}/auth/employee/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error('Invalid employee number or PIN');
  }

  return res.json();
}

export async function employeeChangePin(payload: {
  employeeNumber: string;
  currentPin: string;
  newPin: string;
}) {
  const res = await fetch(`${API_URL}/auth/employee/change-pin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error('Failed to change PIN');
  }

  return res.json();
}

export async function getEmployeeMe(token: string) {
  const res = await fetch(`${API_URL}/auth/employee/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to load employee profile');
  }

  return res.json();
}

export async function getEmployee(id: string) {
  const res = await fetch(`${API_URL}/employees/${id}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to load employee');
  }

  return res.json();
}

export async function getEmployeeSetupLookups() {
  const res = await fetch(`${API_URL}/employees/lookups/setup`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to load setup lookups');
  }

  return res.json();
}

export async function updateEmployee(id: string, payload: Record<string, unknown>) {
  const res = await fetch(`${API_URL}/employees/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error('Failed to update employee');
  }

  return res.json();
}

export async function updateEmployeeStatutoryDetails(id: string, payload: Record<string, unknown>) {
  const res = await fetch(`${API_URL}/employees/${id}/statutory-details`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error('Failed to update statutory details');
  }

  return res.json();
}

export async function createEmployeeBankAccount(id: string, payload: Record<string, unknown>) {
  const res = await fetch(`${API_URL}/employees/${id}/bank-accounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error('Failed to create bank account');
  }

  return res.json();
}

export async function createEmployeeContract(id: string, payload: Record<string, unknown>) {
  const res = await fetch(`${API_URL}/employees/${id}/contracts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error('Failed to create contract');
  }

  return res.json();
}

export async function assignEmployeeServiceCondition(id: string, payload: Record<string, unknown>) {
  const res = await fetch(`${API_URL}/employees/${id}/service-conditions/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error('Failed to assign service condition');
  }

  return res.json();
}

export async function getPayrollReadiness() {
  const res = await fetch(`${API_URL}/employees/payroll-readiness`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to load payroll readiness');
  }

  return res.json();
}

export async function approveEmployeeBankAccount(employeeId: string, bankAccountId: string) {
  const res = await fetch(`${API_URL}/employees/${employeeId}/bank-accounts/${bankAccountId}/approve`, {
    method: 'POST',
  });

  if (!res.ok) {
    throw new Error('Failed to approve bank account');
  }

  return res.json();
}

export async function approveEmployeeServiceCondition(employeeId: string, conditionId: string) {
  const res = await fetch(`${API_URL}/employees/${employeeId}/service-conditions/${conditionId}/approve`, {
    method: 'POST',
  });

  if (!res.ok) {
    throw new Error('Failed to approve condition of service');
  }

  return res.json();
}

export async function getPayrollPeriods() {
  const res = await fetch(`${API_URL}/payroll/periods`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to load payroll periods');
  }

  return res.json();
}

export async function createPayrollPeriod(payload: {
  periodName: string;
  startDate: string;
  endDate: string;
  payDate: string;
}) {
  const res = await fetch(`${API_URL}/payroll/periods`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error('Failed to create payroll period');
  }

  return res.json();
}

export async function getPayrollReadyEmployees() {
  const res = await fetch(`${API_URL}/payroll/ready-employees`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to load payroll-ready employees');
  }

  return res.json();
}

export async function getPayrollRuns() {
  const res = await fetch(`${API_URL}/payroll/runs`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to load payroll runs');
  }

  return res.json();
}

export async function createPayrollRun(payload: {
  payrollPeriodId: string;
  runName: string;
  runType: string;
}) {
  const res = await fetch(`${API_URL}/payroll/runs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error('Failed to create payroll run');
  }

  return res.json();
}

export async function getPayrollRun(id: string) {
  const res = await fetch(`${API_URL}/payroll/runs/${id}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to load payroll run');
  }

  return res.json();
}

export async function calculatePayrollLineStatutory(runId: string, lineId: string) {
  const res = await fetch(`${API_URL}/payroll/runs/${runId}/employees/${lineId}/calculate-statutory`, {
    method: 'POST',
  });

  if (!res.ok) {
    throw new Error('Failed to calculate statutory deductions');
  }

  return res.json();
}

export async function updatePayrollLineGrossPay(
  runId: string,
  lineId: string,
  payload: {
    grossPay: number;
    description?: string;
  },
) {
  const res = await fetch(`${API_URL}/payroll/runs/${runId}/employees/${lineId}/gross-pay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error('Failed to update payroll line gross pay');
  }

  return res.json();
}

export async function getStatutorySettings() {
  const res = await fetch(`${API_URL}/statutory/settings`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to load statutory settings');
  }

  return res.json();
}

export async function createTaxYear(payload: {
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}) {
  const res = await fetch(`${API_URL}/statutory/tax-years`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error('Failed to create tax year');
  }

  return res.json();
}

export async function createPayeBand(payload: {
  taxYearId: string;
  lowerBound: number;
  upperBound?: number | null;
  rate: number;
}) {
  const res = await fetch(`${API_URL}/statutory/paye-bands`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error('Failed to create PAYE band');
  }

  return res.json();
}

export async function createNapsaRate(payload: {
  name: string;
  employeeRate: number;
  employerRate: number;
  monthlyCeiling?: number | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
}) {
  const res = await fetch(`${API_URL}/statutory/napsa-rates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error('Failed to create NAPSA rate');
  }

  return res.json();
}

export async function approveNapsaRate(id: string) {
  const res = await fetch(`${API_URL}/statutory/napsa-rates/${id}/approve`, {
    method: 'POST',
  });

  if (!res.ok) {
    throw new Error('Failed to approve NAPSA rate');
  }

  return res.json();
}

export async function createNhimaRate(payload: {
  name: string;
  employeeRate: number;
  employerRate: number;
  calculationBase: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
}) {
  const res = await fetch(`${API_URL}/statutory/nhima-rates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error('Failed to create NHIMA rate');
  }

  return res.json();
}

export async function approveNhimaRate(id: string) {
  const res = await fetch(`${API_URL}/statutory/nhima-rates/${id}/approve`, {
    method: 'POST',
  });

  if (!res.ok) {
    throw new Error('Failed to approve NHIMA rate');
  }

  return res.json();
}

export async function createSdlRate(payload: {
  name: string;
  employerRate: number;
  calculationBase: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
}) {
  const res = await fetch(`${API_URL}/statutory/sdl-rates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error('Failed to create SDL rate');
  }

  return res.json();
}

export async function approveSdlRate(id: string) {
  const res = await fetch(`${API_URL}/statutory/sdl-rates/${id}/approve`, {
    method: 'POST',
  });

  if (!res.ok) {
    throw new Error('Failed to approve SDL rate');
  }

  return res.json();
}

export async function updatePayeBand(
  id: string,
  payload: {
    lowerBound?: number;
    upperBound?: number | null;
    rate?: number;
  },
) {
  const res = await fetch(`${API_URL}/statutory/paye-bands/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error('Failed to update PAYE band');
  }

  return res.json();
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
  const res = await fetch(`${API_URL}/statutory/napsa-rates/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error('Failed to update NAPSA rate');
  }

  return res.json();
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
  const res = await fetch(`${API_URL}/statutory/nhima-rates/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error('Failed to update NHIMA rate');
  }

  return res.json();
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
  const res = await fetch(`${API_URL}/statutory/sdl-rates/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error('Failed to update SDL rate');
  }

  return res.json();
}

export async function submitPayrollRunToHr(id: string, payload: { actorId?: string; comments?: string }) {
  const res = await fetch(`${API_URL}/payroll/runs/${id}/submit-hr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error('Failed to submit payroll to HR');
  return res.json();
}

export async function hrReviewPayrollRun(
  id: string,
  payload: { actorId?: string; approved: boolean; comments?: string },
) {
  const res = await fetch(`${API_URL}/payroll/runs/${id}/hr-review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error('Failed to complete HR review');
  return res.json();
}

export async function submitPayrollRunToFinance(id: string, payload: { actorId?: string; comments?: string }) {
  const res = await fetch(`${API_URL}/payroll/runs/${id}/submit-finance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error('Failed to submit payroll to Finance');
  return res.json();
}

export async function financeReviewPayrollRun(
  id: string,
  payload: { actorId?: string; approved: boolean; comments?: string },
) {
  const res = await fetch(`${API_URL}/payroll/runs/${id}/finance-review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error('Failed to complete Finance review');
  return res.json();
}

export async function submitPayrollRunToDirector(id: string, payload: { actorId?: string; comments?: string }) {
  const res = await fetch(`${API_URL}/payroll/runs/${id}/submit-director`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error('Failed to submit payroll to Director');
  return res.json();
}

export async function directorApprovePayrollRun(
  id: string,
  payload: { actorId?: string; approved: boolean; comments?: string },
) {
  const res = await fetch(`${API_URL}/payroll/runs/${id}/director-approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error('Failed to complete Director approval');
  return res.json();
}

export async function lockPayrollRun(id: string, payload: { actorId?: string; comments?: string }) {
  const res = await fetch(`${API_URL}/payroll/runs/${id}/lock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error('Failed to lock payroll run');
  return res.json();
}

export async function generatePayslipsForRun(
  id: string,
  payload: {
    actorId?: string;
    comments?: string;
  },
) {
  const res = await fetch(`${API_URL}/payroll/runs/${id}/generate-payslips`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error('Failed to generate payslips');
  }

  return res.json();
}

export async function getEmployeePayslips(token: string) {
  const res = await fetch(`${API_URL}/auth/employee/payslips`, {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error('Failed to load employee payslips');
  }

  return res.json();
}

export async function getEmployeePayslip(id: string, token: string) {
  const res = await fetch(`${API_URL}/auth/employee/payslips/${id}`, {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error('Failed to load employee payslip');
  }

  return res.json();
}

export async function requestEmployeePinReset(payload: {
  employeeNumber: string;
  email?: string;
}) {
  const res = await fetch(`${API_URL}/auth/employee/forgot-pin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error('Failed to request PIN reset');
  }

  return res.json();
}

export async function employeeForgotPin(payload: { employeeNumber: string }) {
  const res = await fetch(`${API_URL}/auth/employee/forgot-pin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error('Failed to request PIN reset');
  }

  return res.json();
}