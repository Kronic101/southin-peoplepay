import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { ApprovalWorkflowService } from '../approvals/approval-workflow.service';
import { PrismaService } from '../prisma/prisma.service';

function clean(value: unknown) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

@Injectable()
export class StoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approvalWorkflowService: ApprovalWorkflowService,
  ) {}

  private db() {
    return this.prisma as any;
  }

  private async nextRequisitionNo() {
    const count = await this.db().storesRequisition.count();
    return `STR-REQ-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }

  async getRequisitions() {
    return this.db().storesRequisition.findMany({
      orderBy: [{ createdAt: 'desc' }],
      include: {
        lines: true,
      },
    });
  }

  async getRequisition(id: string) {
    const record = await this.db().storesRequisition.findUnique({
      where: { id },
      include: {
        lines: true,
      },
    });

    if (!record) {
      throw new NotFoundException('Stores requisition not found.');
    }

    return record;
  }

  async createRequisition(body: any) {
    const lines = Array.isArray(body.lines) ? body.lines : [];

    if (!lines.length) {
      throw new BadRequestException('At least one requisition line is required.');
    }

    const requestedBy = clean(body.requestedBy) || 'Requester';
    const requestedByEmail = clean(body.requestedByEmail) || null;
    const site = clean(body.site);
    const branch = clean(body.branch);
    const department = clean(body.department) || 'Operations';

    if (!site) {
      throw new BadRequestException('Site is required.');
    }

    const preparedLines = lines.map((line: any) => {
      const quantity = new Prisma.Decimal(asNumber(line.quantity || 1));
      const unitCost = new Prisma.Decimal(asNumber(line.unitCost || 0));
      const totalCost = quantity.mul(unitCost);

      return {
        stockItemId: clean(line.stockItemId) || null,
        itemCode: clean(line.itemCode) || null,
        itemName: clean(line.itemName || line.description),
        description: clean(line.description) || null,
        unitOfMeasure: clean(line.unitOfMeasure) || 'EA',
        quantity,
        unitCost,
        totalCost,
        notes: clean(line.notes) || null,
      };
    });

    const totalValue = preparedLines.reduce((sum: Prisma.Decimal, line: any) => {
      return sum.plus(line.totalCost);
    }, new Prisma.Decimal(0));

    const requisitionNo = clean(body.requisitionNo) || (await this.nextRequisitionNo());

    const created = await this.db().storesRequisition.create({
      data: {
        requisitionNo,
        title: clean(body.title) || `Stores requisition ${requisitionNo}`,
        description: clean(body.description) || clean(body.reason) || null,
        reason: clean(body.reason) || null,
        requestedBy,
        requestedByEmail,
        requesterRole: clean(body.requesterRole) || 'REQUESTER',
        department,
        departmentId: clean(body.departmentId) || null,
        site,
        branch: branch || null,
        projectCode: clean(body.projectCode) || null,
        status: 'SUBMITTED',
        totalValue,
        currency: clean(body.currency) || 'ZMW',
        payload: body.payload || body,
        lines: {
          create: preparedLines,
        },
      },
      include: {
        lines: true,
      },
    });

    const approvalWorkflow = await this.approvalWorkflowService.startWorkflowSafe({
      module: 'STORES',
      workflowType: 'STORES_REQUISITION',
      sourceType: 'STORES_REQUISITION',
      sourceId: created.id,
      requestNo: created.requisitionNo,
      title: created.title || `Stores requisition ${created.requisitionNo}`,
      description: created.description || created.reason || 'Stores requisition approval.',
      requestedBy: created.requestedBy,
      requestedByEmail: created.requestedByEmail,
      requesterRole: created.requesterRole,
      department: created.department,
      departmentId: created.departmentId,
      site: created.site,
      branch: created.branch,
      amount: created.totalValue,
      currency: created.currency,
      payload: created,
    });

    const approvalRequestId = (approvalWorkflow as any)?.approvalRequest?.id || null;

    const updated = approvalRequestId
      ? await this.db().storesRequisition.update({
          where: { id: created.id },
          data: {
            approvalRequestId,
            status:
              approvalWorkflow.status === 'APPROVER_NOT_CONFIGURED'
                ? 'APPROVER_NOT_CONFIGURED'
                : 'SUBMITTED',
          },
          include: {
            lines: true,
          },
        })
      : created;

    return {
      requisition: updated,
      approvalWorkflow,
    };
  }

  async updateRequisitionStatus(id: string, body: any) {
    const record = await this.db().storesRequisition.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException('Stores requisition not found.');
    }

    const status = clean(body.status).toUpperCase();

    if (!status) {
      throw new BadRequestException('Status is required.');
    }

    return this.db().storesRequisition.update({
      where: { id },
      data: {
        status,
        approvedBy: status === 'APPROVED' ? clean(body.approvedBy) || 'Approver' : record.approvedBy,
        approvedAt: status === 'APPROVED' ? new Date() : record.approvedAt,
        rejectedBy: status === 'REJECTED' ? clean(body.rejectedBy) || 'Approver' : record.rejectedBy,
        rejectedAt: status === 'REJECTED' ? new Date() : record.rejectedAt,
        rejectionReason:
          status === 'REJECTED'
            ? clean(body.rejectionReason) || clean(body.comments) || 'Rejected.'
            : record.rejectionReason,
      },
      include: {
        lines: true,
      },
    });
  }
}