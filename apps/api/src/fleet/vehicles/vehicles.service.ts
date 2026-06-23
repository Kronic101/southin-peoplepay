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
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        inspections: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 3,
        },
        defects: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 3,
        },
        trips: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 3,
        },
        fuelLogs: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 3,
        },
        workshopJobs: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 3,
        },
      },
    });
  }

    async getVehicle(id: string) {
      const vehicle = await this.db().fleetVehicle.findUnique({
      where: { id },
      include: {
        inspections: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        defects: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        trips: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        fuelLogs: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        workshopJobs: {
          orderBy: {
            createdAt: 'desc',
          },
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

  async getVehicleAssignments(vehicleId: string) {
  const vehicle = await this.db().fleetVehicle.findUnique({
    where: { id: vehicleId },
  });

  if (!vehicle) {
    throw new NotFoundException('Fleet vehicle not found.');
  }

  return this.db().fleetVehicleAssignment.findMany({
    where: {
      vehicleId,
    },
    orderBy: {
      assignedAt: 'desc',
    },
    include: {
      driver: true,
    },
  });
}

async assignDriverToVehicle(vehicleId: string, body: any) {
  const driverId = clean(body.driverId);
  const assignedBy = clean(body.assignedBy) || 'Fleet Manager';
  const notes = clean(body.notes);

  if (!driverId) {
    throw new BadRequestException('Driver ID is required.');
  }

  const vehicle = await this.db().fleetVehicle.findUnique({
    where: { id: vehicleId },
  });

  if (!vehicle) {
    throw new NotFoundException('Fleet vehicle not found.');
  }

  const driver = await this.db().fleetDriverProfile.findUnique({
    where: { id: driverId },
  });

  if (!driver) {
    throw new NotFoundException('Fleet driver not found.');
  }

  const result = await this.db().$transaction(async (tx: any) => {
    await tx.fleetVehicleAssignment.updateMany({
      where: {
        vehicleId,
        status: 'ACTIVE',
      },
      data: {
        status: 'RETURNED',
        returnedAt: new Date(),
        returnedBy: assignedBy,
      },
    });

    const assignment = await tx.fleetVehicleAssignment.create({
      data: {
        vehicleId,
        driverId,
        assignedBy,
        assignedAt: new Date(),
        status: 'ACTIVE',
        notes: notes || null,
      },
      include: {
        driver: true,
      },
    });

    await tx.fleetVehicle.update({
      where: { id: vehicleId },
      data: {
        status: 'ACTIVE',
      },
    });

    return assignment;
  });

  return {
    message: `Driver ${driver.driverName} assigned to vehicle ${vehicle.registrationNo}.`,
    assignment: result,
  };
}

  async releaseDriverFromVehicle(vehicleId: string, body: any) {
    const returnedBy = clean(body.returnedBy) || clean(body.releasedBy) || 'Fleet Manager';
    const notes = clean(body.notes);

    const vehicle = await this.db().fleetVehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException('Fleet vehicle not found.');
    }

    const activeAssignment = await this.db().fleetVehicleAssignment.findFirst({
      where: {
        vehicleId,
        status: 'ACTIVE',
      },
      include: {
        driver: true,
      },
    });

    if (!activeAssignment) {
      throw new BadRequestException('This vehicle has no active driver assignment.');
    }

    const updated = await this.db().fleetVehicleAssignment.update({
      where: {
        id: activeAssignment.id,
      },
      data: {
        status: 'RETURNED',
        returnedAt: new Date(),
        returnedBy,
        notes: notes || activeAssignment.notes || null,
      },
      include: {
        driver: true,
      },
    });

    return {
      message: `Driver assignment released for vehicle ${vehicle.registrationNo}.`,
      assignment: updated,
    };
  }
}