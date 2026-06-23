import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

function clean(value: unknown) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function removeUndefined<T extends Record<string, any>>(data: T): T {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  ) as T;
}

@Injectable()
export class FleetTripsService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma as any;
  }

  async getTrips() {
    return this.db().fleetTrip.findMany({
      orderBy: {
        tripDate: 'desc',
      },
      include: {
        vehicle: true,
        driver: true,
      },
    });
  }

  async createTrip(body: any) {
    const vehicleId = clean(body.vehicleId);

    if (!vehicleId) {
      throw new BadRequestException('Vehicle is required.');
    }

    const vehicle = await this.db().fleetVehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException('Fleet vehicle not found.');
    }

    const openingOdometer = asNumber(body.openingOdometer || body.startOdometer);

    if (openingOdometer <= 0) {
      throw new BadRequestException('Opening odometer is required.');
    }

    const closingOdometerRaw = body.closingOdometer || body.endOdometer;
    const closingOdometer =
      closingOdometerRaw !== undefined && closingOdometerRaw !== null && closingOdometerRaw !== ''
        ? asNumber(closingOdometerRaw)
        : null;

    const distanceKm =
      closingOdometer !== null && closingOdometer >= openingOdometer
        ? closingOdometer - openingOdometer
        : undefined;

    return this.db().fleetTrip.create({
      data: removeUndefined({
        vehicleId,
        driverId: clean(body.driverId) || undefined,
        driverEmployeeId: clean(body.driverEmployeeId) || undefined,
        driverName: clean(body.driverName) || clean(body.driver) || 'Fleet Driver',

        tripDate: body.tripDate ? new Date(body.tripDate) : new Date(),

        origin:
          clean(body.origin) ||
          clean(body.routeFrom) ||
          clean(body.fromLocation) ||
          'Not specified',

        destination:
          clean(body.destination) ||
          clean(body.routeTo) ||
          clean(body.toLocation) ||
          'Not specified',

        purpose: clean(body.purpose) || clean(body.reason) || 'Fleet trip',

        openingOdometer: String(openingOdometer),
        closingOdometer: closingOdometer !== null ? String(closingOdometer) : undefined,
        distanceKm: distanceKm !== undefined ? String(distanceKm) : undefined,
      }),
      include: {
        vehicle: true,
        driver: true,
      },
    });
  }

  async closeTrip(id: string, body: any) {
    const trip = await this.db().fleetTrip.findUnique({
      where: { id },
    });

    if (!trip) {
      throw new NotFoundException('Fleet trip not found.');
    }

    const closingOdometer = asNumber(body.closingOdometer || body.endOdometer);

    if (closingOdometer <= 0) {
      throw new BadRequestException('Closing odometer is required.');
    }

    const openingOdometer = asNumber(trip.openingOdometer);
    const distanceKm =
      closingOdometer >= openingOdometer ? closingOdometer - openingOdometer : 0;

    return this.db().fleetTrip.update({
      where: { id },
      data: {
        closingOdometer: String(closingOdometer),
        distanceKm: String(distanceKm),
      },
      include: {
        vehicle: true,
        driver: true,
      },
    });
  }
}