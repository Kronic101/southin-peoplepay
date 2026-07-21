import { apiGet, apiPatch, apiPost } from './client';
import {
  FleetDefect,
  FleetFuelLog,
  FleetInspectionPayload,
  FleetTrip,
  FleetWorkshopJob,
} from '../types/fleet';


/**
 * Fleet dashboard
 */
export const getFleetDashboard = () => apiGet<any>('/fleet/dashboard');

/**
 * Fleet vehicles
 */
export type FleetVehicle = {
  id: string;
  registrationNo: string;
  assetId?: string | null;

  make?: string | null;
  model?: string | null;
  year?: number | null;
  vehicleType?: string | null;
  department?: string | null;

  site?: string | null;
  siteName?: string | null;
  isPoolVehicle?: boolean;

  status?: string | null;
  odometerCurrent?: string | number | null;

  activeDriver?: {
    id: string;
    employeeId?: string | null;
    employeeNumber?: string | null;
    driverName?: string | null;
    licenceNo?: string | null;
    licenceClass?: string | null;
    licenceExpiry?: string | null;
    department?: string | null;
    site?: string | null;
    branch?: string | null;
    status?: string | null;
  } | null;
};
export const getFleetVehicles = () => apiGet<FleetVehicle[]>('/fleet/vehicles');
export const getFleetMobileContext = () => apiGet('/fleet/mobile/context');
export const getFleetVehicle = (id: string) =>
  apiGet<FleetVehicle>(`/fleet/vehicles/${id}`);

/**
 * Fleet inspections
 */
export const getFleetInspections = () => apiGet<any[]>('/fleet/inspections');

export const getFleetInspection = (id: string) =>
  apiGet<any>(`/fleet/inspections/${id}`);

export const createFleetInspection = (payload: FleetInspectionPayload | any) =>
  apiPost<any>('/fleet/inspections', payload);

/**
 * Backward-compatible alias.
 * Some screens may still use submitFleetInspection.
 */
export const submitFleetInspection = (payload: FleetInspectionPayload) =>
  createFleetInspection(payload);

export const updateFleetInspectionStatus = (id: string, payload: any) =>
  apiPatch<any>(`/fleet/inspections/${id}/status`, payload);

/**
 * Fleet defects
 */
export const getFleetDefects = () => apiGet<FleetDefect[]>('/fleet/defects');

export const createFleetDefect = (payload: Partial<FleetDefect>) =>
  apiPost<FleetDefect>('/fleet/defects', payload);

export const updateFleetDefectStatus = (id: string, payload: any) =>
  apiPatch<FleetDefect>(`/fleet/defects/${id}/status`, payload);

export const closeFleetDefect = (id: string, payload: any) =>
  apiPatch<FleetDefect>(`/fleet/defects/${id}/close`, payload);

/**
 * Fleet trips
 */
export const getFleetTrips = () => apiGet<FleetTrip[]>('/fleet/trips');

export const createFleetTrip = (payload: Partial<FleetTrip>) =>
  apiPost<FleetTrip>('/fleet/trips', payload);

export const closeFleetTrip = (id: string, payload: any) =>
  apiPatch<FleetTrip>(`/fleet/trips/${id}/close`, payload);

/**
 * Fleet fuel
 */
export const getFleetFuelLogs = () => apiGet<FleetFuelLog[]>('/fleet/fuel');

export const createFleetFuelLog = (payload: Partial<FleetFuelLog>) =>
  apiPost<FleetFuelLog>('/fleet/fuel', payload);

/**
 * Fleet workshop
 */
export const getFleetWorkshopJobs = () =>
  apiGet<FleetWorkshopJob[]>('/fleet/workshop');

export const createFleetWorkshopJob = (payload: Partial<FleetWorkshopJob>) =>
  apiPost<FleetWorkshopJob>('/fleet/workshop', payload);

export const updateFleetWorkshopJobStatus = (id: string, payload: any) =>
  apiPatch<FleetWorkshopJob>(`/fleet/workshop/${id}/status`, payload);

export const closeFleetWorkshopJob = (id: string, payload: any) =>
  apiPatch<FleetWorkshopJob>(`/fleet/workshop/${id}/close`, payload);

