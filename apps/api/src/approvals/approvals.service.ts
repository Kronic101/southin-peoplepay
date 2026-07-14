import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ApprovalDecisionStatus,
  ApprovalRequestStatus,
  ApprovalStepRole,
  ApprovalWorkflowType,
  OperationsModule,
  Prisma,
} from '@prisma/client';
import { buildApprovalNotificationBody } from './approval-notification-details';
import { PrismaService } from '../prisma/prisma.service';

type ApprovalStep = {
  sequence: number;
  role: ApprovalStepRole;
  required?: boolean;
  label?: string;
};

type ApprovalActionPayload = {
  sequence?: number;
  decision?: 'APPROVED' | 'REJECTED';

  approverEmployeeId?: string;
  approverName?: string;
  approverEmail?: string;
  approverEntraObjectId?: string;
  approverRole?: string;

  actionedBy?: string;
  actionedByEmail?: string;
  actionedByEntraId?: string;
  actionedByRole?: string;

  comments?: string;
  rejectionReason?: string;
};

function asDecimal(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined;
  return new Prisma.Decimal(Number(value || 0));
}

function asJson(value: unknown) {
  if (value === undefined || value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

function normaliseRole(value: unknown) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replaceAll(' ', '_')
    .replaceAll('-', '_');
}

function toApprovalStepRole(value?: string | null): ApprovalStepRole | null {
  const role = normaliseRole(value);
  if (!role) return null;

  if ((Object.values(ApprovalStepRole) as string[]).includes(role)) {
    return role as ApprovalStepRole;
  }

  const aliases: Record<string, ApprovalStepRole> = {
    ADMINISTRATOR: ApprovalStepRole.ADMIN,
    SYSTEM_ADMIN: ApprovalStepRole.ADMIN,
    FINANCE: ApprovalStepRole.FINANCE_MANAGER,
    FINANCE_OFFICER: ApprovalStepRole.FINANCE_MANAGER,
    HR: ApprovalStepRole.HR_MANAGER,
    HR_OFFICER: ApprovalStepRole.HR_MANAGER,
    PROCUREMENT: ApprovalStepRole.PROCUREMENT_OFFICER,
    STORES: ApprovalStepRole.STORES_OFFICER,
    ASSET_OFFICER: ApprovalStepRole.ASSET_MANAGER,
    FLEET: ApprovalStepRole.FLEET_MANAGER,
    DISPATCH: ApprovalStepRole.FLEET_DISPATCH_OFFICER,
    FLEET_DISPATCH: ApprovalStepRole.FLEET_DISPATCH_OFFICER,
    SUPERVISOR: ApprovalStepRole.SUPERVISOR,
    LINE_SUPERVISOR: ApprovalStepRole.LINE_MANAGER,
    QAQC: ApprovalStepRole.QUALITY_ADMIN_MANAGER,
    QUALITY: ApprovalStepRole.QUALITY_ADMIN_MANAGER,
    SAFETY: ApprovalStepRole.SAFETY_OFFICER,
  };

  return aliases[role] || null;
}

@Injectable()
export class ApprovalsService {
  constructor(private readonly prisma: PrismaService) {}

  async getApprovalMatrix() {
    return this.prisma.approvalMatrixRule.findMany({
      orderBy: [{ module: 'asc' }, { workflowType: 'asc' }, { minAmount: 'asc' }],
      include: { department: true },
    });
  }

  async createApprovalMatrixRule(payload: {
    module: OperationsModule;
    workflowType: ApprovalWorkflowType;
    name: string;
    description?: string;
    departmentId?: string;
    site?: string;
    branch?: string;
    minAmount?: number;
    maxAmount?: number;
    requiresFinance?: boolean;
    requiresDirector?: boolean;
    approvalSteps: ApprovalStep[];
  }) {
    if (!payload.approvalSteps?.length) {
      throw new BadRequestException('approvalSteps is required.');
    }

    return this.prisma.approvalMatrixRule.create({
      data: {
        module: payload.module,
        workflowType: payload.workflowType,
        name: payload.name,
        description: payload.description,
        departmentId: payload.departmentId,
        site: payload.site,
        branch: payload.branch,
        minAmount: asDecimal(payload.minAmount),
        maxAmount: asDecimal(payload.maxAmount),
        requiresFinance: payload.requiresFinance ?? false,
        requiresDirector: payload.requiresDirector ?? false,
        approvalSteps: payload.approvalSteps as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async resolveApprovalRule(payload: {
    module: OperationsModule;
    workflowType: ApprovalWorkflowType;
    amount?: number;
    departmentId?: string;
    site?: string;
    branch?: string;
  }) {
    const amount = Number(payload.amount || 0);

    const rules = await this.prisma.approvalMatrixRule.findMany({
      where: {
        module: payload.module,
        workflowType: payload.workflowType,
        isActive: true,
      },
      orderBy: [{ requiresDirector: 'desc' }, { requiresFinance: 'desc' }, { minAmount: 'desc' }],
    });

    return (
      rules.find((rule) => {
        const min = rule.minAmount === null ? null : Number(rule.minAmount);
        const max = rule.maxAmount === null ? null : Number(rule.maxAmount);

        const amountFits = (min === null || amount >= min) && (max === null || amount <= max);
        const departmentFits = !rule.departmentId || rule.departmentId === payload.departmentId;
        const siteFits = !rule.site || rule.site === payload.site;
        const branchFits = !rule.branch || rule.branch === payload.branch;

        return amountFits && departmentFits && siteFits && branchFits;
      }) || null
    );
  }

  async createApprovalRequest(payload: {
    module: OperationsModule;
    workflowType: ApprovalWorkflowType;
    requestTitle: string;
    requestReference?: string;
    requestDescription?: string;

    requesterEmployeeId?: string;
    requesterName?: string;
    requesterEmail?: string;
    requesterEntraId?: string;
    requesterRole?: string;
    requesterDepartment?: string;
    requesterSite?: string;

    amount?: number;
    sourceEntityType?: string;
    sourceEntityId?: string;
    payload?: unknown;

    departmentId?: string;
    site?: string;
    branch?: string;
  }) {
    const rule = await this.resolveApprovalRule({
      module: payload.module,
      workflowType: payload.workflowType,
      amount: payload.amount,
      departmentId: payload.departmentId,
      site: payload.site,
      branch: payload.branch,
    });

    if (!rule) {
      throw new BadRequestException(
        `No approval matrix rule found for ${payload.module} / ${payload.workflowType}.`,
      );
    }

    const approvalSteps = (rule.approvalSteps as unknown as ApprovalStep[])
      .filter((step) => step?.role)
      .sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0));

    if (!approvalSteps.length) {
      throw new BadRequestException('The matched approval matrix rule has no valid approval steps.');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const request = await tx.approvalRequest.create({
        data: {
          module: payload.module,
          workflowType: payload.workflowType,
          requestTitle: payload.requestTitle,
          requestReference: payload.requestReference,
          requestDescription: payload.requestDescription,

          requesterEmployeeId: payload.requesterEmployeeId,
          requesterName: payload.requesterName,
          requesterEmail: payload.requesterEmail,
          requesterEntraId: payload.requesterEntraId,
          requesterRole: payload.requesterRole,
          requesterDepartment: payload.requesterDepartment,
          requesterSite: payload.requesterSite,

          amount: asDecimal(payload.amount),
          sourceEntityType: payload.sourceEntityType,
          sourceEntityId: payload.sourceEntityId,
          approvalMatrixRuleId: rule.id,
          payload: asJson(payload.payload),
          status: ApprovalRequestStatus.SUBMITTED,
          currentStep: approvalSteps[0]?.sequence || 1,
        },
      });

      await tx.approvalDecision.createMany({
        data: approvalSteps.map((step) => ({
          approvalRequestId: request.id,
          sequence: step.sequence,
          role: step.role,
          status: ApprovalDecisionStatus.PENDING,
        })),
      });

      return tx.approvalRequest.findUnique({
        where: { id: request.id },
        include: {
          approvalMatrixRule: true,
          decisions: { orderBy: { sequence: 'asc' } },
        },
      });
    });

    if (created?.id) {
      await this.queueApprovalNotification(created.id);
    }

    return created;
  }

  async getApprovalRequests() {
    return this.prisma.approvalRequest.findMany({
      orderBy: { submittedAt: 'desc' },
      include: {
        approvalMatrixRule: true,
        decisions: { orderBy: { sequence: 'asc' } },
      },
    });
  }

  async getApprovalWorkflows() {
    return this.getApprovalRequests();
  }

  async getApprovalRequest(id: string) {
    const request = await this.prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        approvalMatrixRule: true,
        decisions: { orderBy: { sequence: 'asc' } },
      },
    });

    if (!request) {
      throw new NotFoundException('Approval request not found.');
    }

    return request;
  }

  async getApprovalInbox(filter?: { email?: string; role?: string }) {
    const email = String(filter?.email || '').trim().toLowerCase();
    const staffRole = normaliseRole(filter?.role);
    const stepRole = toApprovalStepRole(staffRole);

    if (staffRole === 'ADMIN') {
      return this.prisma.approvalRequest.findMany({
        where: {
          status: { in: [ApprovalRequestStatus.SUBMITTED, ApprovalRequestStatus.IN_REVIEW] },
          decisions: { some: { status: ApprovalDecisionStatus.PENDING } },
        },
        orderBy: { submittedAt: 'desc' },
        include: {
          approvalMatrixRule: true,
          decisions: { orderBy: { sequence: 'asc' } },
        },
      });
    }

    const assignmentRoles = email
      ? await this.prisma.approvalApproverAssignment.findMany({
          where: {
            isActive: true,
            userEmail: { equals: email, mode: 'insensitive' },
          },
          select: { approvalRole: true },
        })
      : [];

    const roleSet = new Set<ApprovalStepRole>();

    if (stepRole) roleSet.add(stepRole);
    for (const assignment of assignmentRoles) {
      roleSet.add(assignment.approvalRole);
    }

    const roles = Array.from(roleSet);

    if (!roles.length) return [];

    return this.prisma.approvalRequest.findMany({
      where: {
        status: { in: [ApprovalRequestStatus.SUBMITTED, ApprovalRequestStatus.IN_REVIEW] },
        decisions: {
          some: {
            status: ApprovalDecisionStatus.PENDING,
            role: { in: roles },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
      include: {
        approvalMatrixRule: true,
        decisions: { orderBy: { sequence: 'asc' } },
      },
    });
  }

  async approveApprovalWorkflow(id: string, payload: ApprovalActionPayload = {}) {
    const request = await this.getApprovalRequest(id);
    const nextStep = request.decisions.find((item) => item.status === ApprovalDecisionStatus.PENDING);

    if (!nextStep) {
      throw new BadRequestException('No pending approval step found.');
    }

    return this.recordDecision(id, {
      ...payload,
      sequence: payload.sequence || nextStep.sequence,
      decision: 'APPROVED',
      approverRole: payload.approverRole || String(nextStep.role),
      comments: payload.comments || 'Approved from Southin Hub approval inbox.',
    });
  }

  async rejectApprovalWorkflow(id: string, payload: ApprovalActionPayload = {}) {
    const request = await this.getApprovalRequest(id);
    const nextStep = request.decisions.find((item) => item.status === ApprovalDecisionStatus.PENDING);

    if (!nextStep) {
      throw new BadRequestException('No pending approval step found.');
    }

    return this.recordDecision(id, {
      ...payload,
      sequence: payload.sequence || nextStep.sequence,
      decision: 'REJECTED',
      approverRole: payload.approverRole || String(nextStep.role),
      comments:
        payload.comments ||
        payload.rejectionReason ||
        'Rejected from Southin Hub approval inbox.',
    });
  }

  async recordDecision(id: string, payload: ApprovalActionPayload & { sequence: number; decision: 'APPROVED' | 'REJECTED' }) {
    const request = await this.getApprovalRequest(id);

    if (
      request.status === ApprovalRequestStatus.APPROVED ||
      request.status === ApprovalRequestStatus.REJECTED ||
      request.status === ApprovalRequestStatus.CANCELLED ||
      request.status === ApprovalRequestStatus.CLOSED
    ) {
      throw new BadRequestException('This approval request is already closed.');
    }

    const decision = request.decisions.find((item) => item.sequence === payload.sequence);

    if (!decision) {
      throw new NotFoundException('Approval decision step not found.');
    }

    if (decision.status !== ApprovalDecisionStatus.PENDING) {
      throw new BadRequestException('This approval step has already been actioned.');
    }

    const decisionStatus =
      payload.decision === 'APPROVED'
        ? ApprovalDecisionStatus.APPROVED
        : ApprovalDecisionStatus.REJECTED;

    await this.prisma.approvalDecision.update({
      where: { id: decision.id },
      data: {
        status: decisionStatus,
        approverEmployeeId: payload.approverEmployeeId,
        approverName: payload.approverName || payload.actionedBy,
        approverEmail: payload.approverEmail || payload.actionedByEmail,
        approverEntraObjectId: payload.approverEntraObjectId || payload.actionedByEntraId,
        approverRole: payload.approverRole || payload.actionedByRole || String(decision.role),
        actionedBy: payload.actionedBy || payload.approverName,
        actionedByEmail: payload.actionedByEmail || payload.approverEmail,
        actionedByEntraId: payload.actionedByEntraId || payload.approverEntraObjectId,
        actionedByRole: payload.actionedByRole || payload.approverRole || String(decision.role),
        comments: payload.comments || payload.rejectionReason,
        decidedAt: new Date(),
      },
    });

    const updated = await this.getApprovalRequest(id);

    const hasRejected = updated.decisions.some(
      (item) => item.status === ApprovalDecisionStatus.REJECTED,
    );

    const allApproved = updated.decisions.every(
      (item) => item.status === ApprovalDecisionStatus.APPROVED,
    );

    if (hasRejected) {
      await this.prisma.approvalRequest.update({
        where: { id },
        data: {
          status: ApprovalRequestStatus.REJECTED,
          closedAt: new Date(),
        },
      });
    } else if (allApproved) {
      await this.prisma.approvalRequest.update({
        where: { id },
        data: {
          status: ApprovalRequestStatus.APPROVED,
          closedAt: new Date(),
        },
      });
    } else {
      const nextPending = updated.decisions.find(
        (item) => item.status === ApprovalDecisionStatus.PENDING,
      );

      await this.prisma.approvalRequest.update({
        where: { id },
        data: {
          status: ApprovalRequestStatus.IN_REVIEW,
          currentStep: nextPending?.sequence || updated.currentStep,
        },
      });

      await this.queueApprovalNotification(id);
    }

    return this.getApprovalRequest(id);
  }

  async queueApprovalNotification(requestId: string) {
    const request = await this.prisma.approvalRequest.findUnique({
      where: { id: requestId },
      include: {
        decisions: { orderBy: { sequence: 'asc' } },
      },
    });

    if (!request) return null;

    const pendingDecision = request.decisions.find(
      (item) => item.status === ApprovalDecisionStatus.PENDING,
    );

    if (!pendingDecision) return null;

    const assignment = await this.prisma.approvalApproverAssignment.findFirst({
      where: {
        isActive: true,
        approvalRole: pendingDecision.role,
        OR: [
          { module: String(request.module), workflowType: request.workflowType },
          { module: String(request.module), workflowType: null },
          { module: null, workflowType: request.workflowType },
          { module: null, workflowType: null },
        ],
      },
      orderBy: [
        { isPrimary: 'desc' },
        { isDefault: 'desc' },
        { priority: 'asc' },
      ],
    });

    if (!assignment?.userEmail) return null;

    const appUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    const actionUrl = `${appUrl}/approvals/inbox?requestId=${request.id}`;

    return this.prisma.approvalNotificationQueue.create({
      data: {
        approvalRequestId: request.id,
        approvalDecisionId: pendingDecision.id,
        module: String(request.module),
        workflowType: String(request.workflowType),
        approvalRole: String(pendingDecision.role),
        toEmail: assignment.userEmail,
        toName: assignment.userName || assignment.userEmail,
        subject: `Southin Hub Approval Required - ${request.requestReference || request.requestTitle}`,
        bodyText: buildApprovalNotificationBody({
          id: request.id,
          module: request.module,
          workflowType: request.workflowType,
          requestTitle: request.requestTitle,
          requestReference: request.requestReference,
          requestDescription: request.requestDescription,
          requesterName: request.requesterName,
          requesterEmail: request.requesterEmail,
          requesterDepartment: request.requesterDepartment,
          requesterSite: request.requesterSite,
          amount: request.amount,
          payload: request.payload,
        }),
        actionUrl,
        status: 'PENDING',
      },
    });
  }

  async getQueuedApprovalNotifications(status = 'PENDING') {
    return this.prisma.approvalNotificationQueue.findMany({
      where: { status },
      orderBy: { queuedAt: 'asc' },
    });
  }

  async seedDefaultApprovalRules() {
    const existingCount = await this.prisma.approvalMatrixRule.count();

    if (existingCount > 0) {
      return {
        message: 'Approval matrix already contains rules. Seed skipped.',
        existingCount,
      };
    }

    const rules: Array<{
      module: OperationsModule;
      workflowType: ApprovalWorkflowType;
      name: string;
      description: string;
      minAmount?: number;
      maxAmount?: number;
      requiresFinance?: boolean;
      requiresDirector?: boolean;
      approvalSteps: ApprovalStep[];
    }> = [
      {
        module: OperationsModule.HR,
        workflowType: ApprovalWorkflowType.LEAVE_REQUEST,
        name: 'Leave request approval',
        description: 'Employee leave approval through line manager and HR.',
        requiresFinance: false,
        requiresDirector: false,
        approvalSteps: [
          { sequence: 1, role: ApprovalStepRole.LINE_MANAGER, required: true },
          { sequence: 2, role: ApprovalStepRole.HR_MANAGER, required: true },
        ],
      },
      {
        module: OperationsModule.FINANCE,
        workflowType: ApprovalWorkflowType.EXPENSE_REQUEST,
        name: 'Standard expense approval',
        description: 'Low to medium value expenses approved by HOD and Finance.',
        minAmount: 0,
        maxAmount: 5000,
        requiresFinance: true,
        requiresDirector: false,
        approvalSteps: [
          { sequence: 1, role: ApprovalStepRole.HOD, required: true },
          { sequence: 2, role: ApprovalStepRole.FINANCE_MANAGER, required: true },
        ],
      },
      {
        module: OperationsModule.FINANCE,
        workflowType: ApprovalWorkflowType.EXPENSE_REQUEST,
        name: 'High value expense approval',
        description: 'High value expenses require HOD, Finance, and Director Finance approval.',
        minAmount: 5000.01,
        requiresFinance: true,
        requiresDirector: true,
        approvalSteps: [
          { sequence: 1, role: ApprovalStepRole.HOD, required: true },
          { sequence: 2, role: ApprovalStepRole.FINANCE_MANAGER, required: true },
          { sequence: 3, role: ApprovalStepRole.DIRECTOR_FINANCE, required: true },
        ],
      },
      {
        module: OperationsModule.PROCUREMENT,
        workflowType: ApprovalWorkflowType.PROCUREMENT_REQUEST,
        name: 'Procurement payment approval',
        description: 'Procurement requests reviewed by procurement, finance, and operations.',
        requiresFinance: true,
        requiresDirector: false,
        approvalSteps: [
          { sequence: 1, role: ApprovalStepRole.PROCUREMENT_OFFICER, required: true },
          { sequence: 2, role: ApprovalStepRole.FINANCE_MANAGER, required: true },
          { sequence: 3, role: ApprovalStepRole.OPERATIONS_MANAGER, required: true },
        ],
      },
      {
        module: OperationsModule.ASSET_MANAGEMENT,
        workflowType: ApprovalWorkflowType.ASSET_PURCHASE,
        name: 'Asset purchase approval',
        description: 'Asset purchases reviewed by Asset Manager, Finance, and Director Operations.',
        requiresFinance: true,
        requiresDirector: true,
        approvalSteps: [
          { sequence: 1, role: ApprovalStepRole.ASSET_MANAGER, required: true },
          { sequence: 2, role: ApprovalStepRole.FINANCE_MANAGER, required: true },
          { sequence: 3, role: ApprovalStepRole.DIRECTOR_OPERATIONS, required: true },
        ],
      },
      {
        module: OperationsModule.PAYROLL,
        workflowType: ApprovalWorkflowType.PAYROLL_RUN,
        name: 'Payroll run approval',
        description: 'Payroll run approval path through HR, Finance, and Director.',
        requiresFinance: true,
        requiresDirector: true,
        approvalSteps: [
          { sequence: 1, role: ApprovalStepRole.HR_MANAGER, required: true },
          { sequence: 2, role: ApprovalStepRole.FINANCE_MANAGER, required: true },
          { sequence: 3, role: ApprovalStepRole.DIRECTOR, required: true },
        ],
      },
    ];

    for (const rule of rules) {
      await this.createApprovalMatrixRule(rule);
    }

    return {
      message: 'Default Southin approval matrix rules seeded successfully.',
      rules: rules.length,
    };
  }
}
