import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  InventoryControlType,
  Prisma,
} from '@prisma/client';

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
    const stockItemId =
      clean(line.stockItemId);

    const itemCode =
      clean(line.itemCode);

    const select = {
      id: true,
      itemCode: true,
      itemName: true,
      itemType: true,
      category: true,
      description: true,
      unitOfMeasure: true,
      standardCost: true,
      inventoryControlType: true,
      assetRegistrationRequired: true,
      custodyTrackingRequired: true,
      isSerialized: true,
      isActive: true,
    };

    if (stockItemId) {
      const item =
        await this.db()
          .stockItem
          .findUnique({
            where: {
              id: stockItemId,
            },

            select,
          });

      if (!item) {
        throw new BadRequestException(
          'Selected stock item does not exist.',
        );
      }

      if (!item.isActive) {
        throw new BadRequestException(
          `Stock item ${item.itemCode} is not active.`,
        );
      }

      return item;
    }

    if (itemCode) {
      const item =
        await this.db()
          .stockItem
          .findFirst({
            where: {
              itemCode: {
                equals: itemCode,
                mode: 'insensitive',
              },
            },

            select,
          });

      if (!item) {
        throw new BadRequestException(
          `Stock item code ${itemCode} does not exist.`,
        );
      }

      if (!item.isActive) {
        throw new BadRequestException(
          `Stock item ${item.itemCode} is not active.`,
        );
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
    const lines =
      Array.isArray(body.lines)
        ? body.lines
        : [];

    if (!lines.length) {
      throw new BadRequestException(
        'At least one requisition line is required.',
      );
    }

    const siteContext =
      await this.resolveSiteFromBody(
        body,
      );

    const requestedBy =
      clean(body.requestedBy);

    if (!requestedBy) {
      throw new BadRequestException(
        'Requested By is required.',
      );
    }

    const requestedByEmail =
      cleanOrNull(
        body.requestedByEmail,
      );

    const requesterRole =
      clean(body.requesterRole) ||
      'REQUESTER';

    const department =
      clean(body.department);

    if (!department) {
      throw new BadRequestException(
        'Department is required.',
      );
    }

    const preparedLines: any[] =
      [];

    const requestControlTypes =
      new Set<
        InventoryControlType
      >();

    const seenStockItemIds =
      new Set<string>();

    for (const line of lines) {
      const item =
        await this.resolveStockItem(
          line,
        );

      /*
      * Stores requisitions must now use
      * the controlled StockItem catalogue.
      *
      * Free-text lines are no longer
      * accepted.
      */
      if (!item) {
        throw new BadRequestException(
          'Every Stores requisition line must reference an existing stock catalogue item.',
        );
      }

      if (
        seenStockItemIds.has(
          item.id,
        )
      ) {
        throw new BadRequestException(
          `Stock item ${item.itemCode} - ${item.itemName} has been added more than once. Combine it into one requisition line.`,
        );
      }

      seenStockItemIds.add(
        item.id,
      );

      if (
        item.inventoryControlType !==
          InventoryControlType.CONSUMABLE &&
        item.inventoryControlType !==
          InventoryControlType.NON_CONSUMABLE
      ) {
        throw new BadRequestException(
          `Stock item ${item.itemCode} does not have a valid inventory control classification.`,
        );
      }

      requestControlTypes.add(
        item.inventoryControlType,
      );

      /*
      * HARD BUSINESS RULE:
      *
      * One Stores requisition may contain
      * Consumables OR Non-Consumables,
      * never both.
      */
      if (
        requestControlTypes.size >
        1
      ) {
        throw new BadRequestException(
          'Consumable and non-consumable stock cannot be raised on the same Stores Requisition. Create separate requisitions.',
        );
      }

      const quantityNumber =
        asNumber(
          line.quantity,
        );

      if (
        quantityNumber <=
        0
      ) {
        throw new BadRequestException(
          `Requested quantity for ${item.itemCode} - ${item.itemName} must be greater than zero.`,
        );
      }

      const quantity =
        new Prisma.Decimal(
          quantityNumber,
        );

      /*
      * The browser no longer controls
      * the valuation.
      *
      * Standard cost comes from StockItem.
      */
      const unitCost =
        new Prisma.Decimal(
          item.standardCost
            ? item.standardCost.toString()
            : '0',
        );

      const totalCost =
        quantity.mul(
          unitCost,
        );

      preparedLines.push({
        stockItemId:
          item.id,

        itemCode:
          item.itemCode,

        itemName:
          item.itemName,

        description:
          cleanOrNull(
            item.description,
          ),

        unitOfMeasure:
          item.unitOfMeasure ||
          'EA',

        quantity,

        unitCost,

        totalCost,

        notes:
          cleanOrNull(
            line.notes,
          ),

        inventoryControlType:
          item.inventoryControlType,
      });
    }

    if (
      requestControlTypes.size !==
      1
    ) {
      throw new BadRequestException(
        'Unable to determine the inventory control type for this Stores requisition.',
      );
    }

    const requestControlType =
      Array.from(
        requestControlTypes,
      )[0];

    /*
    * Future clients may explicitly send
    * requestControlType.
    *
    * If they do, it must agree with the
    * catalogue-derived result.
    */
    const submittedControlType =
      clean(
        body.inventoryControlType ||
          body.requestControlType,
      ).toUpperCase();

    if (
      submittedControlType &&
      submittedControlType !==
        requestControlType
    ) {
      throw new BadRequestException(
        `Submitted request type ${submittedControlType} does not match the stock catalogue classification ${requestControlType}.`,
      );
    }

    const totalValue =
      preparedLines.reduce(
        (
          sum: Prisma.Decimal,
          line: any,
        ) => {
          return sum.plus(
            line.totalCost,
          );
        },
        new Prisma.Decimal(
          0,
        ),
      );

    const requisitionNo =
      clean(
        body.requisitionNo,
      ) ||
      (
        await this.nextRequisitionNo()
      );

    /*
    * Preserve the derived control type
    * in the JSON snapshot.
    *
    * This gives us an immutable record
    * even before we add a dedicated
    * StoresRequisition column later.
    */
    const payload = {
      ...body,

      inventoryControlType:
        requestControlType,

      siteContext,

      lines:
        preparedLines.map(
          (
            line,
          ) => ({
            stockItemId:
              line.stockItemId,

            itemCode:
              line.itemCode,

            itemName:
              line.itemName,

            inventoryControlType:
              line.inventoryControlType,

            quantity:
              line.quantity.toString(),

            unitOfMeasure:
              line.unitOfMeasure,

            unitCost:
              line.unitCost.toString(),

            totalCost:
              line.totalCost.toString(),

            notes:
              line.notes,
          }),
        ),
    };

    /*
    * inventoryControlType is currently
    * a request snapshot field, not a
    * StoresRequisitionLine database
    * column, so strip it before Prisma
    * creates the actual lines.
    */
    const linesToCreate =
      preparedLines.map(
        (
          line,
        ) => ({
          stockItemId:
            line.stockItemId,

          itemCode:
            line.itemCode,

          itemName:
            line.itemName,

          description:
            line.description,

          unitOfMeasure:
            line.unitOfMeasure,

          quantity:
            line.quantity,

          unitCost:
            line.unitCost,

          totalCost:
            line.totalCost,

          notes:
            line.notes,
        }),
      );

    const created =
      await this.db()
        .storesRequisition
        .create({
          data: {
            requisitionNo,

            title:
              clean(
                body.title,
              ) ||
              `${
                requestControlType ===
                InventoryControlType.NON_CONSUMABLE
                  ? 'Non-Consumable'
                  : 'Consumable'
              } Stores requisition ${requisitionNo}`,

            description:
              clean(
                body.description,
              ) ||
              clean(
                body.reason,
              ) ||
              null,

            reason:
              cleanOrNull(
                body.reason,
              ),

            requestedBy,

            requestedByEmail,

            requesterRole,

            department,

            departmentId:
              cleanOrNull(
                body.departmentId,
              ),

            site:
              siteContext.site,

            branch:
              siteContext.branch,

            projectCode:
              cleanOrNull(
                body.projectCode,
              ),

            status:
              'SUBMITTED',

            totalValue,

            currency:
              clean(
                body.currency,
              ) ||
              'ZMW',

            payload,

            lines: {
              create:
                linesToCreate,
            },
          },

          include: {
            lines: true,
          },
        });

    const approvalWorkflow =
      await this
        .approvalWorkflowService
        .startWorkflowSafe({
          module:
            'STORES',

          workflowType:
            'STORES_REQUISITION',

          sourceType:
            'STORES_REQUISITION',

          sourceId:
            created.id,

          requestNo:
            created.requisitionNo,

          title:
            created.title ||
            `Stores requisition ${created.requisitionNo}`,

          description:
            created.description ||
            created.reason ||
            'Stores requisition approval.',

          requestedBy:
            created.requestedBy,

          requestedByEmail:
            created.requestedByEmail,

          requesterRole:
            created.requesterRole,

          department:
            created.department,

          departmentId:
            created.departmentId,

          site:
            created.site,

          branch:
            created.branch,

          amount:
            created.totalValue,

          currency:
            created.currency,

          payload:
            created,
        });

    const approvalRequestId =
      (
        approvalWorkflow as any
      )
        ?.approvalRequest
        ?.id ||
      null;

    const updated =
      approvalRequestId
        ? await this
            .db()
            .storesRequisition
            .update({
              where: {
                id:
                  created.id,
              },

              data: {
                approvalRequestId,

                status:
                  approvalWorkflow.status ===
                  'APPROVER_NOT_CONFIGURED'
                    ? 'APPROVER_NOT_CONFIGURED'
                    : 'SUBMITTED',
              },

              include: {
                lines:
                  true,
              },
            })
        : created;

    return {
      requisition:
        updated,

      approvalWorkflow,

      inventoryControlType:
        requestControlType,
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