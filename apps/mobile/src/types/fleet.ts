export type FleetVehicle = {
  id: string;
  registrationNo: string;
  make?: string | null;
  model?: string | null;
  vehicleType?: string | null;
  status?: string | null;
  odometerCurrent?: string | number | null;
};

export type FleetInspectionChecklistLine = {
  itemNo: number;
  item: string;
  status: 'OKAY' | 'NOT_OKAY';
  comments?: string;
};

export type FleetInspectionPayload = {
  vehicleId: string;
  driverName: string;
  odometer: string;
  safeForUse: 'YES' | 'NO';
  comments?: string;
  checklist: FleetInspectionChecklistLine[];
};

export type FleetDefect = {
  id?: string;
  vehicleId: string;
  title?: string;
  description?: string;
  severity?: string;
  reportedBy?: string;
  odometer?: string | number;
  location?: string;
  status?: string;
};

export type FleetTrip = {
  id?: string;
  vehicleId: string;
  tripDate?: string;
  driverName?: string;
  purpose?: string;
  origin?: string;
  destination?: string;
  openingOdometer?: string | number;
  closingOdometer?: string | number;
  status?: string;
  notes?: string;
};

export type FleetFuelLog = {
  id?: string;
  vehicleId: string;
  fuelType?: string;
  litres?: string | number;
  unitPrice?: string | number;
  amount?: string | number;
  odometer?: string | number;
  stationName?: string;
  receiptNo?: string;
};

export type FleetWorkshopJob = {
  id?: string;
  jobCardNo?: string;
  vehicleId: string;
  title?: string;
  description?: string;
  priority?: string;
  status?: string;
};