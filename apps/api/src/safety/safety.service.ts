import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { ApprovalWorkflowService } from '../approvals/approval-workflow.service';

function clean(value: unknown) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function asDate(value: unknown, fieldName: string) {
  const date = new Date(clean(value));

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${fieldName} is required.`);
  }

  return date;
}

function asDecimal(value: unknown) {
  const text = clean(value);
  if (!text) return null;

  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return null;

  return new Prisma.Decimal(parsed);
}

function normaliseRisk(value: unknown) {
  const risk = clean(value).toUpperCase().replaceAll(' ', '_');
  return risk || 'LOW';
}

function isHighRisk(value: unknown) {
  const risk = normaliseRisk(value);
  return risk === 'HIGH' || risk === 'CRITICAL';
}

function approvalRequestIdFrom(workflow: any) {
  return (
    workflow?.approvalRequest?.id ||
    workflow?.approvalRequestId ||
    workflow?.id ||
    null
  );
}

@Injectable()
export class SafetyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approvalWorkflowService: ApprovalWorkflowService,
  ) {}

  private db() {
    return this.prisma as any;
  }

  private async nextRef(prefix: string, modelName: string, fieldName: string) {
    const year = new Date().getFullYear();
    const count = await this.db()[modelName].count();
    return `${prefix}-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  async getDashboard(filter: { siteId?: string }) {
    const where: any = {};

    if (clean(filter.siteId)) {
      where.siteId = clean(filter.siteId);
    }

    const [
      totalObservations,
      openObservations,
      highRiskObservations,
      totalIncidents,
      openIncidents,
      nearMisses,
      openActions,
      overdueActions,
      recentObservations,
      recentIncidents,
      recentActions,
    ] = await Promise.all([
      this.db().safetyObservation.count({ where }),
      this.db().safetyObservation.count({
        where: { ...where, status: { in: ['OPEN', 'UNDER_REVIEW', 'ACTION_REQUIRED'] } },
      }),
      this.db().safetyObservation.count({
        where: { ...where, riskLevel: { in: ['HIGH', 'CRITICAL'] } },
      }),
      this.db().safetyIncident.count({ where }),
      this.db().safetyIncident.count({
        where: { ...where, status: { in: ['SUBMITTED', 'UNDER_INVESTIGATION', 'ACTION_REQUIRED'] } },
      }),
      this.db().safetyIncident.count({
        where: { ...where, incidentType: 'NEAR_MISS' },
      }),
      this.db().safetyCorrectiveAction.count({
        where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
      }),
      this.db().safetyCorrectiveAction.count({
        where: {
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          dueDate: { lt: new Date() },
        },
      }),
      this.db().safetyObservation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.db().safetyIncident.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.db().safetyCorrectiveAction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      summary: {
        totalObservations,
        openObservations,
        highRiskObservations,
        totalIncidents,
        openIncidents,
        nearMisses,
        openActions,
        overdueActions,
      },
      recentObservations,
      recentIncidents,
      recentActions,
    };
  }

  async getObservations(filter: { siteId?: string }) {
    const where: any = {};

    if (clean(filter.siteId)) {
      where.siteId = clean(filter.siteId);
    }

    return this.db().safetyObservation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async createObservation(body: any) {
    const observationNo = await this.nextRef(
      'SAFE-OBS',
      'safetyObservation',
      'observationNo',
    );

    const riskLevel = normaliseRisk(body.riskLevel);

    const observation = await this.db().safetyObservation.create({
      data: {
        observationNo,
        siteId: clean(body.siteId) || null,
        siteName: clean(body.siteName) || null,
        branch: clean(body.branch) || null,
        department: clean(body.department) || null,
        exactLocation: clean(body.exactLocation) || null,

        observationDate: asDate(
          body.observationDate || body.date || new Date().toISOString(),
          'Observation date',
        ),
        observationType: clean(body.observationType).toUpperCase() || 'UNSAFE_CONDITION',
        riskLevel,
        description: clean(body.description),
        immediateAction: clean(body.immediateAction) || null,

        personObserved: clean(body.personObserved) || null,
        employeeId: clean(body.employeeId) || null,
        contractorName: clean(body.contractorName) || null,

        reportedBy: clean(body.reportedBy) || 'Safety reporter',
        reportedByEmail: clean(body.reportedByEmail) || null,

        photoUrls: body.photoUrls || [],
        gpsLatitude: asDecimal(body.gpsLatitude),
        gpsLongitude: asDecimal(body.gpsLongitude),

        mobileDraftId: clean(body.mobileDraftId) || null,
        idempotencyKey: clean(body.idempotencyKey) || null,
        syncStatus: clean(body.syncStatus) || 'SYNCED',
        deviceId: clean(body.deviceId) || null,
        capturedOfflineAt: body.capturedOfflineAt
          ? asDate(body.capturedOfflineAt, 'Captured offline date')
          : null,
        syncedAt: new Date(),

        status: isHighRisk(riskLevel) ? 'UNDER_REVIEW' : 'OPEN',
      },
    });

    let approvalWorkflow: any = null;

    if (isHighRisk(riskLevel)) {
      approvalWorkflow = await this.startSafetyWorkflow({
        workflowType: 'SAFETY_OBSERVATION_REVIEW',
        sourceType: 'SAFETY_OBSERVATION',
        sourceId: observation.id,
        requestNo: observation.observationNo,
        title: `Safety observation review - ${observation.observationNo}`,
        description: observation.description,
        siteName: observation.siteName,
        branch: observation.branch,
        department: observation.department,
        requestedBy: observation.reportedBy,
        requestedByEmail: observation.reportedByEmail,
        payload: observation,
      });

      const approvalRequestId = approvalRequestIdFrom(approvalWorkflow);

      const updatedObservation = await this.db().safetyObservation.update({
        where: { id: observation.id },
        data: {
          approvalRequestId,
          status: 'UNDER_REVIEW',
        },
      });

      return {
        ...updatedObservation,
        approvalWorkflow,
      };
    }

    return {
      ...observation,
      approvalWorkflow,
    };
  }

  async getIncidents(filter: { siteId?: string }) {
    const where: any = {};

    if (clean(filter.siteId)) {
      where.siteId = clean(filter.siteId);
    }

    return this.db().safetyIncident.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async createIncident(body: any) {
    const incidentNo = await this.nextRef(
      'SAFE-INC',
      'safetyIncident',
      'incidentNo',
    );

    const incident = await this.db().safetyIncident.create({
      data: {
        incidentNo,
        siteId: clean(body.siteId) || null,
        siteName: clean(body.siteName) || null,
        branch: clean(body.branch) || null,
        department: clean(body.department) || null,
        exactLocation: clean(body.exactLocation) || null,

        incidentDate: asDate(
          body.incidentDate || body.date || new Date().toISOString(),
          'Incident date',
        ),
        reportedDate: new Date(),

        incidentType: clean(body.incidentType).toUpperCase() || 'NEAR_MISS',
        severity: normaliseRisk(body.severity || body.riskLevel),
        description: clean(body.description),
        immediateAction: clean(body.immediateAction) || null,

        injuredPersonName: clean(body.injuredPersonName) || null,
        injuredEmployeeId: clean(body.injuredEmployeeId) || null,
        contractorCompany: clean(body.contractorCompany) || null,
        injuryType: clean(body.injuryType) || null,
        bodyPart: clean(body.bodyPart) || null,

        rootCause: clean(body.rootCause) || null,
        investigationNotes: clean(body.investigationNotes) || null,

        reportedBy: clean(body.reportedBy) || 'Safety reporter',
        reportedByEmail: clean(body.reportedByEmail) || null,

        photoUrls: body.photoUrls || [],
        gpsLatitude: asDecimal(body.gpsLatitude),
        gpsLongitude: asDecimal(body.gpsLongitude),

        mobileDraftId: clean(body.mobileDraftId) || null,
        idempotencyKey: clean(body.idempotencyKey) || null,
        syncStatus: clean(body.syncStatus) || 'SYNCED',
        deviceId: clean(body.deviceId) || null,
        capturedOfflineAt: body.capturedOfflineAt
          ? asDate(body.capturedOfflineAt, 'Captured offline date')
          : null,
        syncedAt: new Date(),

        status: 'SUBMITTED',
      },
    });

    const approvalWorkflow: any = await this.startSafetyWorkflow({
      workflowType: 'SAFETY_INCIDENT',
      sourceType: 'SAFETY_INCIDENT',
      sourceId: incident.id,
      requestNo: incident.incidentNo,
      title: `Safety incident review - ${incident.incidentNo}`,
      description: incident.description,
      siteName: incident.siteName,
      branch: incident.branch,
      department: incident.department,
      requestedBy: incident.reportedBy,
      requestedByEmail: incident.reportedByEmail,
      payload: incident,
    });

    const approvalRequestId = approvalRequestIdFrom(approvalWorkflow);

    const updatedIncident = await this.db().safetyIncident.update({
      where: { id: incident.id },
      data: {
        approvalRequestId,
        status: 'UNDER_REVIEW',
      },
    });

    return {
      ...updatedIncident,
      approvalWorkflow,
    };
  }

  async getCorrectiveActions(filter: { siteId?: string }) {
    const siteId = clean(filter.siteId);

    const where: any = {};

    if (siteId) {
      where.OR = [
        {
          observation: {
            siteId,
          },
        },
        {
          incident: {
            siteId,
          },
        },
      ];
    }

    return this.db().safetyCorrectiveAction.findMany({
      where,
      include: {
        observation: {
          select: {
            id: true,
            observationNo: true,
            siteName: true,
            exactLocation: true,
            riskLevel: true,
            status: true,
            description: true,
          },
        },
        incident: {
          select: {
            id: true,
            incidentNo: true,
            siteName: true,
            exactLocation: true,
            severity: true,
            status: true,
            description: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });
  }

  async createCorrectiveAction(body: any) {
    const sourceType = clean(body.sourceType).toUpperCase();
    const sourceId = clean(body.sourceId);

    if (!sourceType || !sourceId) {
      throw new BadRequestException('sourceType and sourceId are required.');
    }

    if (!clean(body.title)) {
      throw new BadRequestException('Corrective action title is required.');
    }

    if (!clean(body.description)) {
      throw new BadRequestException('Corrective action description is required.');
    }

    const actionNo = await this.nextRef(
      'SAFE-ACT',
      'safetyCorrectiveAction',
      'actionNo',
    );

    const data: any = {
      actionNo,
      sourceType,
      sourceId,

      title: clean(body.title),
      description: clean(body.description),
      priority: normaliseRisk(body.priority),

      assignedToName: clean(body.assignedToName) || null,
      assignedToEmail: clean(body.assignedToEmail) || null,
      dueDate: body.dueDate ? asDate(body.dueDate, 'Due date') : null,

      status: 'OPEN',
      createdBy: clean(body.createdBy) || null,
      createdByEmail: clean(body.createdByEmail) || null,
    };

    if (sourceType === 'SAFETY_OBSERVATION') {
      const observation = await this.db().safetyObservation.findUnique({
        where: { id: sourceId },
      });

      if (!observation) {
        throw new BadRequestException('Linked safety observation was not found.');
      }

      data.observationId = sourceId;
    } else if (sourceType === 'SAFETY_INCIDENT') {
      const incident = await this.db().safetyIncident.findUnique({
        where: { id: sourceId },
      });

      if (!incident) {
        throw new BadRequestException('Linked safety incident was not found.');
      }

      data.incidentId = sourceId;
    } else {
      throw new BadRequestException(
        'sourceType must be SAFETY_OBSERVATION or SAFETY_INCIDENT.',
      );
    }

    const action = await this.db().safetyCorrectiveAction.create({
      data,
      include: {
        observation: true,
        incident: true,
      },
    });

    if (sourceType === 'SAFETY_OBSERVATION') {
      await this.db().safetyObservation.update({
        where: { id: sourceId },
        data: {
          status: 'ACTION_REQUIRED',
        },
      });
    }

    if (sourceType === 'SAFETY_INCIDENT') {
      await this.db().safetyIncident.update({
        where: { id: sourceId },
        data: {
          status: 'ACTION_REQUIRED',
        },
      });
    }

    return action;
  }

  async updateCorrectiveActionStatus(id: string, body: any) {
    const action = await this.db().safetyCorrectiveAction.findUnique({
      where: { id },
    });

    if (!action) {
      throw new NotFoundException('Corrective action not found.');
    }

    const status = clean(body.status).toUpperCase();

    const updateData: any = {
      status,
      verificationNotes: clean(body.verificationNotes) || action.verificationNotes,
    };

    if (status === 'COMPLETED') {
      updateData.completedBy = clean(body.completedBy) || 'Safety user';
      updateData.completedAt = new Date();
    }

    if (status === 'VERIFIED') {
      updateData.verifiedBy = clean(body.verifiedBy) || 'Safety verifier';
      updateData.verifiedAt = new Date();
    }

    return this.db().safetyCorrectiveAction.update({
      where: { id },
      data: updateData,
    });
  }

  private async startSafetyWorkflow(input: {
    workflowType: 'SAFETY_INCIDENT' | 'SAFETY_OBSERVATION_REVIEW';
    sourceType: string;
    sourceId: string;
    requestNo: string;
    title: string;
    description: string;
    siteName?: string | null;
    branch?: string | null;
    department?: string | null;
    requestedBy?: string | null;
    requestedByEmail?: string | null;
    payload: any;
  }) {
    return this.approvalWorkflowService.startWorkflowSafe({
      module: 'SAFETY' as any,
      workflowType: input.workflowType as any,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      requestNo: input.requestNo,
      title: input.title,
      description: input.description,
      requestedBy: input.requestedBy || 'Safety reporter',
      requestedByEmail: input.requestedByEmail || null,
      requesterRole: 'SAFETY_REPORTER',
      department: input.department || null,
      site: input.siteName || null,
      branch: input.branch || null,
      amount: 0,
      currency: 'ZMW',
      payload: {
        ...input.payload,
        safetyModule: true,
        sourceType: input.sourceType,
        requestNo: input.requestNo,
      },
    });
  }
}