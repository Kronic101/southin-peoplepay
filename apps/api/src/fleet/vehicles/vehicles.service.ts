import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

function clean(value: unknown) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function removeUndefined<T extends Record<string, any>>(data: T): T {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  ) as T;
}

@Injectable()
export class FleetVehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma as any;
  }

  async getVehicles() {
    return this.db().fleetVehicle.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        assignments: {
          where: { status: 'ACTIVE' },
          include: {
            driver: true,
          },
        },
        dueItems: {
          where: { status: 'OPEN' },
          orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        },
      },
    });
  }

  async getVehicle(id: string) {
    const vehicle = await this.db().fleetVehicle.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            driver: true,
          },
          orderBy: { assignedAt: 'desc' },
        },
        inspections: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        defects: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        trips: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        fuelLogs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        dueItems: {
          orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Fleet vehicle not found.');
    }

    return vehicle;
  }

    async createVehicle(body: any) {
      const registrationNo =
        clean(body.registrationNo) ||
        clean(body.regNo) ||
        clean(body.plateNo) ||
        clean(body.vehicleNo);

      if (!registrationNo) {
        throw new BadRequestException('Vehicle registration number is required.');
      }

      return this.db().fleetVehicle.create({
        data: removeUndefined({
          registrationNo,
          make: clean(body.make) || 'Unknown',
          model: clean(body.model) || 'Unknown',
          year:
            body.year !== undefined && body.year !== null && body.year !== ''
              ? Number(body.year)
              : undefined,
          vehicleType: clean(body.vehicleType) || clean(body.type) || 'PICKUP',
          department: clean(body.department) || null,
          site: clean(body.site) || null,
          status: clean(body.status) || 'ACTIVE',
          odometerCurrent:
            body.odometerCurrent !== undefined &&
            body.odometerCurrent !== null &&
            body.odometerCurrent !== ''
              ? String(body.odometerCurrent)
              : body.odometer !== undefined && body.odometer !== null && body.odometer !== ''
                ? String(body.odometer)
                : '0',
          insuranceExpiry: body.insuranceExpiry ? new Date(body.insuranceExpiry) : undefined,
          fitnessExpiry: body.fitnessExpiry ? new Date(body.fitnessExpiry) : undefined,
          roadTaxExpiry: body.roadTaxExpiry ? new Date(body.roadTaxExpiry) : undefined,
          telematicsProvider: clean(body.telematicsProvider) || null,
          telematicsUnitId: clean(body.telematicsUnitId) || null,
        }),
      });
    }

  async updateVehicle(id: string, body: any) {
    const existing = await this.db().fleetVehicle.findUnique({
      where: { id },
    }); 

    if (!existing) {
      throw new NotFoundException('Fleet vehicle not found.');
    }

    return this.db().fleetVehicle.update({
      where: { id },
      data: removeUndefined({
        registrationNo: clean(body.registrationNo) || undefined,
        make: clean(body.make) || undefined,
        model: clean(body.model) || undefined,
        year:
          body.year !== undefined && body.year !== null && body.year !== ''
            ? Number(body.year)
            : undefined,
        vehicleType: clean(body.vehicleType) || clean(body.type) || undefined,
        department: clean(body.department) || undefined,
        site: clean(body.site) || undefined,
        status: clean(body.status) || undefined,
        odometerCurrent:
          body.odometerCurrent !== undefined &&
          body.odometerCurrent !== null &&
          body.odometerCurrent !== ''
            ? String(body.odometerCurrent)
            : body.odometer !== undefined && body.odometer !== null && body.odometer !== ''
              ? String(body.odometer)
              : undefined,
        insuranceExpiry: body.insuranceExpiry ? new Date(body.insuranceExpiry) : undefined,
        fitnessExpiry: body.fitnessExpiry ? new Date(body.fitnessExpiry) : undefined,
        roadTaxExpiry: body.roadTaxExpiry ? new Date(body.roadTaxExpiry) : undefined,
        telematicsProvider: clean(body.telematicsProvider) || undefined,
        telematicsUnitId: clean(body.telematicsUnitId) || undefined,
      }),
    });
  }
}