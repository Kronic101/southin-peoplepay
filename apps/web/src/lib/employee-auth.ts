const EMPLOYEE_TOKEN_KEYS = [
  'employeeToken',
  'employee_token',
  'employeePortalToken',
  'southinEmployeeToken',
  'southin_employee_token',
];

export function getEmployeePortalToken() {
  if (typeof window === 'undefined') return null;

  for (const key of EMPLOYEE_TOKEN_KEYS) {
    const value = localStorage.getItem(key);

    if (value && value.trim()) {
      return value;
    }
  }

  return null;
}

export function saveEmployeePortalToken(token: string) {
  if (typeof window === 'undefined') return;

  for (const key of EMPLOYEE_TOKEN_KEYS) {
    localStorage.setItem(key, token);
  }
}

export function clearEmployeePortalToken() {
  if (typeof window === 'undefined') return;

  for (const key of EMPLOYEE_TOKEN_KEYS) {
    localStorage.removeItem(key);
  }

  localStorage.removeItem('employee');
}

export function employeeAuthHeaders() {
  const token = getEmployeePortalToken();

  return {
    Authorization: token ? `Bearer ${token}` : '',
    'Content-Type': 'application/json',
  };
}