import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function clean(value: unknown) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function cleanLower(value: unknown) {
  return clean(value).toLowerCase();
}

function asBool(value: unknown, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;

  const text = clean(value).toUpperCase();

  return ['TRUE', 'YES', 'Y', '1', 'ACTIVE'].includes(text);
}

function asInt(value: unknown, fallback = 1) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asDate(value: unknown) {
  const text = clean(value);
  if (!text) return null;

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function removeUndefined<T extends Record<string, any>>(data: T): T {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  ) as T;
} 

@Injectable()
export class ApprovalRoutingService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma as any;
  }

  async getAssignments() {
    return this.db().approvalApproverAssignment.findMany({
      orderBy: [
        { isActive: 'desc' },
        { approvalRole: 'asc' },
        { site: 'asc' },
        { branch: 'asc' },
        { priority: 'asc' },
      ],
      include: {
        department: true,
      },
    });
  }

  async createAssignment(body: any) {
    const approvalRole = clean(body.approvalRole || body.role);

    if (!approvalRole) {
      throw new BadRequestException('Approval role is required.');
    }

    const assigneeType = clean(body.assigneeType) || 'USER';

    if (assigneeType === 'USER' && !clean(body.userEmail)) {
      throw new BadRequestException('User email is required when assignee type is USER.');
    }

    if (assigneeType === 'ENTRA_GROUP' && !clean(body.entraGroupName) && !clean(body.entraGroupId)) {
      throw new BadRequestException(
        'Entra group name or Entra group ID is required when assignee type is ENTRA_GROUP.',
      );
    }

    return this.db().approvalApproverAssignment.create({
      data: removeUndefined({
        module: clean(body.module) || null,
        workflowType: clean(body.workflowType) || null,
        approvalRole,

        site: clean(body.site) || null,
        branch: clean(body.branch) || null,
        departmentId: clean(body.departmentId) || null,

        assigneeType,
        userId: clean(body.userId) || null,
        userEmail: cleanLower(body.userEmail) || null,
        userName: clean(body.userName) || clean(body.displayName) || null,
        microsoftUserId: clean(body.microsoftUserId) || null,

        entraGroupId: clean(body.entraGroupId) || null,
        entraGroupName: clean(body.entraGroupName) || null,

        isPrimary: asBool(body.isPrimary, true),
        isDefault: asBool(body.isDefault, false),
        priority: asInt(body.priority, 1),
        isActive: asBool(body.isActive, true),

        effectiveFrom: asDate(body.effectiveFrom),
        effectiveTo: asDate(body.effectiveTo),
      }),
      include: {
        department: true,
      },
    });
  }

  async updateAssignment(id: string, body: any) {
    const existing = await this.db().approvalApproverAssignment.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Approver assignment not found.');
    }

    return this.db().approvalApproverAssignment.update({
      where: { id },
      data: removeUndefined({
        module: body.module === undefined ? undefined : clean(body.module) || null,
        workflowType:
          body.workflowType === undefined ? undefined : clean(body.workflowType) || null,
        approvalRole:
          body.approvalRole === undefined && body.role === undefined
            ? undefined
            : clean(body.approvalRole || body.role),

        site: body.site === undefined ? undefined : clean(body.site) || null,
        branch: body.branch === undefined ? undefined : clean(body.branch) || null,
        departmentId:
          body.departmentId === undefined ? undefined : clean(body.departmentId) || null,

        assigneeType: body.assigneeType === undefined ? undefined : clean(body.assigneeType),
        userId: body.userId === undefined ? undefined : clean(body.userId) || null,
        userEmail: body.userEmail === undefined ? undefined : cleanLower(body.userEmail) || null,
        userName:
          body.userName === undefined && body.displayName === undefined
            ? undefined
            : clean(body.userName) || clean(body.displayName) || null,
        microsoftUserId:
          body.microsoftUserId === undefined ? undefined : clean(body.microsoftUserId) || null,

        entraGroupId:
          body.entraGroupId === undefined ? undefined : clean(body.entraGroupId) || null,
        entraGroupName:
          body.entraGroupName === undefined ? undefined : clean(body.entraGroupName) || null,

        isPrimary: body.isPrimary === undefined ? undefined : asBool(body.isPrimary, true),
        isDefault: body.isDefault === undefined ? undefined : asBool(body.isDefault, false),
        priority: body.priority === undefined ? undefined : asInt(body.priority, 1),
        isActive: body.isActive === undefined ? undefined : asBool(body.isActive, true),

        effectiveFrom:
          body.effectiveFrom === undefined ? undefined : asDate(body.effectiveFrom),
        effectiveTo: body.effectiveTo === undefined ? undefined : asDate(body.effectiveTo),
      }),
      include: {
        department: true,
      },
    });
  }

  async toggleAssignment(id: string) {
    const existing = await this.db().approvalApproverAssignment.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Approver assignment not found.');
    }

    return this.db().approvalApproverAssignment.update({
      where: { id },
      data: {
        isActive: !existing.isActive,
      },
      include: {
        department: true,
      },
    });
  }

  async getDelegations() {
    return this.db().approvalDelegation.findMany({
      orderBy: [{ isActive: 'desc' }, { startsAt: 'desc' }],
      include: {
        department: true,
      },
    });
  }

  async createDelegation(body: any) {
    const fromUserEmail = cleanLower(body.fromUserEmail);
    const toUserEmail = cleanLower(body.toUserEmail);
    const startsAt = asDate(body.startsAt);
    const endsAt = asDate(body.endsAt);

    if (!fromUserEmail) {
      throw new BadRequestException('Delegating user email is required.');
    }

    if (!toUserEmail) {
      throw new BadRequestException('Delegate user email is required.');
    }

    if (!startsAt || !endsAt) {
      throw new BadRequestException('Delegation start and end dates are required.');
    }

    if (endsAt <= startsAt) {
      throw new BadRequestException('Delegation end date must be after start date.');
    }

    return this.db().approvalDelegation.create({
      data: removeUndefined({
        approvalRole: clean(body.approvalRole || body.role) || null,
        module: clean(body.module) || null,
        workflowType: clean(body.workflowType) || null,
        site: clean(body.site) || null,
        branch: clean(body.branch) || null,
        departmentId: clean(body.departmentId) || null,

        fromUserEmail,
        fromUserName: clean(body.fromUserName) || null,
        fromMicrosoftUserId: clean(body.fromMicrosoftUserId) || null,

        toUserEmail,
        toUserName: clean(body.toUserName) || null,
        toMicrosoftUserId: clean(body.toMicrosoftUserId) || null,

        reason: clean(body.reason) || null,
        startsAt,
        endsAt,
        isActive: asBool(body.isActive, true),
        createdBy: clean(body.createdBy) || null,
      }),
      include: {
        department: true,
      },
    });
  }

  async updateDelegation(id: string, body: any) {
    const existing = await this.db().approvalDelegation.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Approval delegation not found.');
    }

    const startsAt = body.startsAt === undefined ? undefined : asDate(body.startsAt);
    const endsAt = body.endsAt === undefined ? undefined : asDate(body.endsAt);

    if (startsAt && endsAt && endsAt <= startsAt) {
      throw new BadRequestException('Delegation end date must be after start date.');
    }

    return this.db().approvalDelegation.update({
      where: { id },
      data: removeUndefined({
        approvalRole:
          body.approvalRole === undefined && body.role === undefined
            ? undefined
            : clean(body.approvalRole || body.role) || null,
        module: body.module === undefined ? undefined : clean(body.module) || null,
        workflowType:
          body.workflowType === undefined ? undefined : clean(body.workflowType) || null,
        site: body.site === undefined ? undefined : clean(body.site) || null,
        branch: body.branch === undefined ? undefined : clean(body.branch) || null,
        departmentId:
          body.departmentId === undefined ? undefined : clean(body.departmentId) || null,

        fromUserEmail:
          body.fromUserEmail === undefined ? undefined : cleanLower(body.fromUserEmail),
        fromUserName:
          body.fromUserName === undefined ? undefined : clean(body.fromUserName) || null,
        fromMicrosoftUserId:
          body.fromMicrosoftUserId === undefined
            ? undefined
            : clean(body.fromMicrosoftUserId) || null,

        toUserEmail: body.toUserEmail === undefined ? undefined : cleanLower(body.toUserEmail),
        toUserName: body.toUserName === undefined ? undefined : clean(body.toUserName) || null,
        toMicrosoftUserId:
          body.toMicrosoftUserId === undefined
            ? undefined
            : clean(body.toMicrosoftUserId) || null,

        reason: body.reason === undefined ? undefined : clean(body.reason) || null,
        startsAt,
        endsAt,
        isActive: body.isActive === undefined ? undefined : asBool(body.isActive, true),
      }),
      include: {
        department: true,
      },
    });
  }

  async toggleDelegation(id: string) {
    const existing = await this.db().approvalDelegation.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Approval delegation not found.');
    }

    return this.db().approvalDelegation.update({
      where: { id },
      data: {
        isActive: !existing.isActive,
      },
      include: {
        department: true,
      },
    });
  }

  private scoreAssignment(assignment: any, input: any) {
    let score = 0;

    if (assignment.module && assignment.module === input.module) score += 20;
    if (assignment.workflowType && assignment.workflowType === input.workflowType) score += 20;
    if (assignment.site && assignment.site === input.site) score += 50;
    if (assignment.branch && assignment.branch === input.branch) score += 40;
    if (assignment.departmentId && assignment.departmentId === input.departmentId) score += 30;
    if (assignment.isDefault) score += 5;
    if (assignment.isPrimary) score += 5;

    score += Math.max(0, 20 - Number(assignment.priority || 1));

    return score;
  }

  private scoreDelegation(delegation: any, input: any) {
    let score = 0;

    if (delegation.approvalRole && delegation.approvalRole === input.approvalRole) score += 30;
    if (delegation.module && delegation.module === input.module) score += 20;
    if (delegation.workflowType && delegation.workflowType === input.workflowType) score += 20;
    if (delegation.site && delegation.site === input.site) score += 40;
    if (delegation.branch && delegation.branch === input.branch) score += 30;
    if (delegation.departmentId && delegation.departmentId === input.departmentId) score += 20;

    return score;
  }

  async resolveApprover(body: any) {
    const now = new Date();

    const input = {
      module: clean(body.module) || null,
      workflowType: clean(body.workflowType) || null,
      approvalRole: clean(body.approvalRole || body.role),
      site: clean(body.site) || null,
      branch: clean(body.branch) || null,
      departmentId: clean(body.departmentId) || null,
      requesterEmail: cleanLower(body.requesterEmail) || null,
    };

    if (!input.approvalRole) {
      throw new BadRequestException('Approval role is required for resolver.');
    }

    const assignments = await this.db().approvalApproverAssignment.findMany({
      where: {
        approvalRole: input.approvalRole,
        isActive: true,
        AND: [
          { OR: [{ module: null }, { module: input.module }] },
          { OR: [{ workflowType: null }, { workflowType: input.workflowType }] },
          { OR: [{ site: null }, { site: input.site }] },
          { OR: [{ branch: null }, { branch: input.branch }] },
          { OR: [{ departmentId: null }, { departmentId: input.departmentId }] },
          { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }] },
          { OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }] },
        ],
      },
      include: {
        department: true,
      },
    });

    const sortedAssignments = assignments
      .map((assignment: any) => ({
        assignment,
        score: this.scoreAssignment(assignment, input),
      }))
      .sort((a: any, b: any) => b.score - a.score);

    const selectedAssignment = sortedAssignments[0]?.assignment || null;

    if (!selectedAssignment) {
      return {
        status: 'APPROVER_NOT_CONFIGURED',
        approvalRole: input.approvalRole,
        module: input.module,
        workflowType: input.workflowType,
        site: input.site,
        branch: input.branch,
        message: 'No active approver assignment found for this approval role and scope.',
      };
    }

    if (selectedAssignment.assigneeType === 'USER' && selectedAssignment.userEmail) {
      const delegations = await this.db().approvalDelegation.findMany({
        where: {
          fromUserEmail: selectedAssignment.userEmail,
          isActive: true,
          startsAt: { lte: now },
          endsAt: { gte: now },
          AND: [
            { OR: [{ approvalRole: null }, { approvalRole: input.approvalRole }] },
            { OR: [{ module: null }, { module: input.module }] },
            { OR: [{ workflowType: null }, { workflowType: input.workflowType }] },
            { OR: [{ site: null }, { site: input.site }] },
            { OR: [{ branch: null }, { branch: input.branch }] },
            { OR: [{ departmentId: null }, { departmentId: input.departmentId }] },
          ],
        },
      });

      const selectedDelegation =
        delegations
          .map((delegation: any) => ({
            delegation,
            score: this.scoreDelegation(delegation, input),
          }))
          .sort((a: any, b: any) => b.score - a.score)[0]?.delegation || null;

      if (selectedDelegation) {
        return {
          status: 'DELEGATED_APPROVER_RESOLVED',
          assigneeType: 'USER',
          approvalRole: input.approvalRole,
          originalApprover: {
            email: selectedAssignment.userEmail,
            name: selectedAssignment.userName,
            microsoftUserId: selectedAssignment.microsoftUserId,
          },
          approver: {
            email: selectedDelegation.toUserEmail,
            name: selectedDelegation.toUserName,
            microsoftUserId: selectedDelegation.toMicrosoftUserId,
          },
          delegation: selectedDelegation,
          assignment: selectedAssignment,
        };
      }

      return {
        status: 'APPROVER_RESOLVED',
        assigneeType: 'USER',
        approvalRole: input.approvalRole,
        approver: {
          email: selectedAssignment.userEmail,
          name: selectedAssignment.userName,
          microsoftUserId: selectedAssignment.microsoftUserId,
        },
        assignment: selectedAssignment,
      };
    }

    if (selectedAssignment.assigneeType === 'ENTRA_GROUP') {
      return {
        status: 'GROUP_APPROVER_RESOLVED',
        assigneeType: 'ENTRA_GROUP',
        approvalRole: input.approvalRole,
        group: {
          entraGroupId: selectedAssignment.entraGroupId,
          entraGroupName: selectedAssignment.entraGroupName,
        },
        assignment: selectedAssignment,
      };
    }

    return {
      status: 'DYNAMIC_APPROVER_PENDING',
      assigneeType: selectedAssignment.assigneeType,
      approvalRole: input.approvalRole,
      assignment: selectedAssignment,
      message:
        'Assignment was found, but this assignee type needs workflow-specific dynamic resolution.',
    };
  }
}