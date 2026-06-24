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
export class FleetDefectsService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma as any;
  }

  async getDefects() {
    return this.db().fleetDefect.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        vehicle: true,
      },
    });
  }

  async createDefect(body: any) {
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

    const defectNo = clean(body.defectNo) || `DEF-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    return this.db().fleetDefect.create({
      data: removeUndefined({
        defectNo,
        vehicleId,
        title: clean(body.title) || clean(body.defectTitle) || 'Vehicle defect',
        description: clean(body.description) || clean(body.notes) || null,
        severity: clean(body.severity) || 'MEDIUM',
        status: clean(body.status) || 'OPEN',
        reportedBy: clean(body.reportedBy) || 'Fleet User',
        reportedAt: body.reportedAt ? new Date(body.reportedAt) : new Date(),
      }),
      include: {
        vehicle: true,
      },
    });
  }

  async updateDefectStatus(id: string, body: any) {
    const defect = await this.db().fleetDefect.findUnique({
      where: { id },
    });

    if (!defect) {
      throw new NotFoundException('Defect not found.');
    }

    return this.db().fleetDefect.update({
      where: { id },
      data: removeUndefined({
        status: clean(body.status) || undefined,
        severity: clean(body.severity) || undefined,
        description: clean(body.description) || clean(body.notes) || undefined,
      }),
      include: {
        vehicle: true,
      },
    });
  }

  async closeDefect(id: string, body: any) {
    const defect = await this.db().fleetDefect.findUnique({
      where: { id },
    });

    if (!defect) {
      throw new NotFoundException('Defect not found.');
    }

    return this.db().fleetDefect.update({
      where: { id },
      data: removeUndefined({
        status: 'CLOSED',
        closedAt: body.closedAt ? new Date(body.closedAt) : new Date(),
        description: clean(body.actionTaken) || clean(body.notes) || undefined,
      }),
      include: {
        vehicle: true,
      },
    });
  }

  async createWorkshopJobFromDefect(id: string, body: any) {
    const defect = await this.db().fleetDefect.findUnique({
      where: { id },
      include: { vehicle: true },
    });

    if (!defect) {
      throw new NotFoundException('Defect not found.');
    }

    const jobCardNo = `JOB-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    const job = await this.db().fleetWorkshopJob.create({
      data: {
        jobCardNo,
        vehicleId: defect.vehicleId,
        defectId: defect.id,
        jobType: 'DEFECT_REPAIR',
        priority:
          defect.severity === 'CRITICAL'
            ? 'CRITICAL'
            : defect.severity === 'HIGH'
              ? 'HIGH'
              : 'MEDIUM',
        status: 'OPEN',
        title: defect.title,
        description: defect.description,
        openedBy: clean(body.openedBy) || 'Fleet Manager',
        odometerIn: body.odometer ? String(body.odometer) : undefined,
      },
      include: {
        vehicle: true,
        defect: true,
        parts: true,
        labourLines: true,
      },
    });

    await this.db().fleetDefect.update({
      where: { id },
      data: {
        status: 'ESCALATED',
      },
    });

    return job;
  }
}