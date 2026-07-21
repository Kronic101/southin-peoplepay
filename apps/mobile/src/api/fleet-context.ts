import { apiGet } from './client';

export type MobileFleetVehicle = {
  id: string;
  registrationNo: string;
  assetId?: string | null;

  make?: string | null;
  model?: string | null;
  year?: number | null;
  vehicleType?: string | null;
  department?: string | null;

  siteName?: string | null;
  isPoolVehicle?: boolean;

  status?: string | null;
  odometerCurrent?: string | null;

  insuranceExpiry?: string | null;
  fitnessExpiry?: string | null;
  roadTaxExpiry?: string | null;

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

export type MobileFleetDriver = {
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
};

export type MobileFleetContext = {
  vehicles: MobileFleetVehicle[];
  drivers: MobileFleetDriver[];
  assignments: any[];
  sites: Array<{
    id: string;
    name: string;
    isPoolSite?: boolean;
  }>;
  summary: {
    vehicles: number;
    activeVehicles: number;
    poolVehicles: number;
    assignedSiteVehicles: number;
    activeAssignments: number;
    drivers: number;
  };
};

export function getFleetMobileContext() {
  return apiGet<MobileFleetContext>('/fleet/mobile/context');
}