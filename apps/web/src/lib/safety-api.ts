const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`GET ${path} failed with ${response.status}`);
  }

  return response.json();
}

async function apiPost<T>(path: string, body: any): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `POST ${path} failed with ${response.status}`);
  }

  return response.json();
}

async function apiPatch<T>(path: string, body: any): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `PATCH ${path} failed with ${response.status}`);
  }

  return response.json();
}

function withSite(path: string, siteId?: string) {
  if (!siteId) return path;
  return `${path}?siteId=${encodeURIComponent(siteId)}`;
}

export function getSafetyDashboard(siteId?: string) {
  return apiGet<any>(withSite('/safety/dashboard', siteId));
}

export function getSafetyObservations(siteId?: string) {
  return apiGet<any[]>(withSite('/safety/observations', siteId));
}

export function createSafetyObservation(body: any) {
  return apiPost<any>('/safety/observations', body);
}

export function getSafetyIncidents(siteId?: string) {
  return apiGet<any[]>(withSite('/safety/incidents', siteId));
}

export function createSafetyIncident(body: any) {
  return apiPost<any>('/safety/incidents', body);
}

export function getSafetyCorrectiveActions() {
  return apiGet<any[]>('/safety/corrective-actions');
}

export function getSafetyCorrectiveAction(id: string) {
  return apiGet<any>(`/safety/corrective-actions/${id}`);
}

export function createSafetyCorrectiveAction(body: any) {
  return apiPost<any>('/safety/corrective-actions', body);
}

export function updateSafetyCorrectiveActionStatus(
  id: string,
  body: {
    status: string;
    notes?: string;
    actionedBy?: string;
    actionedByEmail?: string;
  },
) {
  return apiPatch<any>(`/safety/corrective-actions/${id}/status`, body);
}

export function completeSafetyCorrectiveAction(
  id: string,
  body: {
    notes?: string;
    actionedBy?: string;
    actionedByEmail?: string;
  },
) {
  return apiPatch<any>(`/safety/corrective-actions/${id}/complete`, body);
}

export function verifySafetyCorrectiveAction(
  id: string,
  body: {
    notes?: string;
    verifiedBy?: string;
    verifiedByEmail?: string;
  },
) {
  return apiPatch<any>(`/safety/corrective-actions/${id}/verify`, body);
}

export function closeSafetyCorrectiveAction(
  id: string,
  body: {
    notes?: string;
    closedBy?: string;
    closedByEmail?: string;
  },
) {
  return apiPatch<any>(`/safety/corrective-actions/${id}/close`, body);
}

export function makeIdempotencyKey(prefix = 'WEB') {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}