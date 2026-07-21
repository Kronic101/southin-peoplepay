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
    const importedFleetAssets = await this.db().hubAsset.findMany({
      where: {
        category: 'VEHICLE',
      },
      orderBy: {
        name: 'asc',
      },
      take: 50,
    });
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
        vehicles: vehicles + importedFleetAssets.length,
        activeVehicles:
          activeVehicles +
          importedFleetAssets.filter((asset:any) =>
            ['ACTIVE', 'IN_USE', 'IN_STORE', 'AVAILABLE'].includes(
              String(asset.status || '').toUpperCase(),
            ),
          ).length,
        importedFleetAssets: importedFleetAssets.length,
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
      importedFleetAssets,
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

  async getMobileContext() {
    const [vehicles, drivers, assignments] = await Promise.all([
      this.db().fleetVehicle.findMany({
        orderBy: {
          registrationNo: 'asc',
        },
        select: {
          id: true,
          registrationNo: true,
          assetId: true,
          make: true,
          model: true,
          year: true,
          vehicleType: true,
          department: true,
          site: true,
          odometerCurrent: true,
          status: true,
          insuranceExpiry: true,
          fitnessExpiry: true,
          roadTaxExpiry: true,
          telematicsProvider: true,
          telematicsUnitId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),

      this.db().fleetDriverProfile.findMany({
        orderBy: {
          driverName: 'asc',
        },
        select: {
          id: true,
          employeeId: true,
          employeeNumber: true,
          driverName: true,
          licenceNo: true,
          licenceClass: true,
          licenceExpiry: true,
          department: true,
          site: true,
          branch: true,
          status: true,
        },
      }),

      this.db().fleetVehicleAssignment.findMany({
        where: {
          status: 'ACTIVE',
        },
        orderBy: {
          assignedAt: 'desc',
        },
        include: {
          driver: true,
        },
      }),
    ]);

    const activeAssignmentByVehicleId = new Map<string, any>();

    for (const assignment of assignments) {
      if (!activeAssignmentByVehicleId.has(assignment.vehicleId)) {
        activeAssignmentByVehicleId.set(assignment.vehicleId, assignment);
      }
    }

    const mobileVehicles = vehicles.map((vehicle: any) => {
      const siteName = String(vehicle.site || '').trim();
      const assignment = activeAssignmentByVehicleId.get(vehicle.id) || null;
      const driver = assignment?.driver || null;

      return {
        id: vehicle.id,
        registrationNo: vehicle.registrationNo,
        assetId: vehicle.assetId,

        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        vehicleType: vehicle.vehicleType,
        department: vehicle.department,

        siteName: siteName || 'UNASSIGNED / POOL',
        isPoolVehicle: !siteName,

        status: vehicle.status || 'ACTIVE',
        odometerCurrent:
          vehicle.odometerCurrent?.toString?.() ||
          String(vehicle.odometerCurrent || '0'),

        insuranceExpiry: vehicle.insuranceExpiry,
        fitnessExpiry: vehicle.fitnessExpiry,
        roadTaxExpiry: vehicle.roadTaxExpiry,
        telematicsProvider: vehicle.telematicsProvider,
        telematicsUnitId: vehicle.telematicsUnitId,

        activeDriver: driver
          ? {
              id: driver.id,
              employeeId: driver.employeeId,
              employeeNumber: driver.employeeNumber,
              driverName: driver.driverName,
              licenceNo: driver.licenceNo,
              licenceClass: driver.licenceClass,
              licenceExpiry: driver.licenceExpiry,
              department: driver.department,
              site: driver.site,
              branch: driver.branch,
              status: driver.status,
            }
          : null,
      };
    });

    const sites = Array.from(
      new Set(
        mobileVehicles
          .map((vehicle: any) => vehicle.siteName)
          .filter(Boolean),
      ),
    )
      .sort()
      .map((siteName) => ({
        id: siteName,
        name: siteName,
        isPoolSite: siteName === 'UNASSIGNED / POOL',
      }));

    return {
      vehicles: mobileVehicles,
      drivers,
      assignments,
      sites,
      summary: {
        vehicles: mobileVehicles.length,
        activeVehicles: mobileVehicles.filter(
          (vehicle: any) => String(vehicle.status).toUpperCase() === 'ACTIVE',
        ).length,
        poolVehicles: mobileVehicles.filter(
          (vehicle: any) => vehicle.isPoolVehicle,
        ).length,
        assignedSiteVehicles: mobileVehicles.filter(
          (vehicle: any) => !vehicle.isPoolVehicle,
        ).length,
        activeAssignments: assignments.length,
        drivers: drivers.length,
      },
    };
  }
}