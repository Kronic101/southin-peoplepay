const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:4000/api';

export type FleetVehicleRecord = {
  id: string;
  registrationNo: string;
  assetId?: string | null;
  make?: string | null;
  model?: string | null;
  year?: number | string | null;
  vehicleType?: string | null;
  department?: string | null;
  site?: string | null;
  status?: string | null;
  odometerCurrent?: string | number | null;
  insuranceExpiry?: string | null;
  fitnessExpiry?: string | null;
  roadTaxExpiry?: string | null;
  telematicsProvider?: string | null;
  telematicsUnitId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  inspections?: any[];
  defects?: any[];
  trips?: any[];
  fuelLogs?: any[];
  workshopJobs?: any[];
};

export type FleetDriverRecord = {
  id: string;
  employeeNo?: string | null;
  driverName?: string | null;
  licenceNo?: string | null;
  phone?: string | null;
  status?: string | null;
};

export type FleetDueItemRecord = {
  id: string;
  vehicleId: string;
  dueType?: string | null;
  title?: string | null;
  description?: string | null;
  dueDate?: string | null;
  dueOdometer?: string | number | null;
  status?: string | null;
  priority?: string | null;
  vehicle?: FleetVehicleRecord;
  createdAt?: string;
};

export type FleetDefectRecord = {
  id: string;
  vehicleId: string;
  defectNo?: string | null;
  title?: string | null;
  description?: string | null;
  severity?: string | null;
  priority?: string | null;
  status?: string | null;
  reportedBy?: string | null;
  reportedAt?: string | null;
  closedBy?: string | null;
  closedAt?: string | null;
  odometer?: string | number | null;
  location?: string | null;
  vehicle?: FleetVehicleRecord;
  createdAt?: string;
};

export type FleetTripRecord = {
  id: string;
  vehicleId: string;
  tripNo?: string | null;
  tripDate?: string | null;
  driverId?: string | null;
  driverEmployeeId?: string | null;
  driverName?: string | null;
  purpose?: string | null;
  origin?: string | null;
  destination?: string | null;
  openingOdometer?: string | number | null;
  closingOdometer?: string | number | null;
  distanceKm?: string | number | null;
  status?: string | null;
  notes?: string | null;
  vehicle?: FleetVehicleRecord;
  createdAt?: string;
  updatedAt?: string;
};

export type FleetFuelLogRecord = {
  id: string;
  vehicleId: string;
  driverId?: string | null;
  fuelDate?: string | null;
  stationName?: string | null;
  fuelType?: string | null;
  litres?: string | number | null;
  amount?: string | number | null;
  odometer?: string | number | null;
  receiptDocumentId?: string | null;
  vehicle?: FleetVehicleRecord;
  createdAt?: string;
  updatedAt?: string;
};

export type FleetWorkshopJobRecord = {
  id: string;
  jobCardNo?: string | null;
  vehicleId: string;
  defectId?: string | null;
  jobType?: string | null;
  priority?: string | null;
  status?: string | null;
  title?: string | null;
  description?: string | null;
  diagnosis?: string | null;
  workDone?: string | null;
  openedBy?: string | null;
  assignedTo?: string | null;
  approvedBy?: string | null;
  releasedBy?: string | null;
  openedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  approvedAt?: string | null;
  releasedAt?: string | null;
  closedAt?: string | null;
  odometer?: string | number | null;
  estimatedCost?: string | number | null;
  actualCost?: string | number | null;
  vehicle?: FleetVehicleRecord;
  parts?: any[];
  labour?: any[];
  createdAt?: string;
};

export type FleetDashboardResponse = {
  summary?: {
    vehicles?: number;
    activeVehicles?: number;
    drivers?: number;
    activeAssignments?: number;
    openDueItems?: number;
    overdueDueItems?: number;
    inspections?: number;
    defects?: number;
    openDefects?: number;
    trips?: number;
    fuelLogs?: number;
    workshopJobs?: number;
    openWorkshopJobs?: number;
  };
  recentVehicles?: FleetVehicleRecord[];
  recentDueItems?: FleetDueItemRecord[];
  recentDefects?: FleetDefectRecord[];
};

export type FleetReportSummary = {
  vehicles?: number;
  activeVehicles?: number;
  defects?: number;
  openDefects?: number;
  trips?: number;
  fuelLogs?: number;
  workshopJobs?: number;
  openWorkshopJobs?: number;
  totalFuelCost?: string | number;
  totalWorkshopCost?: string | number;
  totalFleetCost?: string | number;
};

