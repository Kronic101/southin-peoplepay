import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ApprovalDecisionStatus,
  ApprovalRequestStatus,
  ApprovalStepRole,
  ApprovalWorkflowType,
  OperationsModule,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type ApprovalStep = {
  sequence: number;
  role: ApprovalStepRole;
  required?: boolean;
};

@Injectable()
export class ApprovalsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns all active approval matrix rules.
   */
  async getApprovalMatrix() {
    return this.prisma.approvalMatrixRule.findMany({
      orderBy: [{ module: 'asc' }, { workflowType: 'asc' }, { minAmount: 'asc' }],
      include: {
        department: true,
      },
    });
  }

  /**
   * Creates a reusable approval matrix rule.
   * This powers workflows across Finance, HR, Payroll, Procurement, Assets, Fleet, and Safety.
   */
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
    if (!payload.approvalSteps || payload.approvalSteps.length === 0) {
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
        minAmount:
          payload.minAmount === undefined ? undefined : new Prisma.Decimal(payload.minAmount),
        maxAmount:
          payload.maxAmount === undefined ? undefined : new Prisma.Decimal(payload.maxAmount),
        requiresFinance: payload.requiresFinance ?? false,
        requiresDirector: payload.requiresDirector ?? false,
        approvalSteps: payload.approvalSteps as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Finds the best approval rule for a submitted request.
   */
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

  /**
   * Creates an approval request and expands approval steps into decision records.
   */
  async createApprovalRequest(payload: {
    module: OperationsModule;
    workflowType: ApprovalWorkflowType;
    requestTitle: string;
    requestReference?: string;
    requestDescription?: string;
    requesterEmployeeId?: string;
    requesterName?: string;
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

    const approvalSteps = rule.approvalSteps as unknown as ApprovalStep[];

    return this.prisma.$transaction(async (tx) => {
      const request = await tx.approvalRequest.create({
        data: {
          module: payload.module,
          workflowType: payload.workflowType,
          requestTitle: payload.requestTitle,
          requestReference: payload.requestReference,
          requestDescription: payload.requestDescription,
          requesterEmployeeId: payload.requesterEmployeeId,
          requesterName: payload.requesterName,
          requesterRole: payload.requesterRole,
          requesterDepartment: payload.requesterDepartment,
          requesterSite: payload.requesterSite,
          amount: payload.amount === undefined ? undefined : new Prisma.Decimal(payload.amount),
          sourceEntityType: payload.sourceEntityType,
          sourceEntityId: payload.sourceEntityId,
          approvalMatrixRuleId: rule.id,
          payload: payload.payload as Prisma.InputJsonValue,
          status: ApprovalRequestStatus.SUBMITTED,
          currentStep: 1,
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
          decisions: {
            orderBy: { sequence: 'asc' },
          },
        },
      });
    });
  }

  async getApprovalRequests() {
    return this.prisma.approvalRequest.findMany({
      orderBy: { submittedAt: 'desc' },
      include: {
        approvalMatrixRule: true,
        decisions: {
          orderBy: { sequence: 'asc' },
        },
      },
    });
  }

  async getApprovalRequest(id: string) {
    const request = await this.prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        approvalMatrixRule: true,
        decisions: {
          orderBy: { sequence: 'asc' },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Approval request not found.');
    }

    return request;
  }

  /**
   * Records an approval or rejection.
   * If any step rejects, the request becomes REJECTED.
   * If all required steps approve, the request becomes APPROVED.
   */
  async recordDecision(
    id: string,
    payload: {
      sequence: number;
      decision: 'APPROVED' | 'REJECTED';
      approverEmployeeId?: string;
      approverName?: string;
      approverEmail?: string;
      comments?: string;
    },
  ) {
    const request = await this.getApprovalRequest(id);

    const decision = request.decisions.find((item) => item.sequence === payload.sequence);

    if (!decision) {
      throw new NotFoundException('Approval decision step not found.');
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
        approverName: payload.approverName,
        approverEmail: payload.approverEmail,
        comments: payload.comments,
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
    }

    return this.getApprovalRequest(id);
  }

  /**
   * Demo seed based on Southin organogram.
   */
  async seedDefaultApprovalRules() {
    const existingCount = await this.prisma.approvalMatrixRule.count();

    if (existingCount > 0) {
      return {
        message: 'Approval matrix already contains rules. Seed skipped.',
        existingCount,
      };
    }

    const rules = [
      {
        module: OperationsModule.HR,
        workflowType: ApprovalWorkflowType.LEAVE_REQUEST,
        name: 'Leave request approval',
        description: 'Employee leave approval through supervisor or line manager and HR.',
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
        description: 'Procurement requests reviewed by procurement/stores, finance, and operations.',
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