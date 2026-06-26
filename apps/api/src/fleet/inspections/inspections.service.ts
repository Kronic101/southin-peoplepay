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

function isFailedStatus(value: unknown) {
  const status = clean(value).toUpperCase();

  return [
    'NOT_OK',
    'NOT OK',
    'NO',
    'FAIL',
    'FAILED',
    'DEFECT',
    'DEFECT_FOUND',
  ].includes(status);
}

function normalizeSeverity(value: unknown) {
  const severity = clean(value).toUpperCase();

  if (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(severity)) {
    return severity;
  }

  return 'MEDIUM';
}

function booleanFromUnknown(value: unknown): boolean | null {
  const text = clean(value).toUpperCase();

  if (['TRUE', 'YES', 'Y', '1', 'SAFE', 'OK', 'OKAY', 'PASS', 'PASSED'].includes(text)) {
    return true;
  }

  if (['FALSE', 'NO', 'N', '0', 'UNSAFE', 'FAIL', 'FAILED'].includes(text)) {
    return false;
  }

  return null;
}

@Injectable()
export class FleetInspectionsService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma as any;
  }

  private getModelFieldNames(modelName: string): string[] {
    const model = this.db()?._runtimeDataModel?.models?.[modelName];

    if (!model?.fields) {
      return [];
    }

    return model.fields.map((field: any) => field.name);
  }

  private pickModelData(modelName: string, data: Record<string, any>) {
    const fields = this.getModelFieldNames(modelName);

    if (!fields.length) {
      return removeUndefined(data);
    }

    return removeUndefined(
      Object.fromEntries(Object.entries(data).filter(([key]) => fields.includes(key))),
    );
  }

  async getInspections() {
    return this.db().fleetInspection.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        vehicle: true,
      },
    });
  }

  async getInspection(id: string) {
    const inspection = await this.db().fleetInspection.findUnique({
      where: { id },
      include: {
        vehicle: true,
      },
    });

    if (!inspection) {
      throw new NotFoundException('Fleet inspection not found.');
    }

    return inspection;
  }

  async createInspection(body: any) {
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

    const checklist = Array.isArray(body.checklist)
      ? body.checklist
      : Array.isArray(body.items)
        ? body.items
        : Array.isArray(body.responses)
          ? body.responses
          : [];

    const normalisedChecklist = checklist.map((item: any, index: number) => {
      const severity = normalizeSeverity(item.severity);
      const blocksUseText = clean(item.blocksUse).toUpperCase();

      const hasExplicitBlocksUse = blocksUseText !== '';
      const blocksUse = hasExplicitBlocksUse
        ? ['TRUE', 'YES', 'Y', '1'].includes(blocksUseText)
        : severity === 'CRITICAL';

      return {
        no: item.no ?? item.number ?? index + 1,
        label: clean(item.label || item.title || item.checkName) || `Inspection item ${index + 1}`,
        status: clean(item.status || item.answer || item.result) || 'OKAY',
        comments: clean(item.comments || item.comment || item.description),
        severity,
        blocksUse,
      };
    });

    const failedItems = normalisedChecklist.filter((item: any) => isFailedStatus(item.status));
    const blockingFailedItems = failedItems.filter((item: any) => item.blocksUse === true);

    const explicitSafeForUse = booleanFromUnknown(body.safeForUse);
    const safeForUse =
      blockingFailedItems.length > 0
        ? false
        : explicitSafeForUse !== null
          ? explicitSafeForUse
          : true;

    const businessStatus =
      !safeForUse || blockingFailedItems.length > 0
        ? 'FAILED'
        : failedItems.length > 0
          ? 'PASSED_WITH_DEFECTS'
          : 'PASSED';

    // Prisma enum-safe value.
    // schema.prisma currently allows PASSED, FAILED, DEFECT_REPORTED and SUBMITTED.
    const dbInspectionStatus =
      businessStatus === 'FAILED'
        ? 'FAILED'
        : businessStatus === 'PASSED_WITH_DEFECTS'
          ? 'DEFECT_REPORTED'
          : 'PASSED';

    const odometer = asNumber(body.odometer || body.odometerReading || body.odometerStart);

    const driverName =
      clean(body.driverName) ||
      clean(body.inspectedBy) ||
      clean(body.submittedBy) ||
      'Fleet Driver';

    const inspectionPayload = {
      checklist: normalisedChecklist,
      safeForUse,
      failedItems,
      blockingFailedItems,
      businessStatus,
      overallStatus: businessStatus,
      submittedFrom: clean(body.submittedFrom) || 'MOBILE',
    };

    const inspectionData = this.pickModelData('FleetInspection', {
      vehicleId,

      driverId: clean(body.driverId) || undefined,
      employeeId: clean(body.employeeId) || undefined,
      employeeNumber: clean(body.employeeNumber) || undefined,
      driverName,

      inspectionDate: body.inspectionDate ? new Date(body.inspectionDate) : new Date(),

      odometer: String(odometer || 0),

      checklistPhase:
        clean(body.checklistPhase) ||
        clean(body.phase) ||
        clean(body.inspectionType) ||
        'PRE_START',

      overallStatus: dbInspectionStatus,

      notes: clean(body.notes) || clean(body.comments) || null,

      payload: inspectionPayload,
    });

    const inspection = await this.db().fleetInspection.create({
      data: inspectionData,
      include: {
        vehicle: true,
      },
    });

    if (odometer > 0) {
      await this.db()
        .fleetVehicle.update({
          where: { id: vehicleId },
          data: {
            odometerCurrent: String(odometer),
          },
        })
        .catch(() => null);
    }

    if (failedItems.length > 0) {
      await Promise.all(
        failedItems.map((item: any, index: number) => {
          const defectNo = `DEF-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}-${index + 1}`;
          const severity = item.blocksUse ? 'HIGH' : item.severity || 'MEDIUM';

          return this.db().fleetDefect.create({
            data: {
              defectNo,
              vehicleId,
              title: item.label || 'Inspection defect',
              description:
                item.comments ||
                `Defect found during ${inspectionData.checklistPhase || 'PRE_START'} inspection.`,
              severity,
              status: 'OPEN',
              reportedBy: driverName,
              reportedAt: new Date(),
            },
          });
        }),
      );
    }

    return {
      message:
        businessStatus === 'FAILED'
          ? 'Inspection submitted. Vehicle is not safe for use. Critical defect raised.'
          : businessStatus === 'PASSED_WITH_DEFECTS'
            ? 'Inspection submitted. Vehicle is safe for use with advisory defect raised.'
            : 'Inspection submitted. Vehicle passed pre-start inspection.',
      inspection,
      failedItems,
      blockingFailedItems,
      safeForUse,
      overallStatus: businessStatus,
      dbInspectionStatus,
      defectsCreated: failedItems.length,
    };
  }

  async updateInspectionStatus(id: string, body: any) {
    const inspection = await this.db().fleetInspection.findUnique({
      where: { id },
    });

    if (!inspection) {
      throw new NotFoundException('Fleet inspection not found.');
    }

    const status = clean(body.status).toUpperCase();

    if (!status) {
      throw new BadRequestException('Status is required.');
    }

    const dbInspectionStatus =
      status === 'PASSED_WITH_DEFECTS'
        ? 'DEFECT_REPORTED'
        : ['PASSED', 'FAILED', 'DEFECT_REPORTED', 'SUBMITTED'].includes(status)
          ? status
          : 'SUBMITTED';

    return this.db().fleetInspection.update({
      where: { id },
      data: this.pickModelData('FleetInspection', {
        overallStatus: dbInspectionStatus,
        notes: clean(body.notes) || clean(body.comments) || undefined,
        payload: {
          ...(inspection.payload || {}),
          reviewedBy: clean(body.reviewedBy) || undefined,
          reviewedAt: new Date().toISOString(),
          reviewComments: clean(body.comments) || clean(body.notes) || undefined,
          businessStatus: status,
        },
      }),
      include: {
        vehicle: true,
      },
    });
  }
}