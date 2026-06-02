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