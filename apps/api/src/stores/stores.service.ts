import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { ApprovalWorkflowService } from '../approvals/approval-workflow.service';
import { PrismaService } from '../prisma/prisma.service';

function clean(value: unknown) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function cleanOrNull(value: unknown) {
  const valueClean = clean(value);
  return valueClean ? valueClean : null;
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

  private async resolveSiteFromBody(body: any) {
    const siteId = clean(body.siteId);
    const locationCode = clean(body.locationCode || body.stockLocationCode);
    const submittedSite = clean(body.site);
    const submittedBranch = clean(body.branch);

    if (siteId) {
      const site = await this.db().site.findUnique({
        where: { id: siteId },
        select: {
          id: true,
          name: true,
          code: true,
          description: true,
        },
      });

      if (!site) {
        throw new BadRequestException('Selected site does not exist.');
      }

      return {
        siteId: site.id,
        site: site.name,
        siteCode: site.code,
        branch: submittedBranch || null,
        locationCode: locationCode || null,
      };
    }

    if (locationCode) {
      const location = await this.db().stockLocation.findFirst({
        where: {
          locationCode: {
            equals: locationCode,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          locationCode: true,
          locationName: true,
          locationType: true,
          site: true,
          branch: true,
          department: true,
          isActive: true,
        },
      });

      if (!location) {
        throw new BadRequestException(`Stock location ${locationCode} does not exist.`);
      }

      if (!location.isActive) {
        throw new BadRequestException(`Stock location ${locationCode} is not active.`);
      }

      return {
        siteId: null,
        site: location.site,
        siteCode: null,
        branch: location.branch || submittedBranch || null,
        locationCode: location.locationCode,
        stockLocationId: location.id,
        stockLocationName: location.locationName,
      };
    }

    if (!submittedSite) {
      throw new BadRequestException('Site is required.');
    }

    return {
      siteId: null,
      site: submittedSite,
      siteCode: null,
      branch: submittedBranch || null,
      locationCode: null,
    };
  }

  private async resolveStockItem(line: any) {
    const stockItemId = clean(line.stockItemId);
    const itemCode = clean(line.itemCode);

    if (stockItemId) {
      const item = await this.db().stockItem.findUnique({
        where: { id: stockItemId },
        select: {
          id: true,
          itemCode: true,
          itemName: true,
          unitOfMeasure: true,
          isActive: true,
        },
      });

      if (!item) {
        throw new BadRequestException(`Selected stock item does not exist.`);
      }

      if (!item.isActive) {
        throw new BadRequestException(`Stock item ${item.itemCode} is not active.`);
      }

      return item;
    }

    if (itemCode) {
      const item = await this.db().stockItem.findFirst({
        where: {
          itemCode: {
            equals: itemCode,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          itemCode: true,
          itemName: true,
          unitOfMeasure: true,
          isActive: true,
        },
      });

      if (!item) {
        throw new BadRequestException(`Stock item code ${itemCode} does not exist.`);
      }

      if (!item.isActive) {
        throw new BadRequestException(`Stock item ${item.itemCode} is not active.`);
      }

      return item;
    }

    return null;
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

    const siteContext = await this.resolveSiteFromBody(body);

    const requestedBy = clean(body.requestedBy) || 'Requester';
    const requestedByEmail = cleanOrNull(body.requestedByEmail);
    const requesterRole = clean(body.requesterRole) || 'REQUESTER';
    const department = clean(body.department) || 'Operations';

    const preparedLines = [];

    for (const line of lines) {
      const item = await this.resolveStockItem(line);

      const quantityNumber = asNumber(line.quantity || 1);

      if (quantityNumber <= 0) {
        throw new BadRequestException('Requisition line quantity must be greater than zero.');
      }

      const quantity = new Prisma.Decimal(quantityNumber);
      const unitCost = new Prisma.Decimal(asNumber(line.unitCost || 0));
      const totalCost = quantity.mul(unitCost);

      const itemCode = clean(line.itemCode) || item?.itemCode || null;
      const itemName = clean(line.itemName || line.description) || item?.itemName || '';

      if (!itemName) {
        throw new BadRequestException('Each requisition line must have an item name or stock item.');
      }

      preparedLines.push({
        stockItemId: item?.id || cleanOrNull(line.stockItemId),
        itemCode,
        itemName,
        description: cleanOrNull(line.description),
        unitOfMeasure: clean(line.unitOfMeasure) || item?.unitOfMeasure || 'EA',
        quantity,
        unitCost,
        totalCost,
        notes: cleanOrNull(line.notes),
      });
    }

    const totalValue = preparedLines.reduce((sum: Prisma.Decimal, line: any) => {
      return sum.plus(line.totalCost);
    }, new Prisma.Decimal(0));

    const requisitionNo = clean(body.requisitionNo) || (await this.nextRequisitionNo());

    const payload = {
      ...body,
      siteContext,
      lines: preparedLines.map((line) => ({
        stockItemId: line.stockItemId,
        itemCode: line.itemCode,
        itemName: line.itemName,
        quantity: line.quantity.toString(),
        unitOfMeasure: line.unitOfMeasure,
        unitCost: line.unitCost.toString(),
        totalCost: line.totalCost.toString(),
      })),
    };

    const created = await this.db().storesRequisition.create({
      data: {
        requisitionNo,
        title: clean(body.title) || `Stores requisition ${requisitionNo}`,
        description: clean(body.description) || clean(body.reason) || null,
        reason: cleanOrNull(body.reason),
        requestedBy,
        requestedByEmail,
        requesterRole,
        department,
        departmentId: cleanOrNull(body.departmentId),
        site: siteContext.site,
        branch: siteContext.branch,
        projectCode: cleanOrNull(body.projectCode),
        status: 'SUBMITTED',
        totalValue,
        currency: clean(body.currency) || 'ZMW',
        payload,
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
        approvedBy:
          status === 'APPROVED'
            ? clean(body.approvedBy) || 'Approver'
            : record.approvedBy,
        approvedAt: status === 'APPROVED' ? new Date() : record.approvedAt,
        rejectedBy:
          status === 'REJECTED'
            ? clean(body.rejectedBy) || 'Approver'
            : record.rejectedBy,
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

  private numberValue(value: any) {
  return Number(value ?? 0);
}

private async rawCount(tableName: string) {
  const rows = await this.prisma.$queryRawUnsafe<any[]>(
    `select count(*)::int as count from ${tableName};`,
  );

  return this.numberValue(rows?.[0]?.count);
}

async getDashboard() {
    const [
      stockItems,
      stockLocations,
      stockBalances,
      scaffoldComponents,
      hubAssets,
      totalQuantityRows,
      stockByLocation,
      lowStockItems,
      scaffoldByLocation,
      assetsBySite,
      recentRequisitions,
    ] = await Promise.all([
      this.rawCount('stock_items'),
      this.rawCount('stock_locations'),
      this.rawCount('stock_balances'),
      this.rawCount('scaffold_components'),
      this.rawCount('hub_assets'),

      this.prisma.$queryRaw<any[]>`
        select coalesce(sum("quantityOnHand"), 0)::numeric as total
        from stock_balances;
      `,

      this.prisma.$queryRaw<any[]>`
        select
          sl."locationCode",
          sl."locationName",
          sl."locationType",
          sl.site,
          sl.branch,
          count(sb.id)::int as "balanceLines",
          coalesce(sum(sb."quantityOnHand"), 0)::numeric as "quantityOnHand"
        from stock_locations sl
        left join stock_balances sb
          on sb."locationId" = sl.id
        where sl."isActive" = true
        group by
          sl."locationCode",
          sl."locationName",
          sl."locationType",
          sl.site,
          sl.branch
        order by sl."locationCode";
      `,

      this.prisma.$queryRaw<any[]>`
        select
          si."itemCode",
          si."itemName",
          si."itemType"::text as "itemType",
          si.category,
          si."unitOfMeasure",
          sl."locationCode",
          sl."locationName",
          sb."quantityOnHand",
          coalesce(si."minimumLevel", 0) as "minimumLevel",
          coalesce(si."reorderLevel", 0) as "reorderLevel"
        from stock_balances sb
        join stock_items si
          on si.id = sb."stockItemId"
        join stock_locations sl
          on sl.id = sb."locationId"
        where
          si."isActive" = true
          and (
            sb."quantityOnHand" <= 0
            or sb."quantityOnHand" <= coalesce(si."minimumLevel", 0)
            or sb."quantityOnHand" <= coalesce(si."reorderLevel", 0)
          )
        order by sb."quantityOnHand" asc, si."itemCode" asc
        limit 25;
      `,

      this.prisma.$queryRaw<any[]>`
        select
          "currentLocation" as "locationCode",
          "currentSite" as site,
          "componentType"::text as "componentType",
          count(*)::int as components
        from scaffold_components
        group by "currentLocation", "currentSite", "componentType"
        order by "currentLocation", "componentType";
      `,

      this.prisma.$queryRaw<any[]>`
        select
          site,
          location,
          category::text as category,
          status::text as status,
          count(*)::int as assets
        from hub_assets
        group by site, location, category, status
        order by site, location, category;
      `,

      this.db().storesRequisition.findMany({
        orderBy: [{ createdAt: 'desc' }],
        take: 10,
        include: {
          lines: true,
        },
      }),
    ]);

    const totalQuantityOnHand = this.numberValue(totalQuantityRows?.[0]?.total);

    return {
      generatedAt: new Date().toISOString(),

      summary: {
        stockItems,
        stockLocations,
        stockBalances,
        totalQuantityOnHand,
        scaffoldComponents,
        hubAssets,
        lowStockItems: lowStockItems.length,
        recentRequisitions: recentRequisitions.length,
      },

      stockByLocation,
      lowStockItems,
      scaffoldByLocation,
      assetsBySite,
      recentRequisitions,
    };
  }
}