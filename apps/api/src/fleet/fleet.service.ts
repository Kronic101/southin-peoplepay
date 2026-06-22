import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
export class FleetService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma as any;
  }

  async getDashboard() {
    const [
      vehicles,
      activeVehicles,
      drivers,
      activeAssignments,
      openDueItems,
      overdueDueItems,
      inspections,
      defects,
      openDefects,
      trips,
      fuelLogs,
      workshopJobs,
      openWorkshopJobs,
    ] = await Promise.all([
      this.db().fleetVehicle.count().catch(() => 0),
      this.db().fleetVehicle.count({ where: { status: 'ACTIVE' } }).catch(() => 0),

      this.db().fleetDriverProfile.count().catch(() => 0),
      this.db().fleetVehicleAssignment.count({ where: { status: 'ACTIVE' } }).catch(() => 0),

      this.db().fleetDueItem.count({ where: { status: 'OPEN' } }).catch(() => 0),
      this.db()
        .fleetDueItem.count({
          where: {
            status: 'OPEN',
            dueDate: {
              lt: new Date(),
            },
          },
        })
        .catch(() => 0),

      this.db().fleetInspection.count().catch(() => 0),
      this.db().fleetDefect.count().catch(() => 0),
      this.db()
        .fleetDefect.count({
          where: {
            status: {
              in: ['OPEN', 'REPORTED', 'IN_PROGRESS'],
            },
          },
        })
        .catch(() => 0),

      this.db().fleetTrip.count().catch(() => 0),
      this.db().fleetFuelLog.count().catch(() => 0),
      this.db().fleetWorkshopJob.count().catch(() => 0),
      this.db()
        .fleetWorkshopJob.count({
          where: {
            status: {
              in: ['OPEN', 'IN_PROGRESS', 'WAITING_PARTS'],
            },
          },
        })
        .catch(() => 0),
    ]);

    const recentVehicles = await this.db()
      .fleetVehicle.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
      })
      .catch(() => []);

    const recentDueItems = await this.db()
      .fleetDueItem.findMany({
        take: 10,
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        include: {
          vehicle: true,
        },
      })
      .catch(() => []);

    const recentDefects = await this.db()
      .fleetDefect.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          vehicle: true,
        },
      })
      .catch(() => []);

    return {
      summary: {
        vehicles,
        activeVehicles,
        drivers,
        activeAssignments,
        openDueItems,
        overdueDueItems,
        inspections,
        defects,
        openDefects,
        trips,
        fuelLogs,
        workshopJobs,
        openWorkshopJobs,
      },
      recentVehicles,
      recentDueItems,
      recentDefects,
    };
  }

  async getAssignments() {
    return this.db().fleetVehicleAssignment.findMany({
      orderBy: { assignedAt: 'desc' },
      include: {
        vehicle: true,
        driver: true,
      },
    });
  }

  async createAssignment(body: any) {
    const vehicleId = clean(body.vehicleId);
    const driverId = clean(body.driverId);

    if (!vehicleId) {
      throw new BadRequestException('Vehicle is required.');
    }

    if (!driverId) {
      throw new BadRequestException('Driver is required.');
    }

    const vehicle = await this.db().fleetVehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found.');
    }

    const driver = await this.db().fleetDriverProfile.findUnique({
      where: { id: driverId },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found.');
    }

    await this.db().fleetVehicleAssignment.updateMany({
      where: {
        vehicleId,
        status: 'ACTIVE',
      },
      data: {
        status: 'RETURNED',
        returnedBy: clean(body.assignedBy) || 'Fleet Manager',
        returnedAt: new Date(),
      },
    });

    return this.db().fleetVehicleAssignment.create({
      data: {
        vehicleId,
        driverId,
        assignedBy: clean(body.assignedBy) || 'Fleet Manager',
        assignedAt: body.assignedAt ? new Date(body.assignedAt) : new Date(),
        status: 'ACTIVE',
        notes: clean(body.notes) || null,
      },
      include: {
        vehicle: true,
        driver: true,
      },
    });
  }

  async returnAssignment(id: string, body: any) {
    const assignment = await this.db().fleetVehicleAssignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      throw new NotFoundException('Vehicle assignment not found.');
    }

    return this.db().fleetVehicleAssignment.update({
      where: { id },
      data: {
        status: 'RETURNED',
        returnedBy: clean(body.returnedBy) || 'Fleet Manager',
        returnedAt: body.returnedAt ? new Date(body.returnedAt) : new Date(),
        notes: clean(body.notes) || assignment.notes,
      },
      include: {
        vehicle: true,
        driver: true,
      },
    });
  }

  async getDueItems() {
    return this.db().fleetDueItem.findMany({
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
      include: {
        vehicle: true,
      },
    });
  }

  async createDueItem(body: any) {
    const vehicleId = clean(body.vehicleId);

    if (!vehicleId) {
      throw new BadRequestException('Vehicle is required.');
    }

    const vehicle = await this.db().fleetVehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found.');
    }

    return this.db().fleetDueItem.create({
      data: removeUndefined({
        vehicleId,
        dueType: clean(body.dueType) || 'SERVICE',
        title: clean(body.title) || 'Fleet due item',
        description: clean(body.description) || null,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        dueOdometer:
          body.dueOdometer !== undefined && body.dueOdometer !== null && body.dueOdometer !== ''
            ? String(body.dueOdometer)
            : undefined,
        status: clean(body.status) || 'OPEN',
        priority: clean(body.priority) || 'MEDIUM',
        notes: clean(body.notes) || null,
      }),
      include: {
        vehicle: true,
      },
    });
  }

  async completeDueItem(id: string, body: any) {
    const item = await this.db().fleetDueItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Due item not found.');
    }

    return this.db().fleetDueItem.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedBy: clean(body.completedBy) || 'Fleet Manager',
        completedAt: body.completedAt ? new Date(body.completedAt) : new Date(),
        notes: clean(body.notes) || item.notes,
      },
      include: {
        vehicle: true,
      },
    });
  }
}