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
export class FleetDriversService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma as any;
  }

  async getDrivers() {
    return this.db().fleetDriverProfile.findMany({
      orderBy: { driverName: 'asc' },
      include: {
        assignments: {
          where: { status: 'ACTIVE' },
          include: {
            vehicle: true,
          },
        },
      },
    });
  }

  async getDriver(id: string) {
    const driver = await this.db().fleetDriverProfile.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            vehicle: true,
          },
          orderBy: { assignedAt: 'desc' },
        },
        inspections: {
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
      },
    });

    if (!driver) {
      throw new NotFoundException('Fleet driver not found.');
    }

    return driver;
  }

  async createDriver(body: any) {
    const driverName = clean(body.driverName) || clean(body.name);

    if (!driverName) {
      throw new BadRequestException('Driver name is required.');
    }

    return this.db().fleetDriverProfile.create({
      data: removeUndefined({
        employeeId: clean(body.employeeId) || null,
        employeeNumber: clean(body.employeeNumber) || null,
        driverName,
        phone: clean(body.phone) || null,
        email: clean(body.email) || null,
        licenceNo: clean(body.licenceNo) || clean(body.licenseNo) || null,
        licenceClass: clean(body.licenceClass) || clean(body.licenseClass) || null,
        licenceExpiry: body.licenceExpiry
          ? new Date(body.licenceExpiry)
          : body.licenseExpiry
            ? new Date(body.licenseExpiry)
            : undefined,
        department: clean(body.department) || 'Operations',
        site: clean(body.site) || 'Kitwe Main Distribution Centre',
        branch: clean(body.branch) || null,
        status: clean(body.status) || 'ACTIVE',
      }),
    });
  }

  async updateDriver(id: string, body: any) {
    const existing = await this.db().fleetDriverProfile.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Fleet driver not found.');
    }

    return this.db().fleetDriverProfile.update({
      where: { id },
      data: removeUndefined({
        employeeId: clean(body.employeeId) || undefined,
        employeeNumber: clean(body.employeeNumber) || undefined,
        driverName: clean(body.driverName) || clean(body.name) || undefined,
        phone: clean(body.phone) || undefined,
        email: clean(body.email) || undefined,
        licenceNo: clean(body.licenceNo) || clean(body.licenseNo) || undefined,
        licenceClass: clean(body.licenceClass) || clean(body.licenseClass) || undefined,
        licenceExpiry: body.licenceExpiry
          ? new Date(body.licenceExpiry)
          : body.licenseExpiry
            ? new Date(body.licenseExpiry)
            : undefined,
        department: clean(body.department) || undefined,
        site: clean(body.site) || undefined,
        branch: clean(body.branch) || undefined,
        status: clean(body.status) || undefined,
      }),
    });
  }
}