export type FleetCostByVehicleRecord = {
  vehicleId: string;
  registrationNo?: string | null;
  make?: string | null;
  model?: string | null;
  status?: string | null;
  fuelLogs?: number;
  workshopJobs?: number;
  defects?: number;
  trips?: number;
  fuelCost?: string | number;
  workshopCost?: string | number;
  totalCost?: string | number;
};

export type FleetCostPostingRecord = {
  id: string;
  costNo?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  vehicleId?: string | null;
  vehicleRegistration?: string | null;
  category?: string | null;
  description?: string | null;
  amount?: string | number | null;
  costDate?: string | null;
  month?: string | null;
  department?: string | null;
  site?: string | null;
  status?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  postedBy?: string | null;
  postedAt?: string | null;
  financeExpenseId?: string | null;
  rejectionReason?: string | null;
  vehicle?: FleetVehicleRecord;
  createdAt?: string;
  updatedAt?: string;
};

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    cache: 'no-store',
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

function apiGet<T>(path: string) {
  return apiRequest<T>(path);
}

function apiPost<T>(path: string, payload: any) {
  return apiRequest<T>(path, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

function apiPatch<T>(path: string, payload: any) {
  return apiRequest<T>(path, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function exportFleetCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) {
    window.alert('No records available to export.');
    return;
  }

  const headers = Object.keys(rows[0]);
  const escapeCell = (value: any) => {
    const text = String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
  };

  const csv = [headers.join(','), ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export const getFleetDashboard = () => apiGet<FleetDashboardResponse>('/fleet/dashboard');

export const getFleetVehicles = () => apiGet<FleetVehicleRecord[]>('/fleet/vehicles');
export const getFleetVehicle = (id: string) => apiGet<FleetVehicleRecord>(`/fleet/vehicles/${id}`);
export const createFleetVehicle = (payload: any) => apiPost<FleetVehicleRecord>('/fleet/vehicles', payload);
export const updateFleetVehicle = (id: string, payload: any) => apiPatch<FleetVehicleRecord>(`/fleet/vehicles/${id}`, payload);

export const getFleetDefects = () => apiGet<FleetDefectRecord[]>('/fleet/defects');
export const createFleetDefect = (payload: any) => apiPost<FleetDefectRecord>('/fleet/defects', payload);
export const updateFleetDefectStatus = (id: string, payload: any) => apiPatch<FleetDefectRecord>(`/fleet/defects/${id}/status`, payload);

export const getFleetTrips = () => apiGet<FleetTripRecord[]>('/fleet/trips');
export const createFleetTrip = (payload: any) => apiPost<FleetTripRecord>('/fleet/trips', payload);
export const closeFleetTrip = (id: string, payload: any) => apiPatch<FleetTripRecord>(`/fleet/trips/${id}/close`, payload);

export const getFleetFuelLogs = () => apiGet<FleetFuelLogRecord[]>('/fleet/fuel');
export const createFleetFuelLog = (payload: any) => apiPost<FleetFuelLogRecord>('/fleet/fuel', payload);

export const getFleetWorkshopJobs = () => apiGet<FleetWorkshopJobRecord[]>('/fleet/workshop');
export const createFleetWorkshopJob = (payload: any) => apiPost<FleetWorkshopJobRecord>('/fleet/workshop', payload);
export const updateFleetWorkshopJobStatus = (id: string, payload: any) => apiPatch<FleetWorkshopJobRecord>(`/fleet/workshop/${id}/status`, payload);
export const closeFleetWorkshopJob = (id: string, payload: any) => apiPatch<FleetWorkshopJobRecord>(`/fleet/workshop/${id}/close`, payload);

export const getFleetReportSummary = () => apiGet<{ summary: FleetReportSummary }>('/fleet/reports/summary');
export const getFleetCostsByVehicle = () => apiGet<FleetCostByVehicleRecord[]>('/fleet/reports/costs-by-vehicle');



export const getFleetCosts = () => apiGet<FleetCostPostingRecord[]>('/fleet/costs');
export const reviewFleetCost = (id: string, payload: any) => apiPatch<FleetCostPostingRecord>(`/fleet/costs/${id}/finance-review`, payload);
export const getPendingFleetCosts = () => apiGet<FleetCostPostingRecord[]>('/fleet/costs/pending');

export const getPostedFleetCosts = () => apiGet<FleetCostPostingRecord[]>('/fleet/costs/posted');

export const financeReviewFleetCost = (id: string, payload: any) => apiPatch<FleetCostPostingRecord>(`/fleet/costs/${id}/finance-review`, payload);

export const postFleetCostToFinance = (id: string, payload: any) => apiPatch<FleetCostPostingRecord>(`/fleet/costs/${id}/post-to-finance`, payload);