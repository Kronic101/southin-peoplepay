import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

function clean(value: unknown) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function asDecimal(value: unknown) {
  const text = clean(value);
  if (!text) return null;

  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return null;

  return new Prisma.Decimal(parsed);
}

function parseSteps(value: any) {
  if (Array.isArray(value)) return value;

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

@Injectable()
export class ApprovalMatrixService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma as any;
  }

  async getOptions() {
    return {
      modules: [
        'HR',
        'PAYROLL',
        'FINANCE',
        'PROCUREMENT',
        'ASSET_MANAGEMENT',
        'FLEET',
        'STORES',
        'SAFETY',
        'QUALITY_ADMIN',
        'OPERATIONS',
        'SHAREPOINT',
        'SYSTEM_ADMIN',
      ],
      workflowTypes: [
        'LEAVE_REQUEST',
        'EXPENSE_REQUEST',
        'PROCUREMENT_REQUEST',
        'ASSET_PURCHASE',
        'ASSET_MOVEMENT',
        'ASSET_CUSTODY',
        'STOCK_COUNT',
        'SCAFFOLD_DEPLOYMENT',
        'SCAFFOLD_INSPECTION',
        'FLEET_REQUEST',
        'FLEET_COST',
        'FLEET_DEFECT',
        'FLEET_TRIP',
        'FLEET_FUEL',
        'SAFETY_INCIDENT',
        'STORES_REQUISITION',
        'WORKSHOP_PARTS_ISSUE',
        'PAYROLL_RUN',
        'PAYMENT_BATCH',
        'SHAREPOINT_PUBLISH',
        'GENERAL_REQUEST',
      ],
      approvalRoles: [
        'REQUESTER',
        'SUPERVISOR',
        'LINE_MANAGER',
        'FOREMAN',
        'BRANCH_MANAGER',
        'HOD',
        'HR_MANAGER',
        'PAYROLL_OFFICER',
        'FINANCE_MANAGER',
        'PROCUREMENT_OFFICER',
        'ASSET_MANAGER',
        'STORES_OFFICER',
        'FLEET_MANAGER',
        'FLEET_DISPATCH_OFFICER',
        'WORKSHOP_MANAGER',
        'OPERATIONS_MANAGER',
        'QUALITY_ADMIN_MANAGER',
        'SAFETY_OFFICER',
        'DIRECTOR_FINANCE',
        'DIRECTOR_OPERATIONS',
        'DIRECTOR',
        'ADMIN',
      ],
    };
  }

  async getMatrixRules() {
    return this.db().approvalMatrixRule.findMany({
      orderBy: [{ isActive: 'desc' }, { module: 'asc' }, { workflowType: 'asc' }, { name: 'asc' }],
      include: {
        department: true,
      },
    });
  }

  async getUsers() {
    return this.db().user.findMany({
      orderBy: [{ displayName: 'asc' }],
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  async createRule(body: any) {
    const module = clean(body.module);
    const workflowType = clean(body.workflowType);
    const name = clean(body.name);

    if (!module) throw new BadRequestException('Module is required.');
    if (!workflowType) throw new BadRequestException('Workflow type is required.');
    if (!name) throw new BadRequestException('Rule name is required.');

    const approvalSteps = parseSteps(body.approvalSteps || body.steps);

    if (!approvalSteps.length) {
      throw new BadRequestException('At least one approval step is required.');
    }

    return this.db().approvalMatrixRule.create({
      data: {
        module,
        workflowType,
        name,
        description: clean(body.description) || null,
        departmentId: clean(body.departmentId) || null,
        site: clean(body.site) || null,
        branch: clean(body.branch) || null,
        minAmount: asDecimal(body.minAmount),
        maxAmount: asDecimal(body.maxAmount),
        requiresFinance: Boolean(body.requiresFinance),
        requiresDirector: Boolean(body.requiresDirector),
        approvalSteps,
        isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      },
      include: {
        department: true,
      },
    });
  }

  async updateRule(id: string, body: any) {
    const existing = await this.db().approvalMatrixRule.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Approval matrix rule not found.');
    }

    const approvalSteps =
      body.approvalSteps !== undefined || body.steps !== undefined
        ? parseSteps(body.approvalSteps || body.steps)
        : undefined;

    if (approvalSteps && !approvalSteps.length) {
      throw new BadRequestException('At least one approval step is required.');
    }

    return this.db().approvalMatrixRule.update({
      where: { id },
      data: {
        module: clean(body.module) || existing.module,
        workflowType: clean(body.workflowType) || existing.workflowType,
        name: clean(body.name) || existing.name,
        description: body.description === undefined ? existing.description : clean(body.description) || null,
        departmentId: body.departmentId === undefined ? existing.departmentId : clean(body.departmentId) || null,
        site: body.site === undefined ? existing.site : clean(body.site) || null,
        branch: body.branch === undefined ? existing.branch : clean(body.branch) || null,
        minAmount: body.minAmount === undefined ? existing.minAmount : asDecimal(body.minAmount),
        maxAmount: body.maxAmount === undefined ? existing.maxAmount : asDecimal(body.maxAmount),
        requiresFinance:
          body.requiresFinance === undefined ? existing.requiresFinance : Boolean(body.requiresFinance),
        requiresDirector:
          body.requiresDirector === undefined ? existing.requiresDirector : Boolean(body.requiresDirector),
        approvalSteps: approvalSteps || existing.approvalSteps,
        isActive: body.isActive === undefined ? existing.isActive : Boolean(body.isActive),
      },
      include: {
        department: true,
      },
    });
  }

  async toggleRule(id: string) {
    const existing = await this.db().approvalMatrixRule.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Approval matrix rule not found.');
    }

    return this.db().approvalMatrixRule.update({
      where: { id },
      data: {
        isActive: !existing.isActive,
      },
      include: {
        department: true,
      },
    });
  }

  async upsertApprover(body: any) {
    const email = clean(body.email).toLowerCase();
    const displayName = clean(body.displayName) || email;
    const roleName = clean(body.role);

    if (!email) throw new BadRequestException('Approver email is required.');
    if (!roleName) throw new BadRequestException('Approver role is required.');

    const role = await this.db().role.upsert({
      where: { name: roleName },
      update: {
        description: `${roleName} role`,
      },
      create: {
        name: roleName,
        description: `${roleName} role`,
      },
    });

    const user = await this.db().user.upsert({
      where: { email },
      update: {
        displayName,
        microsoftUserId: clean(body.microsoftUserId) || undefined,
        isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      },
      create: {
        email,
        displayName,
        microsoftUserId: clean(body.microsoftUserId) || null,
        isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      },
    });

    await this.db().userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: role.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: role.id,
      },
    });

    return this.db().user.findUnique({
      where: { id: user.id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  async seedDefaultMatrix() {
    const defaults = [
      {
        module: 'FINANCE',
        workflowType: 'EXPENSE_REQUEST',
        name: 'Finance Expense Approval',
        description: 'Finance expense review and Director approval where required.',
        requiresFinance: true,
        requiresDirector: true,
        approvalSteps: [
          {
            sequence: 1,
            role: 'FINANCE_MANAGER',
            approverName: 'Finance Manager',
            approverEmail: 'finance@southincon.com',
            required: true,
          },
          {
            sequence: 2,
            role: 'DIRECTOR',
            approverName: 'Director',
            approverEmail: 'director@southincon.com',
            required: true,
          },
        ],
      },
      {
        module: 'FLEET',
        workflowType: 'FLEET_COST',
        name: 'Fleet Cost Approval',
        description: 'Fleet Manager verifies cost, then Finance posts into finance dashboard.',
        requiresFinance: true,
        requiresDirector: false,
        approvalSteps: [
          {
            sequence: 1,
            role: 'FLEET_MANAGER',
            approverName: 'Fleet Manager',
            approverEmail: 'fleet@southincon.com',
            required: true,
          },
          {
            sequence: 2,
            role: 'FINANCE_MANAGER',
            approverName: 'Finance Manager',
            approverEmail: 'finance@southincon.com',
            required: true,
          },
        ],
      },
      {
        module: 'ASSET_MANAGEMENT',
        workflowType: 'ASSET_MOVEMENT',
        name: 'Asset Movement Approval',
        description: 'Stores review and Asset Manager approval for stock movements.',
        requiresFinance: false,
        requiresDirector: false,
        approvalSteps: [
          {
            sequence: 1,
            role: 'STORES_OFFICER',
            approverName: 'Stores Officer',
            approverEmail: 'stores@southincon.com',
            required: true,
          },
          {
            sequence: 2,
            role: 'ASSET_MANAGER',
            approverName: 'Asset Manager',
            approverEmail: 'assets@southincon.com',
            required: true,
          },
        ],
      },
      {
        module: 'STORES',
        workflowType: 'STOCK_COUNT',
        name: 'Stock Count Approval',
        description: 'Stores Officer captures, Asset Manager approves stock count variance.',
        requiresFinance: false,
        requiresDirector: false,
        approvalSteps: [
          {
            sequence: 1,
            role: 'STORES_OFFICER',
            approverName: 'Stores Officer',
            approverEmail: 'stores@southincon.com',
            required: true,
          },
          {
            sequence: 2,
            role: 'ASSET_MANAGER',
            approverName: 'Asset Manager',
            approverEmail: 'assets@southincon.com',
            required: true,
          },
        ],
      },
      {
        module: 'PROCUREMENT',
        workflowType: 'PROCUREMENT_REQUEST',
        name: 'Procurement Payment Approval',
        description: 'Procurement review, Finance review and Director approval.',
        requiresFinance: true,
        requiresDirector: true,
        approvalSteps: [
          {
            sequence: 1,
            role: 'PROCUREMENT_OFFICER',
            approverName: 'Procurement Officer',
            approverEmail: 'procurement@southincon.com',
            required: true,
          },
          {
            sequence: 2,
            role: 'FINANCE_MANAGER',
            approverName: 'Finance Manager',
            approverEmail: 'finance@southincon.com',
            required: true,
          },
          {
            sequence: 3,
            role: 'DIRECTOR',
            approverName: 'Director',
            approverEmail: 'director@southincon.com',
            required: true,
          },
        ],
      },
    ];

    for (const item of defaults) {
      const existing = await this.db().approvalMatrixRule.findFirst({
        where: {
          module: item.module,
          workflowType: item.workflowType,
          name: item.name,
        },
      });

      if (existing) {
        await this.db().approvalMatrixRule.update({
          where: { id: existing.id },
          data: {
            description: item.description,
            requiresFinance: item.requiresFinance,
            requiresDirector: item.requiresDirector,
            approvalSteps: item.approvalSteps,
            isActive: true,
          },
        });
      } else {
        await this.db().approvalMatrixRule.create({
          data: {
            ...item,
            isActive: true,
          },
        });
      }
    }

    const approvers = [
      { email: 'finance@southincon.com', displayName: 'Finance Manager', role: 'FINANCE_MANAGER' },
      { email: 'director@southincon.com', displayName: 'Director', role: 'DIRECTOR' },
      { email: 'fleet@southincon.com', displayName: 'Fleet Manager', role: 'FLEET_MANAGER' },
      { email: 'assets@southincon.com', displayName: 'Asset Manager', role: 'ASSET_MANAGER' },
      { email: 'stores@southincon.com', displayName: 'Stores Officer', role: 'STORES_OFFICER' },
      { email: 'procurement@southincon.com', displayName: 'Procurement Officer', role: 'PROCUREMENT_OFFICER' },
    ];

    for (const approver of approvers) {
      await this.upsertApprover(approver);
    }

    return {
      message: 'Approval matrix defaults seeded successfully.',
      rules: await this.getMatrixRules(),
      users: await this.getUsers(),
    };
  }
}