export type SafetySite = {
  id: string;
  name: string;
  code?: string | null;
  location?: string | null;
};

export type SafetyObservationPayload = {
  siteId: string;
  siteName: string;
  branch?: string | null;
  department?: string | null;
  exactLocation: string;

  observationDate: string;
  observationType: string;
  riskLevel: string;

  description: string;
  immediateAction?: string | null;

  personObserved?: string | null;
  employeeId?: string | null;
  contractorName?: string | null;

  reportedBy?: string | null;
  reportedByEmail?: string | null;

  photoUrls?: string[];
  gpsLatitude?: string | null;
  gpsLongitude?: string | null;

  mobileDraftId?: string | null;
  idempotencyKey?: string | null;
  syncStatus?: string | null;
  deviceId?: string | null;
  capturedOfflineAt?: string | null;
};

export type SafetyIncidentPayload = {
  siteId: string;
  siteName: string;
  branch?: string | null;
  department?: string | null;
  exactLocation: string;

  incidentDate: string;
  incidentType: string;
  severity: string;

  description: string;
  immediateAction?: string | null;

  injuredPersonName?: string | null;
  injuredEmployeeId?: string | null;
  contractorCompany?: string | null;
  injuryType?: string | null;
  bodyPart?: string | null;

  rootCause?: string | null;
  investigationNotes?: string | null;

  reportedBy?: string | null;
  reportedByEmail?: string | null;

  photoUrls?: string[];
  gpsLatitude?: string | null;
  gpsLongitude?: string | null;

  mobileDraftId?: string | null;
  idempotencyKey?: string | null;
  syncStatus?: string | null;
  deviceId?: string | null;
  capturedOfflineAt?: string | null;
};

export type SafetyCorrectiveActionPayload = {
  sourceType: 'SAFETY_OBSERVATION' | 'SAFETY_INCIDENT';
  sourceId: string;

  title: string;
  description: string;
  priority: string;

  assignedToName?: string | null;
  assignedToEmail?: string | null;
  dueDate?: string | null;

  createdBy?: string | null;
  createdByEmail?: string | null;
};