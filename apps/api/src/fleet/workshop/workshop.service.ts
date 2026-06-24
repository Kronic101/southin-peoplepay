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

function enumValue(value: unknown, fallback: string) {
  const cleaned = clean(value);

  if (!cleaned) {
    return fallback;
  }

  return cleaned.toUpperCase().replace(/[\s-]+/g, '_');
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

@Injectable()
export class FleetWorkshopService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma as any;
  }

  // Controller compatibility method
  async getJobs() {
    return this.getWorkshopJobs();
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

  // Controller compatibility method
  async createJob(body: any) {
    return this.createWorkshopJob(body);
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

    const labourCost = asNumber(body.labourCost);
    const partsCost = asNumber(body.partsCost);
    const totalCost =
      asNumber(body.totalCost) ||
      asNumber(body.actualCost) ||
      asNumber(body.estimatedCost) ||
      labourCost + partsCost;

    const job = await this.db().fleetWorkshopJob.create({
      data: removeUndefined({
        jobCardNo,
        vehicleId,
        defectId: clean(body.defectId) || undefined,

        jobType: enumValue(body.jobType, 'REPAIR'),
        priority: enumValue(body.priority, 'MEDIUM'),
        status: enumValue(body.status, 'OPEN'),

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

    if (job.defectId) {
      await this.db().fleetDefect.update({
        where: { id: job.defectId },
        data: {
          status: 'IN_PROGRESS',
        },
      });
    }

    return job;
  }

  async updateJobStatus(id: string, body: any) {
    const job = await this.db().fleetWorkshopJob.findUnique({
      where: { id },
    });

    if (!job) {
      throw new NotFoundException('Workshop job not found.');
    }

    const status = enumValue(body.status, 'IN_PROGRESS');

    if (status === 'CLOSED') {
      return this.closeWorkshopJob(id, body);
    }

    const updated = await this.db().fleetWorkshopJob.update({
      where: { id },
      data: removeUndefined({
        status,

        diagnosis: clean(body.diagnosis) || undefined,
        workDone: clean(body.workDone) || undefined,
        assignedTo: clean(body.assignedTo) || undefined,

        startedAt:
          status === 'IN_PROGRESS' || status === 'DIAGNOSIS'
            ? body.startedAt
              ? new Date(body.startedAt)
              : job.startedAt || new Date()
            : undefined,

        completedAt:
          status === 'COMPLETED' || status === 'QUALITY_CHECK'
            ? body.completedAt
              ? new Date(body.completedAt)
              : job.completedAt || new Date()
            : undefined,

        approvedBy:
          status === 'RELEASED' || status === 'CLOSED'
            ? clean(body.approvedBy) || job.approvedBy || 'Fleet Manager'
            : clean(body.approvedBy) || undefined,

        approvedAt:
          status === 'RELEASED'
            ? body.approvedAt
              ? new Date(body.approvedAt)
              : job.approvedAt || new Date()
            : undefined,

        releasedBy:
          status === 'RELEASED'
            ? clean(body.releasedBy) || 'Fleet Manager'
            : undefined,

        releasedAt:
          status === 'RELEASED'
            ? body.releasedAt
              ? new Date(body.releasedAt)
              : new Date()
            : undefined,
      }),
      include: {
        vehicle: true,
        defect: true,
        parts: true,
        labourLines: true,
      },
    });

    return updated;
  }

  // Controller compatibility method
  async closeJob(id: string, body: any) {
    return this.closeWorkshopJob(id, body);
  }

  async closeWorkshopJob(id: string, body: any) {
    const job = await this.db().fleetWorkshopJob.findUnique({
      where: { id },
      include: {
        vehicle: true,
        defect: true,
        parts: true,
        labourLines: true,
      },
    });

    if (!job) {
      throw new NotFoundException('Workshop job not found.');
    }

    const labourCost =
      body.labourCost !== undefined && body.labourCost !== null && body.labourCost !== ''
        ? asNumber(body.labourCost)
        : asNumber(job.labourCost);

    const partsCost =
      body.partsCost !== undefined && body.partsCost !== null && body.partsCost !== ''
        ? asNumber(body.partsCost)
        : asNumber(job.partsCost);

    const totalCost =
      asNumber(body.totalCost) ||
      asNumber(body.actualCost) ||
      asNumber(job.totalCost) ||
      labourCost + partsCost;

    const updated = await this.db().fleetWorkshopJob.update({
      where: { id },
      data: removeUndefined({
        status: enumValue(body.status, 'CLOSED'),

        workDone: clean(body.workDone) || job.workDone || 'Workshop job completed.',
        completedAt: body.completedAt ? new Date(body.completedAt) : job.completedAt || new Date(),
        closedAt: body.closedAt ? new Date(body.closedAt) : new Date(),

        approvedBy: clean(body.approvedBy) || job.approvedBy || 'Fleet Manager',
        approvedAt: body.approvedAt ? new Date(body.approvedAt) : job.approvedAt || new Date(),

        releasedBy: clean(body.releasedBy) || job.releasedBy || 'Fleet Manager',
        releasedAt: body.releasedAt ? new Date(body.releasedAt) : job.releasedAt || new Date(),

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

    if (updated.defectId) {
      await this.db().fleetDefect.update({
        where: { id: updated.defectId },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          resolvedAt: new Date(),
        },
      });
    }

    const costPosting =
      totalCost > 0 ? await this.createOrUpdateWorkshopCostPosting(updated, totalCost) : null;

    return {
      ...updated,
      costPosting,
    };
  }

  private async createOrUpdateWorkshopCostPosting(job: any, amount: number) {
    const existing = await this.db().fleetCostPosting.findFirst({
      where: {
        sourceType: 'WORKSHOP_JOB',
        sourceId: job.id,
      },
    });

    const costDate = job.closedAt || job.completedAt || new Date();
    const costNo =
      existing?.costNo ||
      `FLT-COST-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    const payload = {
      costNo,
      sourceType: 'WORKSHOP_JOB',
      sourceId: job.id,
      vehicleId: job.vehicleId,
      vehicleRegistration: job.vehicle?.registrationNo || null,
      category: job.jobType || 'REPAIR',
      description: `Workshop job ${job.jobCardNo} - ${job.title}`,
      amount: String(amount),
      costDate,
      month: monthKey(costDate),
      department: job.vehicle?.department || null,
      site: job.vehicle?.site || null,
      status: 'PENDING_FINANCE_REVIEW',
    };

    if (existing) {
      if (existing.status === 'POSTED_TO_FINANCE') {
        return existing;
      }

      return this.db().fleetCostPosting.update({
        where: { id: existing.id },
        data: {
          category: payload.category,
          description: payload.description,
          amount: payload.amount,
          costDate: payload.costDate,
          month: payload.month,
          department: payload.department,
          site: payload.site,
          status: payload.status,
        },
      });
    }

    return this.db().fleetCostPosting.create({
      data: payload,
    });
  }
}