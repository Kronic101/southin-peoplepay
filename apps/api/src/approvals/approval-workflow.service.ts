import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApprovalRoutingService } from './approval-routing.service';
import {
  ApprovalDecisionStatus,
  ApprovalRequestStatus,
  ApprovalStepRole,
  ApprovalWorkflowType,
  OperationsModule,
  Prisma,
} from '@prisma/client';

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
export class ApprovalWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approvalRoutingService: ApprovalRoutingService,
  ) {}

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

  private normaliseSteps(value: any) {
    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }

    return [];
  }

  private getFirstStep(rule: any) {
    const steps = this.normaliseSteps(rule?.approvalSteps);

    return (
      steps
        .map((step: any, index: number) => ({
          ...step,
          sequence: Number(step.sequence || index + 1),
        }))
        .sort((a: any, b: any) => a.sequence - b.sequence)[0] || null
    );
  }

  private scoreMatrixRule(rule: any, input: any) {
    let score = 0;

    if (rule.module === input.module) score += 40;
    if (rule.workflowType === input.workflowType) score += 40;
    if (rule.site && rule.site === input.site) score += 30;
    if (rule.branch && rule.branch === input.branch) score += 20;
    if (rule.departmentId && rule.departmentId === input.departmentId) score += 20;

    const amount = asNumber(input.amount);

    if (rule.minAmount !== null && rule.minAmount !== undefined) {
      if (amount >= Number(rule.minAmount)) score += 10;
    }

    if (rule.maxAmount !== null && rule.maxAmount !== undefined) {
      if (amount <= Number(rule.maxAmount)) score += 10;
    }

    return score;
  }

  async findMatrixRule(input: {
    module: string;
    workflowType: string;
    site?: string | null;
    branch?: string | null;
    departmentId?: string | null;
    amount?: string | number | null;
  }) {
    const rules = await this.db().approvalMatrixRule.findMany({
      where: {
        module: input.module,
        workflowType: input.workflowType,
        isActive: true,
        AND: [
          { OR: [{ site: null }, { site: clean(input.site) || null }] },
          { OR: [{ branch: null }, { branch: clean(input.branch) || null }] },
          { OR: [{ departmentId: null }, { departmentId: clean(input.departmentId) || null }] },
        ],
      },
      orderBy: [{ createdAt: 'asc' }],
    });

    return (
      rules
        .map((rule: any) => ({
          rule,
          score: this.scoreMatrixRule(rule, input),
        }))
        .sort((a: any, b: any) => b.score - a.score)[0]?.rule || null
    );
  }

  async startWorkflow(input: {
    module: string;
    workflowType: string;
    sourceType?: string;
    sourceId: string;
    requestNo?: string | null;
    title?: string | null;
    description?: string | null;
    requestedBy?: string | null;
    requestedByEmail?: string | null;
    requesterRole?: string | null;
    department?: string | null;
    departmentId?: string | null;
    site?: string | null;
    branch?: string | null;
    amount?: string | number | null;
    currency?: string | null;
    payload?: any;
  }) {
    const module = clean(input.module);
    const workflowType = clean(input.workflowType);
    const sourceType = clean(input.sourceType) || module;
    const sourceId = clean(input.sourceId);

    if (!module) {
      throw new BadRequestException('Approval workflow module is required.');
    }

    if (!workflowType) {
      throw new BadRequestException('Approval workflow type is required.');
    }

    if (!sourceId) {
      throw new BadRequestException('Approval workflow sourceId is required.');
    }

    const matrixRule = await this.findMatrixRule({
      module,
      workflowType,
      site: input.site,
      branch: input.branch,
      departmentId: input.departmentId,
      amount: input.amount,
    });

    if (!matrixRule) {
      return {
        status: 'MATRIX_RULE_NOT_CONFIGURED',
        module,
        workflowType,
        message: 'No active approval matrix rule found for this workflow.',
      };
    }

    const firstStep = this.getFirstStep(matrixRule);

    if (!firstStep) {
      return {
        status: 'APPROVAL_STEPS_NOT_CONFIGURED',
        module,
        workflowType,
        matrixRule,
        message: 'Approval matrix rule exists but has no approval steps.',
      };
    }

    const steps = this.getOrderedSteps(matrixRule);

    const resolvedApprover = await this.approvalRoutingService.resolveApprover({
      module,
      workflowType,
      approvalRole: firstStep.role,
      site: input.site,
      branch: input.branch,
      departmentId: input.departmentId,
      requesterEmail: input.requestedByEmail,
    });

    const workflowStatus =
      resolvedApprover.status === 'APPROVER_RESOLVED' ||
      resolvedApprover.status === 'GROUP_APPROVER_RESOLVED' ||
      resolvedApprover.status === 'DELEGATED_APPROVER_RESOLVED'
        ? 'PENDING_APPROVAL'
        : 'APPROVER_NOT_CONFIGURED';

    const approverEmail =
      resolvedApprover?.approver?.email ||
      resolvedApprover?.originalApprover?.email ||
      null;

    const approverName =
      resolvedApprover?.approver?.name ||
      resolvedApprover?.originalApprover?.name ||
      null;

    const requestTitle =
      clean(input.title) ||
      `${workflowType.replaceAll('_', ' ')} approval ${clean(input.requestNo) || sourceId}`.trim();

    const requestReference = clean(input.requestNo) || sourceId;
    const requestDescription = clean(input.description) || requestTitle;

    const approvalRequestData = this.pickModelData('ApprovalRequest', {
      module,
      workflowType,

      requestTitle,
      requestReference,
      requestDescription,

      title: requestTitle,
      description: requestDescription,
      requestNo: requestReference,
      referenceNo: requestReference,

      requesterName: clean(input.requestedBy) || 'Requester',
      requestedBy: clean(input.requestedBy) || 'Requester',
      requesterEmail: clean(input.requestedByEmail) || null,
      requestedByEmail: clean(input.requestedByEmail) || null,
      requesterRole: clean(input.requesterRole) || 'REQUESTER',
      requesterDepartment: clean(input.department) || null,
      requesterSite: clean(input.site) || null,

      department: clean(input.department) || null,
      departmentId: clean(input.departmentId) || null,
      site: clean(input.site) || null,
      branch: clean(input.branch) || null,

      amount: input.amount === undefined || input.amount === null ? null : String(input.amount),
      currency: clean(input.currency) || 'ZMW',

      sourceEntityType: sourceType,
      sourceEntityId: sourceId,
      sourceType,
      sourceId,
      entityType: sourceType,
      entityId: sourceId,
      recordId: sourceId,

      approvalMatrixRuleId: matrixRule.id,
      matrixRuleId: matrixRule.id,

      status: 'SUBMITTED',
      approvalStatus: 'SUBMITTED',
      requestStatus: 'SUBMITTED',

      currentStep: firstStep.sequence,
      currentStepSequence: firstStep.sequence,
      currentStepRole: firstStep.role,
      currentApprovalRole: firstStep.role,

      currentApproverEmail: approverEmail,
      currentApproverName: approverName,
      approverEmail,
      approverName,
      assignedToEmail: approverEmail,
      assignedToName: approverName,
      currentAssigneeType: resolvedApprover.assigneeType || null,

      payload: {
        workflowStatus,
        sourceInput: input,
        firstStep,
        resolvedApprover,
        matrixRuleId: matrixRule.id,
      },
      metadata: {
        workflowStatus,
        sourceInput: input,
        firstStep,
        resolvedApprover,
        matrixRuleId: matrixRule.id,
      },
    });

      try {
      const approvalRequest = await this.db().approvalRequest.create({
        data: approvalRequestData,
      });

      const decisions: any[] = [];

      for (const step of steps) {
        const isFirstStep = Number(step.sequence) === Number(firstStep.sequence);

        const decision = await this.db().approvalDecision.create({
          data: {
            approvalRequestId: approvalRequest.id,
            sequence: Number(step.sequence),
            role: step.role as ApprovalStepRole,
            approverEmail: isFirstStep ? approverEmail : null,
            approverName: isFirstStep ? approverName : null,
            status: ApprovalDecisionStatus.PENDING,
          },
        });

        decisions.push(decision);
      }

      const firstDecision = decisions.find(
        (decision) => Number(decision.sequence) === Number(firstStep.sequence),
      );

      if (firstDecision && this.isResolvedApprover(resolvedApprover)) {
        await this.queueApprovalNotification({
          approvalRequest,
          decision: firstDecision,
          toEmail: approverEmail,
          toName: approverName,
        });
      }

      return {
        status: workflowStatus,
        module,
        workflowType,
        matrixRule,
        firstStep,
        resolvedApprover,
        approvalRequest,
        decisions,
      };
    } catch (error: any) {
      return {
        status: 'APPROVAL_REQUEST_CREATE_FAILED',
        module,
        workflowType,
        matrixRule,
        firstStep,
        resolvedApprover,
        attemptedData: approvalRequestData,
        error: error?.message || 'Could not create approval request.',
        errorCode: error?.code || null,
        errorMeta: error?.meta || null,
      };
    }
  }

  async startWorkflowSafe(input: {
    module: string;
    workflowType: string;
    sourceType?: string;
    sourceId: string;
    requestNo?: string | null;
    title?: string | null;
    description?: string | null;
    requestedBy?: string | null;
    requestedByEmail?: string | null;
    requesterRole?: string | null;
    department?: string | null;
    departmentId?: string | null;
    site?: string | null;
    branch?: string | null;
    amount?: string | number | null;
    currency?: string | null;
    payload?: any;
  }) {
    try {
      return await this.startWorkflow(input);
    } catch (error: any) {
      return {
        status: 'APPROVAL_WORKFLOW_START_FAILED',
        module: input.module,
        workflowType: input.workflowType,
        sourceId: input.sourceId,
        error: error?.message || 'Approval workflow could not be started.',
      };
    }
  }

  private getRequestPayload(request: any) {
    const payload = request?.payload || request?.metadata || {};

    if (typeof payload === 'string') {
      try {
        return JSON.parse(payload);
      } catch {
        return {};
      }
    }

    return payload || {};
  }

  private async getMatrixRuleByRequest(request: any) {
    const matrixRuleId =
      request.approvalMatrixRuleId ||
      request.matrixRuleId ||
      this.getRequestPayload(request)?.matrixRuleId;

    if (!matrixRuleId) {
      return null;
    }

    return this.db().approvalMatrixRule.findUnique({
      where: { id: matrixRuleId },
    });
  }

  private getCurrentStepSequence(request: any) {
    return Number(
      request.currentStepSequence ||
        request.currentStep ||
        this.getRequestPayload(request)?.firstStep?.sequence ||
        1,
    );
  }

  private getSourceType(request: any) {
    return (
      clean(request.sourceEntityType) ||
      clean(request.sourceType) ||
      clean(request.entityType) ||
      clean(this.getRequestPayload(request)?.sourceInput?.sourceType)
    );
  }

  private getSourceId(request: any) {
    return (
      clean(request.sourceEntityId) ||
      clean(request.sourceId) ||
      clean(request.entityId) ||
      clean(request.recordId) ||
      clean(this.getRequestPayload(request)?.sourceInput?.sourceId)
    );
  }

    private getOrderedSteps(rule: any) {
    return this.normaliseSteps(rule?.approvalSteps)
      .map((step: any, index: number) => ({
        ...step,
        sequence: Number(step.sequence || index + 1),
      }))
      .filter((step: any) => clean(step.role))
      .sort((a: any, b: any) => a.sequence - b.sequence);
  }

  private isResolvedApprover(result: any) {
    const status = clean(result?.status).toUpperCase();

    return [
      'APPROVER_RESOLVED',
      'GROUP_APPROVER_RESOLVED',
      'DELEGATED_APPROVER_RESOLVED',
    ].includes(status);
  }

  private getResolvedApproverEmail(result: any) {
    return (
      clean(result?.approver?.email) ||
      clean(result?.originalApprover?.email) ||
      null
    );
  }

  private getResolvedApproverName(result: any) {
    return (
      clean(result?.approver?.name) ||
      clean(result?.originalApprover?.name) ||
      null
    );
  }

  private getHubBaseUrl() {
    const base =
      clean(process.env.APP_BASE_URL) ||
      clean(process.env.NEXTAUTH_URL) ||
      'https://hub.southincon.com';

    return base.replace(/\/+$/, '');
  }

  private async queueApprovalNotification(input: {
    approvalRequest: any;
    decision: any;
    toEmail?: string | null;
    toName?: string | null;
  }) {
    const toEmail = clean(input.toEmail).toLowerCase();

    if (!toEmail) {
      return null;
    }

    const request = input.approvalRequest;
    const reference =
      clean(request.requestReference) ||
      clean(request.requestNo) ||
      clean(request.referenceNo) ||
      request.id;

    const title =
      clean(request.requestTitle) ||
      clean(request.title) ||
      `Approval required - ${reference}`;

    const requester =
      clean(request.requesterName) ||
      clean(request.requestedBy) ||
      'Requester';

    const requesterEmail =
      clean(request.requesterEmail) ||
      clean(request.requestedByEmail) ||
      '-';

    const amount =
      request.amount !== null && request.amount !== undefined
        ? `K ${request.amount}`
        : '-';

    const actionUrl = `${this.getHubBaseUrl()}/approvals/inbox?requestId=${request.id}`;

    return this.db().approvalNotificationQueue.create({
      data: {
        approvalRequestId: request.id,
        approvalDecisionId: input.decision?.id || null,
        module: clean(request.module) || null,
        workflowType: clean(request.workflowType) || null,
        approvalRole: clean(input.decision?.role) || null,
        toEmail,
        toName: clean(input.toName) || null,
        subject: `Southin Hub Approval Required - ${reference}`,
        bodyText: [
          'Approval required in Southin Hub.',
          '',
          `Reference: ${reference}`,
          `Title: ${title}`,
          `Module: ${clean(request.module) || '-'}`,
          `Workflow: ${clean(request.workflowType) || '-'}`,
          `Requester: ${requester}`,
          `Requester Email: ${requesterEmail}`,
          `Amount: ${amount}`,
          '',
          `Open the approval inbox: ${actionUrl}`,
        ].join('\n'),
        actionUrl,
        status: 'PENDING',
      },
    });
  }

  private async updateSourceStatus(request: any, status: string, body: any = {}) {
    const sourceType = this.getSourceType(request);
    const sourceId = this.getSourceId(request);

    if (!sourceType || !sourceId) {
      return null;
    }

    if (sourceType === 'STORES_REQUISITION') {
      return this.db().storesRequisition.update({
        where: { id: sourceId },
        data: {
          status,
          approvedBy: status === 'APPROVED' ? clean(body.approvedBy) || clean(body.actionedBy) || null : undefined,
          approvedAt: status === 'APPROVED' ? new Date() : undefined,
          rejectedBy: status === 'REJECTED' ? clean(body.rejectedBy) || clean(body.actionedBy) || null : undefined,
          rejectedAt: status === 'REJECTED' ? new Date() : undefined,
          rejectionReason:
            status === 'REJECTED'
              ? clean(body.rejectionReason) || clean(body.comments) || 'Rejected.'
              : undefined,
        },
      });
    }

    if (sourceType === 'ASSET_MOVEMENT') {
      return this.db().stockMovement.update({
        where: { id: sourceId },
        data: {
          status,
        },
      });
    }

    if (sourceType === 'FLEET_COST') {
      return this.db().fleetCostPosting.update({
        where: { id: sourceId },
        data: {
          status: status === 'APPROVED' ? 'APPROVED_FOR_FINANCE' : status,
        },
      });
    }

    return null;
  }

  async getWorkflows() {
    return this.db().approvalRequest.findMany({
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async getInbox(email?: string, role?: string) {
    const cleanEmail = clean(email).toLowerCase();
    const cleanRole = clean(role).toUpperCase();

    const bootstrapAdmins = String(process.env.SOUTHIN_BOOTSTRAP_ADMIN_EMAILS || '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

    const isAdmin =
      cleanRole === 'ADMIN' ||
      (!!cleanEmail && bootstrapAdmins.includes(cleanEmail));

    const roleFilter = this.staffRoleToApprovalStepRoles(cleanRole);

    const where: any = {
      status: {
        in: [
          ApprovalRequestStatus.SUBMITTED,
          ApprovalRequestStatus.IN_REVIEW,
        ],
      },
    };

    if (!isAdmin) {
      where.decisions = {
        some: {
          status: ApprovalDecisionStatus.PENDING,
          OR: [
            ...(cleanEmail
              ? [
                  { approverEmail: cleanEmail },
                  { actionedByEmail: cleanEmail },
                ]
              : []),
            ...(roleFilter.length
              ? roleFilter.map((approvalRole: ApprovalStepRole) => ({ role: approvalRole }))
              : []),
          ],
        },
      };
    }

    const records = await this.db().approvalRequest.findMany({
      where,
      include: {
        approvalMatrixRule: true,
        decisions: {
          orderBy: {
            sequence: 'asc',
          },
        },
      },
      orderBy: [
        {
          createdAt: 'desc',
        },
      ],
    });

    const assignments = await this.db().approvalApproverAssignment.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        { isPrimary: 'desc' },
        { isDefault: 'desc' },
        { priority: 'asc' },
      ],
    });

    return records.map((record: any) => {
      const pendingDecision = record.decisions?.find(
        (item: any) => item.status === ApprovalDecisionStatus.PENDING,
      );

      const assignment = pendingDecision
        ? assignments.find((item: any) => {
            const moduleMatches =
              !item.module || String(item.module) === String(record.module);

            const workflowMatches =
              !item.workflowType ||
              String(item.workflowType) === String(record.workflowType);

            const roleMatches =
              String(item.approvalRole) === String(pendingDecision.role);

            return moduleMatches && workflowMatches && roleMatches;
          })
        : null;

      const payload =
        record.payload && typeof record.payload === 'object' && !Array.isArray(record.payload)
          ? record.payload
          : {};

      return {
        ...record,

        currentStepRole: pendingDecision?.role || null,
        currentApprovalRole: pendingDecision?.role || null,

        currentApproverEmail:
          pendingDecision?.approverEmail ||
          assignment?.userEmail ||
          null,

        assignedToEmail: assignment?.userEmail || null,

        approverEmail:
          pendingDecision?.approverEmail ||
          assignment?.userEmail ||
          null,

        payload: {
          ...payload,
          nextStep: pendingDecision
            ? {
                sequence: pendingDecision.sequence,
                role: pendingDecision.role,
                label: `Step ${pendingDecision.sequence} - ${String(pendingDecision.role).replaceAll('_', ' ')}`,
              }
            : null,
          resolvedApprover: assignment
            ? {
                approver: {
                  name: assignment.userName,
                  email: assignment.userEmail,
                  microsoftUserId: assignment.microsoftUserId,
                },
                source: 'APPROVER_ASSIGNMENT',
              }
            : null,
        },
      };
    });
  }

  async approveWorkflow(id: string, body: any) {
    const request = await this.db().approvalRequest.findUnique({
      where: { id },
      include: {
        decisions: {
          orderBy: { sequence: 'asc' },
        },
      },
    });

    if (!request) {
      throw new BadRequestException('Approval request not found.');
    }

    const matrixRule = await this.getMatrixRuleByRequest(request);

    if (!matrixRule) {
      throw new BadRequestException('Approval matrix rule not found for this request.');
    }

    const steps = this.getOrderedSteps(matrixRule);
    const currentSequence = this.getCurrentStepSequence(request);

    const currentDecision = request.decisions?.find(
      (decision: any) =>
        Number(decision.sequence) === Number(currentSequence) &&
        decision.status === ApprovalDecisionStatus.PENDING,
    );

    if (!currentDecision) {
      throw new BadRequestException(
        `No pending approval decision found for step ${currentSequence}.`,
      );
    }

    const nextStep = steps.find(
      (step: any) => Number(step.sequence) > Number(currentSequence),
    );

    const payload = this.getRequestPayload(request);
    const history = Array.isArray(payload.history) ? payload.history : [];

    const actionedBy =
      clean(body.approvedBy) ||
      clean(body.actionedBy) ||
      clean(body.userName) ||
      'Approver';

    const actionedByEmail =
      clean(body.approvedByEmail) ||
      clean(body.actionedByEmail) ||
      clean(body.userEmail) ||
      null;

    const actionedByRole =
      clean(body.approverRole) ||
      clean(body.userRole) ||
      clean(body.role) ||
      null;

    const comments =
      clean(body.comments) ||
      'Approved from Southin Hub approval inbox.';

    const now = new Date();

    const updatedHistory = [
      ...history,
      {
        action: 'APPROVED',
        stepSequence: currentSequence,
        actionedBy,
        actionedByEmail,
        actionedByRole,
        comments,
        actionedAt: now.toISOString(),
      },
    ];

    await this.db().approvalDecision.update({
      where: { id: currentDecision.id },
      data: {
        status: ApprovalDecisionStatus.APPROVED,
        approverName: clean(currentDecision.approverName) || actionedBy,
        approverEmail: clean(currentDecision.approverEmail) || actionedByEmail,
        actionedBy,
        actionedByEmail,
        actionedByRole,
        comments,
        decidedAt: now,
      },
    });

    if (!nextStep) {
      const updatedRequest = await this.db().approvalRequest.update({
        where: { id },
        data: this.pickModelData('ApprovalRequest', {
          status: ApprovalRequestStatus.APPROVED,
          approvalStatus: 'APPROVED',
          requestStatus: 'APPROVED',
          closedAt: now,
          approvedBy: actionedBy,
          approvedAt: now,
          payload: {
            ...payload,
            history: updatedHistory,
            workflowStatus: 'APPROVED',
            completedAt: now.toISOString(),
          },
          metadata: {
            ...payload,
            history: updatedHistory,
            workflowStatus: 'APPROVED',
            completedAt: now.toISOString(),
          },
        }),
      });

      const sourceUpdate = await this.updateSourceStatus(request, 'APPROVED', {
        ...body,
        approvedBy: actionedBy,
      });

      return {
        status: 'APPROVED',
        approvalRequest: updatedRequest,
        sourceUpdate,
        message: 'Approval completed successfully.',
      };
    }

    const sourceInput = payload.sourceInput || {};

    const resolvedApprover = await this.approvalRoutingService.resolveApprover({
      module: request.module,
      workflowType: request.workflowType,
      approvalRole: nextStep.role,
      site: request.site || request.requesterSite || sourceInput.site,
      branch: request.branch || sourceInput.branch,
      departmentId: request.departmentId || sourceInput.departmentId,
      requesterEmail: request.requesterEmail || sourceInput.requestedByEmail,
    });

    const nextApproverEmail = this.getResolvedApproverEmail(resolvedApprover);
    const nextApproverName = this.getResolvedApproverName(resolvedApprover);

    const workflowStatus = this.isResolvedApprover(resolvedApprover)
      ? 'PENDING_APPROVAL'
      : 'APPROVER_NOT_CONFIGURED';

    const requestStatus =
      workflowStatus === 'PENDING_APPROVAL'
        ? ApprovalRequestStatus.IN_REVIEW
        : ApprovalRequestStatus.SUBMITTED;

    let nextDecision = request.decisions?.find(
      (decision: any) => Number(decision.sequence) === Number(nextStep.sequence),
    );

    if (!nextDecision) {
      nextDecision = await this.db().approvalDecision.create({
        data: {
          approvalRequestId: request.id,
          sequence: Number(nextStep.sequence),
          role: nextStep.role as ApprovalStepRole,
          approverEmail: nextApproverEmail,
          approverName: nextApproverName,
          status: ApprovalDecisionStatus.PENDING,
        },
      });
    } else {
      nextDecision = await this.db().approvalDecision.update({
        where: { id: nextDecision.id },
        data: {
          approverEmail: nextApproverEmail,
          approverName: nextApproverName,
        },
      });
    }

    const updatedRequest = await this.db().approvalRequest.update({
      where: { id },
      data: this.pickModelData('ApprovalRequest', {
        status: requestStatus,
        approvalStatus: requestStatus,
        requestStatus,

        currentStep: Number(nextStep.sequence),
        currentStepSequence: Number(nextStep.sequence),
        currentStepRole: nextStep.role,
        currentApprovalRole: nextStep.role,

        currentApproverEmail: nextApproverEmail,
        currentApproverName: nextApproverName,
        approverEmail: nextApproverEmail,
        approverName: nextApproverName,
        assignedToEmail: nextApproverEmail,
        assignedToName: nextApproverName,

        payload: {
          ...payload,
          history: updatedHistory,
          nextStep: {
            ...nextStep,
            approverEmail: nextApproverEmail,
            approverName: nextApproverName,
          },
          resolvedApprover,
          workflowStatus,
        },
        metadata: {
          ...payload,
          history: updatedHistory,
          nextStep: {
            ...nextStep,
            approverEmail: nextApproverEmail,
            approverName: nextApproverName,
          },
          resolvedApprover,
          workflowStatus,
        },
      }),
    });

    if (this.isResolvedApprover(resolvedApprover)) {
      await this.queueApprovalNotification({
        approvalRequest: updatedRequest,
        decision: nextDecision,
        toEmail: nextApproverEmail,
        toName: nextApproverName,
      });
    }

    return {
      status: workflowStatus,
      approvalRequest: updatedRequest,
      nextStep,
      resolvedApprover,
      nextDecision,
    };
  }

  async rejectWorkflow(id: string, body: any) {
    const request = await this.db().approvalRequest.findUnique({
      where: { id },
      include: {
        decisions: {
          orderBy: { sequence: 'asc' },
        },
      },
    });

    if (!request) {
      throw new BadRequestException('Approval request not found.');
    }

    const currentSequence = this.getCurrentStepSequence(request);

    const currentDecision = request.decisions?.find(
      (decision: any) =>
        Number(decision.sequence) === Number(currentSequence) &&
        decision.status === ApprovalDecisionStatus.PENDING,
    );

    if (!currentDecision) {
      throw new BadRequestException(
        `No pending approval decision found for step ${currentSequence}.`,
      );
    }

    const payload = this.getRequestPayload(request);
    const history = Array.isArray(payload.history) ? payload.history : [];

    const actionedBy =
      clean(body.rejectedBy) ||
      clean(body.actionedBy) ||
      clean(body.userName) ||
      'Approver';

    const actionedByEmail =
      clean(body.rejectedByEmail) ||
      clean(body.actionedByEmail) ||
      clean(body.userEmail) ||
      null;

    const actionedByRole =
      clean(body.approverRole) ||
      clean(body.userRole) ||
      clean(body.role) ||
      null;

    const comments =
      clean(body.comments) ||
      clean(body.rejectionReason) ||
      'Rejected from Southin Hub approval inbox.';

    const now = new Date();

    const updatedHistory = [
      ...history,
      {
        action: 'REJECTED',
        stepSequence: currentSequence,
        actionedBy,
        actionedByEmail,
        actionedByRole,
        comments,
        actionedAt: now.toISOString(),
      },
    ];

    await this.db().approvalDecision.update({
      where: { id: currentDecision.id },
      data: {
        status: ApprovalDecisionStatus.REJECTED,
        approverName: clean(currentDecision.approverName) || actionedBy,
        approverEmail: clean(currentDecision.approverEmail) || actionedByEmail,
        actionedBy,
        actionedByEmail,
        actionedByRole,
        comments,
        decidedAt: now,
      },
    });

    const updatedRequest = await this.db().approvalRequest.update({
      where: { id },
      data: this.pickModelData('ApprovalRequest', {
        status: ApprovalRequestStatus.REJECTED,
        approvalStatus: 'REJECTED',
        requestStatus: 'REJECTED',
        closedAt: now,
        rejectedBy: actionedBy,
        rejectedAt: now,
        rejectionReason: comments,
        payload: {
          ...payload,
          history: updatedHistory,
          workflowStatus: 'REJECTED',
          rejectedAt: now.toISOString(),
        },
        metadata: {
          ...payload,
          history: updatedHistory,
          workflowStatus: 'REJECTED',
          rejectedAt: now.toISOString(),
        },
      }),
    });

    const sourceUpdate = await this.updateSourceStatus(request, 'REJECTED', {
      ...body,
      rejectedBy: actionedBy,
      rejectionReason: comments,
    });

    return {
      status: 'REJECTED',
      approvalRequest: updatedRequest,
      sourceUpdate,
      message: 'Approval request rejected.',
    };
  }

  private staffRoleToApprovalStepRoles(role: string): ApprovalStepRole[] {
    const cleanRole = clean(role).toUpperCase();

    if (!cleanRole || cleanRole === 'ADMIN') {
      return [];
    }

    const map: Record<string, ApprovalStepRole[]> = {
      DIRECTOR: [
        ApprovalStepRole.DIRECTOR,
        ApprovalStepRole.DIRECTOR_FINANCE,
        ApprovalStepRole.DIRECTOR_OPERATIONS,
      ],

      FINANCE_MANAGER: [
        ApprovalStepRole.FINANCE_MANAGER,
        ApprovalStepRole.DIRECTOR_FINANCE,
      ],

      FINANCE_OFFICER: [
        ApprovalStepRole.FINANCE_MANAGER,
      ],

      HR_MANAGER: [
        ApprovalStepRole.HR_MANAGER,
      ],

      HR_OFFICER: [
        ApprovalStepRole.HR_MANAGER,
      ],

      LINE_MANAGER: [
        ApprovalStepRole.LINE_MANAGER,
        ApprovalStepRole.SUPERVISOR,
        ApprovalStepRole.HOD,
        ApprovalStepRole.SITE_MANAGER,
        ApprovalStepRole.FOREMAN,
        ApprovalStepRole.BRANCH_MANAGER,
      ],

      SUPERVISOR: [
        ApprovalStepRole.SUPERVISOR,
        ApprovalStepRole.LINE_MANAGER,
        ApprovalStepRole.FOREMAN,
      ],

      PAYROLL_OFFICER: [
        ApprovalStepRole.PAYROLL_OFFICER,
      ],

      PROCUREMENT_OFFICER: [
        ApprovalStepRole.PROCUREMENT_OFFICER,
      ],

      STORES_OFFICER: [
        ApprovalStepRole.STORES_OFFICER,
      ],

      ASSET_MANAGER: [
        ApprovalStepRole.ASSET_MANAGER,
      ],

      ASSET_OFFICER: [
        ApprovalStepRole.ASSET_MANAGER,
      ],

      FLEET_MANAGER: [
        ApprovalStepRole.FLEET_MANAGER,
        ApprovalStepRole.WORKSHOP_MANAGER,
      ],

      FLEET_DISPATCH_OFFICER: [
        ApprovalStepRole.FLEET_DISPATCH_OFFICER,
      ],

      SAFETY_OFFICER: [
        ApprovalStepRole.SAFETY_OFFICER,
      ],

      QAQC_OFFICER: [
        ApprovalStepRole.QUALITY_ADMIN_MANAGER,
      ],

      AUDITOR: [],
    };

    return map[cleanRole] || [];
  }
}