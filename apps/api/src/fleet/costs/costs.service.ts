import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

function clean(value: unknown) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function removeUndefined<T extends Record<string, any>>(data: T): T {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  ) as T;
}

@Injectable()
export class FleetCostsService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma as any;
  }

  async getCosts() {
    return this.db().fleetCostPosting.findMany({
      orderBy: {
        costDate: 'desc',
      },
      include: {
        vehicle: true,
      },
    });
  }

  async getPendingCosts() {
    return this.db().fleetCostPosting.findMany({
      where: {
        status: {
          in: ['PENDING_FINANCE_REVIEW', 'PENDING', 'REVIEW_REQUIRED'],
        },
      },
      orderBy: {
        costDate: 'desc',
      },
      include: {
        vehicle: true,
      },
    });
  }

  async getPostedCosts() {
    return this.db().fleetCostPosting.findMany({
      where: {
        status: 'POSTED_TO_FINANCE',
      },
      orderBy: {
        costDate: 'desc',
      },
      include: {
        vehicle: true,
      },
    });
  }

  async financeReview(id: string, body: any) {
    return this.reviewCost(id, body);
  }

  async reviewCost(id: string, body: any) {
    const cost = await this.db().fleetCostPosting.findUnique({
      where: { id },
    });

    if (!cost) {
      throw new NotFoundException('Fleet cost posting not found.');
    }

    const decision = clean(body.decision).toUpperCase();

    if (!decision) {
      throw new BadRequestException('Finance review decision is required.');
    }

    const status =
      decision === 'REJECTED'
        ? 'REJECTED'
        : decision === 'APPROVED'
          ? 'APPROVED_FOR_FINANCE'
          : 'PENDING_FINANCE_REVIEW';

    return this.db().fleetCostPosting.update({
      where: { id },
      data: removeUndefined({
        status,
        rejectionReason:
          decision === 'REJECTED'
            ? clean(body.rejectionReason) || clean(body.comments) || 'Rejected by Finance.'
            : null,
      }),
      include: {
        vehicle: true,
      },
    });
  }

  async postToFinance(id: string, body: any) {
    const postedBy = clean(body.postedBy) || clean(body.reviewedBy) || 'Finance Manager';

    const cost = await this.db().fleetCostPosting.findUnique({
      where: { id },
      include: {
        vehicle: true,
      },
    });

    if (!cost) {
      throw new NotFoundException('Fleet cost record not found.');
    }

    if (cost.status !== 'APPROVED_FOR_FINANCE' && cost.status !== 'POSTED_TO_FINANCE') {
      throw new BadRequestException(
        'Only costs approved for finance can be posted to Finance.',
      );
    }

    if (cost.status === 'POSTED_TO_FINANCE' && cost.financeExpenseId) {
      return cost;
    }

    const financeExpense = await this.createFinanceExpenseFromFleetCost(cost, postedBy);

    return this.db().fleetCostPosting.update({
      where: { id },
      data: {
        status: 'POSTED_TO_FINANCE',
        postedBy,
        postedAt: new Date(),
        financeExpenseId: financeExpense.id,
      },
      include: {
        vehicle: true,
      },
    });
  }

  private getModelFieldNames(modelName: string): string[] {
    const model = (this.db() as any)?._runtimeDataModel?.models?.[modelName];

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
      Object.fromEntries(
        Object.entries(data).filter(([key]) => fields.includes(key)),
      ),
    );
  }

  private async createFinanceExpenseFromFleetCost(cost: any, postedBy: string) {
    const expenseNo = `FLT-EXP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    const financeExpenseData = this.pickModelData('FinanceExpense', {
      expenseNo,
      referenceNo: expenseNo,
      category: `FLEET_${cost.category || 'OPERATING_COST'}`,
      description: cost.description || `Fleet cost ${cost.costNo}`,
      department: cost.department || 'Operations',
      site: cost.site || null,
      amount: String(cost.amount || 0),
      currency: 'ZMW',
      expenseDate: cost.costDate || new Date(),
      transactionDate: cost.costDate || new Date(),
      status: 'APPROVED',
      evidenceStatus: 'REQUIRED',
      requestedBy: postedBy,
      submittedBy: postedBy,
      approvedBy: postedBy,
      sourceType: 'FLEET_COST',
      sourceId: cost.id,
      fleetCostPostingId: cost.id,
      notes: `Posted from Fleet Cost Posting ${cost.costNo}`,
    });

    return this.db().financeExpense.create({
      data: financeExpenseData,
    });
  }
}