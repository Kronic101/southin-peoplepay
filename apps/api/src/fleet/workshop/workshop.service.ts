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
export class FleetWorkshopService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma as any;
  }

  async getWorkshopJobs() {
    return this.db().fleetWorkshopJob.findMany({
      orderBy: {
        openedAt: 'desc',
      },
      include: {
        vehicle: true,
        defect: true,
        parts: true,
        labourLines: true,
      },
    });
  }

  async createWorkshopJob(body: any) {
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

    const jobCardNo =
      clean(body.jobCardNo) ||
      clean(body.jobNo) ||
      `JOB-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    const estimatedCost = asNumber(body.estimatedCost);
    const labourCost = asNumber(body.labourCost);
    const partsCost = asNumber(body.partsCost);
    const totalCost = asNumber(body.totalCost) || estimatedCost || labourCost + partsCost;

    return this.db().fleetWorkshopJob.create({
      data: removeUndefined({
        jobCardNo,

        vehicleId,
        defectId: clean(body.defectId) || undefined,

        jobType: clean(body.jobType) || 'REPAIR',
        priority: clean(body.priority) || 'MEDIUM',
        status: clean(body.status) || 'OPEN',

        title: clean(body.title) || 'Workshop job',
        description: clean(body.description) || null,
        diagnosis: clean(body.diagnosis) || null,
        workDone: clean(body.workDone) || null,

        openedBy: clean(body.openedBy) || 'Fleet Manager',
        assignedTo: clean(body.assignedTo) || null,
        approvedBy: clean(body.approvedBy) || null,
        releasedBy: clean(body.releasedBy) || null,

        openedAt: body.openedAt ? new Date(body.openedAt) : new Date(),
        startedAt: body.startedAt ? new Date(body.startedAt) : undefined,
        completedAt: body.completedAt ? new Date(body.completedAt) : undefined,
        approvedAt: body.approvedAt ? new Date(body.approvedAt) : undefined,
        releasedAt: body.releasedAt ? new Date(body.releasedAt) : undefined,
        closedAt: body.closedAt ? new Date(body.closedAt) : undefined,

        odometerIn:
          body.odometerIn !== undefined && body.odometerIn !== null && body.odometerIn !== ''
            ? String(body.odometerIn)
            : body.odometer !== undefined && body.odometer !== null && body.odometer !== ''
              ? String(body.odometer)
              : undefined,

        odometerOut:
          body.odometerOut !== undefined && body.odometerOut !== null && body.odometerOut !== ''
            ? String(body.odometerOut)
            : undefined,

        labourCost: labourCost > 0 ? String(labourCost) : undefined,
        partsCost: partsCost > 0 ? String(partsCost) : undefined,
        totalCost: totalCost > 0 ? String(totalCost) : undefined,

        approvalRequestId: clean(body.approvalRequestId) || undefined,
      }),
      include: {
        vehicle: true,
        defect: true,
        parts: true,
        labourLines: true,
      },
    });
  }

  async closeWorkshopJob(id: string, body: any) {
    const job = await this.db().fleetWorkshopJob.findUnique({
      where: { id },
    });

    if (!job) {
      throw new NotFoundException('Workshop job not found.');
    }

    const labourCost = asNumber(body.labourCost);
    const partsCost = asNumber(body.partsCost);
    const totalCost = asNumber(body.totalCost) || labourCost + partsCost;

    return this.db().fleetWorkshopJob.update({
      where: { id },
      data: removeUndefined({
        status: clean(body.status) || 'CLOSED',
        workDone: clean(body.workDone) || undefined,
        completedAt: body.completedAt ? new Date(body.completedAt) : new Date(),
        closedAt: body.closedAt ? new Date(body.closedAt) : new Date(),
        releasedBy: clean(body.releasedBy) || undefined,
        releasedAt: body.releasedAt ? new Date(body.releasedAt) : undefined,

        odometerOut:
          body.odometerOut !== undefined && body.odometerOut !== null && body.odometerOut !== ''
            ? String(body.odometerOut)
            : undefined,

        labourCost: labourCost > 0 ? String(labourCost) : undefined,
        partsCost: partsCost > 0 ? String(partsCost) : undefined,
        totalCost: totalCost > 0 ? String(totalCost) : undefined,
      }),
      include: {
        vehicle: true,
        defect: true,
        parts: true,
        labourLines: true,
      },
    });
  }
}