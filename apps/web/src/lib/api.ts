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