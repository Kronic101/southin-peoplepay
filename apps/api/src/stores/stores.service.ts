import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  InventoryControlType,
  Prisma,
  StockAssignmentPolicy,
  StockMovementStatus,
  StockMovementType,
  StoresAvailabilityStatus,
  ProcurementOrigin,
  ProcurementRequestStatus,
  ProcurementRequestType,
} from '@prisma/client';

import { ApprovalWorkflowService } from '../approvals/approval-workflow.service';
import { PrismaService } from '../prisma/prisma.service';
import { AssetsService } from '../assets/assets.service';
import { DocumentsService } from '../documents/documents.service';

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

type CustodyAssignmentType =
  | 'EMPLOYEE'
  | 'SITE'
  | 'DEPARTMENT'
  | 'PROJECT';

type CustodyIntent = {
  stockItemId: string;
  quantity: Prisma.Decimal;

  assignmentType: CustodyAssignmentType;
  assignedToReferenceId: string;

  employeeId?: string | null;

  assignedToName: string;
  assignedToEmail?: string | null;
  employeeNumber?: string | null;

  department?: string | null;
  site?: string | null;
  branch?: string | null;
};

@Injectable()
export class StoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approvalWorkflowService: ApprovalWorkflowService,
    private readonly assetsService: AssetsService,
    private readonly documentsService: DocumentsService,
  ) {}

  private db() {
    return this.prisma as any;
  }

  private async nextRequisitionNo() {
    const count = await this.db().storesRequisition.count();

    return `STR-REQ-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }

  private async nextProcurementRequisitionNo() {
    const count =
      await this.db()
        .procurementRequest
        .count();

    return `REQ-${new Date().getFullYear()}-${String(
      count + 1,
    ).padStart(5, '0')}`;
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
      assignmentPolicy: true,
      assetRegistrationRequired: true,
      custodyTrackingRequired: true,
      isSerialized: true,
      isQrTracked: true,
      isRfidTracked: true,
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

    async getRequisitionOperations(
    id: string,
  ): Promise<any> {

      const sameLocationText = (
    left: unknown,
    right: unknown,
  ) => {
    const normalise = (value: unknown) =>
      clean(value)
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, ' ')
        .trim();

    const a = normalise(left);
    const b = normalise(right);

    return Boolean(a && b && a === b);
  };

    const requisition: any =
      await this.db().storesRequisition.findUnique({
        where: {
          id,
        },

        include: {
          lines: true,
          procurementRequests: true,
        },
      });

    if (!requisition) {
      throw new NotFoundException(
        'Stores requisition not found.',
      );
    }

    const requisitionLines: any[] =
      Array.isArray(requisition.lines)
        ? requisition.lines
        : [];

    const stockItemIds =
      requisitionLines
        .map(
          (line: any) =>
            clean(
              line.stockItemId,
            ),
        )
        .filter(Boolean);

    const uniqueStockItemIds: string[] =
      [
        ...new Set(
          stockItemIds,
        ),
      ];

    const stockItems: any[] =
      uniqueStockItemIds.length
        ? await this.db().stockItem.findMany({
            where: {
              id: {
                in:
                  uniqueStockItemIds,
              },
            },

            select: {
              id: true,
              itemCode: true,
              itemName: true,
              itemType: true,
              category: true,
              unitOfMeasure: true,
              standardCost: true,
              inventoryControlType:
                true,

              assignmentPolicy:
                true,

              assetRegistrationRequired:
                true,
              custodyTrackingRequired:
                true,
              isSerialized: true,
              isQrTracked: true,
              isRfidTracked: true,
              isActive: true,
            },
          })
        : [];

    const balances: any[] =
      uniqueStockItemIds.length
        ? await this.db().stockBalance.findMany({
            where: {
              stockItemId: {
                in:
                  uniqueStockItemIds,
              },

              location: {
                isActive: true,
              },
            },

            include: {
              location: true,
            },
          })
        : [];

    const postedMovements: any[] =
      await this.db().stockMovement.findMany({
        where: {
          referenceType:
            'STORES_REQUISITION',

          referenceId:
            requisition.id,

          status:
            StockMovementStatus.POSTED,
        },

        include: {
          fromLocation: true,

          lines: {
            include: {
              stockItem: true,
            },
          },
        },

        orderBy: {
          postedAt: 'asc',
        },
      });

    const itemById =
      new Map<string, any>(
        stockItems.map(
          (
            item: any,
          ): [string, any] => [
            item.id,
            item,
          ],
        ),
      );

    const balancesByItem =
      new Map<
        string,
        any[]
      >();

    for (
      const balance
      of balances
    ) {
      const current =
        balancesByItem.get(
          balance.stockItemId,
        ) || [];

      current.push(
        balance,
      );

      balancesByItem.set(
        balance.stockItemId,
        current,
      );
    }

    const issuedByItem =
      new Map<
        string,
        number
      >();

    for (
      const movement
      of postedMovements
    ) {
      const movementLines: any[] =
        Array.isArray(
          movement.lines,
        )
          ? movement.lines
          : [];

      for (
        const line
        of movementLines
      ) {
        const current =
          issuedByItem.get(
            line.stockItemId,
          ) || 0;

        issuedByItem.set(
          line.stockItemId,
          current +
            Number(
              line.quantity ||
                0,
            ),
        );
      }
    }

    const operationLines: any[] =
      requisitionLines.map(
        (
          line: any,
        ) => {
          const stockItemId =
            clean(
              line.stockItemId,
            );

          const item: any =
            stockItemId
              ? itemById.get(
                  stockItemId,
                )
              : null;

          const requestedQuantity =
            Number(
              line.quantity ||
                0,
            );

          const issuedQuantity =
            stockItemId
              ? issuedByItem.get(
                  stockItemId,
                ) || 0
              : 0;

          const remainingQuantity =
            Math.max(
              requestedQuantity -
                issuedQuantity,
              0,
            );

          const itemBalances: any[] =
            stockItemId
              ? balancesByItem.get(
                  stockItemId,
                ) || []
              : [];

          const locations =
            itemBalances
              .map(
                (
                  balance: any,
                ) => ({
                  balanceId:
                    balance.id,

                  locationId:
                    balance.locationId,

                  locationCode:
                    balance.location
                      ?.locationCode ||
                    null,

                  locationName:
                    balance.location
                      ?.locationName ||
                    null,

                  locationType:
                    balance.location
                      ?.locationType ||
                    null,

                  site:
                    balance.location
                      ?.site ||
                    null,

                  branch:
                    balance.location
                      ?.branch ||
                    null,

                  quantityOnHand:
                    Number(
                      balance.quantityOnHand ||
                        0,
                    ),
                }),
              )
              .sort(
                (
                  a: any,
                  b: any,
                ) =>
                  b.quantityOnHand -
                  a.quantityOnHand,
              );

          const requestedSiteLocations =
            locations.filter(
              (location: any) =>
                sameLocationText(
                  location.site,
                  requisition.site,
                ),
            );

          const otherStoreLocations =
            locations.filter(
              (location: any) =>
                !sameLocationText(
                  location.site,
                  requisition.site,
                ),
            );

          const requestedSiteAvailable =
            requestedSiteLocations.reduce(
              (
                sum: number,
                location: any,
              ) =>
                sum +
                Number(
                  location.quantityOnHand ||
                    0,
                ),
              0,
            );

          const otherStoresAvailable =
            otherStoreLocations.reduce(
              (
                sum: number,
                location: any,
              ) =>
                sum +
                Number(
                  location.quantityOnHand ||
                    0,
                ),
              0,
            );

          const companyAvailable =
            requestedSiteAvailable +
            otherStoresAvailable;

          const issuePossible =
            Math.min(
              remainingQuantity,
              requestedSiteAvailable,
            );

          const transferRequiredQuantity =
            Math.min(
              Math.max(
                remainingQuantity -
                  requestedSiteAvailable,
                0,
              ),
              otherStoresAvailable,
            );

          const shortfallQuantity =
            Math.max(
              remainingQuantity -
                companyAvailable,
              0,
            );

          let recommendedAction:
            | 'ISSUED'
            | 'ISSUE_FROM_SITE'
            | 'ISSUE_AND_TRANSFER'
            | 'INTER_STORE_TRANSFER'
            | 'ISSUE_AND_PROCURE'
            | 'TRANSFER_AND_PROCURE'
            | 'PROCUREMENT_REQUIRED';

          if (
            remainingQuantity <= 0
          ) {
            recommendedAction =
              'ISSUED';
          } else if (
            requestedSiteAvailable >=
            remainingQuantity
          ) {
            recommendedAction =
              'ISSUE_FROM_SITE';
          } else if (
            requestedSiteAvailable > 0 &&
            companyAvailable >=
              remainingQuantity
          ) {
            recommendedAction =
              'ISSUE_AND_TRANSFER';
          } else if (
            requestedSiteAvailable <= 0 &&
            otherStoresAvailable >=
              remainingQuantity
          ) {
            recommendedAction =
              'INTER_STORE_TRANSFER';
          } else if (
            requestedSiteAvailable > 0 &&
            shortfallQuantity > 0
          ) {
            recommendedAction =
              'ISSUE_AND_PROCURE';
          } else if (
            otherStoresAvailable > 0 &&
            shortfallQuantity > 0
          ) {
            recommendedAction =
              'TRANSFER_AND_PROCURE';
          } else {
            recommendedAction =
              'PROCUREMENT_REQUIRED';
          }

          let availabilityStatus:
            StoresAvailabilityStatus;

          if (
            remainingQuantity <= 0
          ) {
            availabilityStatus =
              StoresAvailabilityStatus.ISSUED;
          } else if (
            requestedSiteAvailable >=
            remainingQuantity
          ) {
            availabilityStatus =
              StoresAvailabilityStatus.IN_STOCK;
          } else if (
            companyAvailable > 0
          ) {
            availabilityStatus =
              StoresAvailabilityStatus.PARTIALLY_AVAILABLE;
          } else {
            availabilityStatus =
              StoresAvailabilityStatus.NOT_IN_STOCK;
          }

          return {
            lineId:
              line.id,

            stockItemId:
              stockItemId ||
              null,

            itemCode:
              line.itemCode,

            itemName:
              line.itemName,

            description:
              line.description,

            unitOfMeasure:
              line.unitOfMeasure,

            requestedQuantity,

            issuedQuantity,

            remainingQuantity,

            requestedSiteAvailable,
            otherStoresAvailable,

            availableQuantity:
              companyAvailable,

            issuePossible,

            transferRequiredQuantity,

            shortfallQuantity,

            recommendedAction,

            availabilityStatus,

            inventoryControlType:
              item
                ?.inventoryControlType ||
              null,

            itemType:
              item
                ?.itemType ||
              null,

            category:
              item
                ?.category ||
              null,

            standardCost:
              Number(
                item?.standardCost ||
                  line.unitCost ||
                  0,
              ),

            assetRegistrationRequired:
              Boolean(
                item
                  ?.assetRegistrationRequired,
              ),

            custodyTrackingRequired:
              Boolean(
                item
                  ?.custodyTrackingRequired,
              ),

            isSerialized:
              Boolean(
                item
                  ?.isSerialized,
              ),

            isQrTracked:
              Boolean(
                item
                  ?.isQrTracked,
              ),

            isRfidTracked:
              Boolean(
                item
                  ?.isRfidTracked,
              ),

            assignmentPolicy:
              item?.assignmentPolicy ||
              'NONE',  

            stockItemActive:
              item?.isActive !==
              false,

            locations,
          };
        },
      );

    let availabilityStatus:
      StoresAvailabilityStatus;

    if (
      operationLines.length >
        0 &&
      operationLines.every(
        (
          line: any,
        ) =>
          line.availabilityStatus ===
          StoresAvailabilityStatus.ISSUED,
      )
    ) {
      availabilityStatus =
        StoresAvailabilityStatus.ISSUED;
    } else if (
      operationLines.length >
        0 &&
      operationLines.every(
        (
          line: any,
        ) =>
          line.availabilityStatus ===
            StoresAvailabilityStatus.IN_STOCK ||
          line.availabilityStatus ===
            StoresAvailabilityStatus.ISSUED,
      )
    ) {
      availabilityStatus =
        StoresAvailabilityStatus.IN_STOCK;
    } else if (
      operationLines.length >
        0 &&
      operationLines.every(
        (
          line: any,
        ) =>
          line.availabilityStatus ===
            StoresAvailabilityStatus.NOT_IN_STOCK ||
          line.availabilityStatus ===
            StoresAvailabilityStatus.ISSUED,
      )
    ) {
      availabilityStatus =
        StoresAvailabilityStatus.NOT_IN_STOCK;
    } else {
      availabilityStatus =
        StoresAvailabilityStatus.PARTIALLY_AVAILABLE;
    }

    const payload =
      requisition.payload &&
      typeof requisition.payload ===
        'object' &&
      !Array.isArray(
        requisition.payload,
      )
        ? requisition.payload as
            Record<
              string,
              any
            >
        : {};

    const firstClassifiedLine: any =
      operationLines.find(
        (
          line: any,
        ) =>
          Boolean(
            line.inventoryControlType,
          ),
      );

    return {
      requisition,

      inventoryControlType:
        clean(
          payload.inventoryControlType,
        ) ||
        firstClassifiedLine
          ?.inventoryControlType ||
        null,

      availabilityStatus,

      lines:
        operationLines,

      movements:
        postedMovements.map(
          (
            movement: any,
          ) => {
            const movementLines:
              any[] =
                Array.isArray(
                  movement.lines,
                )
                  ? movement.lines
                  : [];

            return {
              id:
                movement.id,

              movementNo:
                movement.movementNo,

              status:
                movement.status,

              fromLocationId:
                movement.fromLocationId,

              fromLocation:
                movement.fromLocation,

              postedBy:
                movement.postedBy,

              postedAt:
                movement.postedAt,

              lines:
                movementLines.map(
                  (
                    line: any,
                  ) => ({
                    id:
                      line.id,

                    stockItemId:
                      line.stockItemId,

                    itemCode:
                      line.stockItem
                        ?.itemCode ||
                      null,

                    itemName:
                      line.stockItem
                        ?.itemName ||
                      null,

                    quantity:
                      Number(
                        line.quantity ||
                          0,
                      ),

                    unitCost:
                      Number(
                        line.unitCost ||
                          0,
                      ),
                  }),
                ),
            };
          },
        ),
    };
  }


  private async resolveCustodyIntent(
    params: {
      requestedLine: any;
      operationLine: any;
      stockItemId: string;
      quantity: Prisma.Decimal;
      requisition: any;
    },
  ): Promise<CustodyIntent | null> {
    const {
      requestedLine,
      operationLine,
      stockItemId,
      quantity,
      requisition,
    } = params;

    const assignmentPolicy:
      StockAssignmentPolicy =
        operationLine.assignmentPolicy ||
        StockAssignmentPolicy.NONE;

    const assignment =
      requestedLine.assignment &&
      typeof requestedLine.assignment ===
        'object'
        ? requestedLine.assignment
        : null;

    /*
    * A custody-tracked item must never be
    * configured with NONE. Treat that as
    * master-data corruption instead of
    * silently issuing uncontrolled stock.
    */
    if (
      operationLine.custodyTrackingRequired &&
      assignmentPolicy ===
        StockAssignmentPolicy.NONE
    ) {
      throw new BadRequestException(
        `${operationLine.itemName} requires custody tracking but its assignment policy is NONE. Correct the stock item configuration before issuing it.`,
      );
    }

    /*
    * NONE means no custody record is allowed.
    */
    if (
      assignmentPolicy ===
      StockAssignmentPolicy.NONE
    ) {
      if (assignment) {
        throw new BadRequestException(
          `${operationLine.itemName} does not support a custody assignment.`,
        );
      }

      return null;
    }

    /*
    * Deployment-controlled stock belongs to
    * the dedicated deployment workflow.
    */
    if (
      assignmentPolicy ===
      StockAssignmentPolicy.DEPLOYMENT
    ) {
      throw new BadRequestException(
        `${operationLine.itemName} uses deployment control and must be issued through the deployment workflow.`,
      );
    }

    if (!assignment) {
      throw new BadRequestException(
        `${operationLine.itemName} requires an assignment destination.`,
      );
    }

    const assignmentType =
      clean(
        assignment.type,
      ).toUpperCase() as
        CustodyAssignmentType;

    const allowedAssignmentTypes:
      CustodyAssignmentType[] = [
        'EMPLOYEE',
        'SITE',
        'DEPARTMENT',
        'PROJECT',
      ];

    if (
      !allowedAssignmentTypes.includes(
        assignmentType,
      )
    ) {
      throw new BadRequestException(
        `${operationLine.itemName} has an invalid assignment destination.`,
      );
    }

    /*
    * Fixed policies cannot be overridden by
    * the browser. FLEXIBLE may use any of the
    * four supported structured destinations.
    */
    if (
      assignmentPolicy !==
        StockAssignmentPolicy.FLEXIBLE &&
      assignmentType !==
        assignmentPolicy
    ) {
      throw new BadRequestException(
        `${operationLine.itemName} must use ${assignmentPolicy} assignment.`,
      );
    }

    if (
      assignmentType ===
      'EMPLOYEE'
    ) {
      const employeeId =
        clean(
          assignment.employeeId,
        );

      if (!employeeId) {
        throw new BadRequestException(
          `${operationLine.itemName} requires an employee selection.`,
        );
      }

      const employee =
        await this.db()
          .employee
          .findUnique({
            where: {
              id:
                employeeId,
            },

            select: {
              id:
                true,

              employeeNumber:
                true,

              firstName:
                true,

              middleName:
                true,

              lastName:
                true,

              email:
                true,

              siteName:
                true,

              department: {
                select: {
                  name:
                    true,
                },
              },

              site: {
                select: {
                  name:
                    true,
                },
              },
            },
          });

      if (!employee) {
        throw new BadRequestException(
          'Selected employee does not exist.',
        );
      }

      const assignedToName =
        [
          employee.firstName,
          employee.middleName,
          employee.lastName,
        ]
          .filter(Boolean)
          .join(' ')
          .trim();

      return {
        stockItemId,
        quantity,

        assignmentType:
          'EMPLOYEE',

        assignedToReferenceId:
          employee.id,

        employeeId:
          employee.id,

        assignedToName,

        assignedToEmail:
          employee.email ||
          null,

        employeeNumber:
          employee.employeeNumber ||
          null,

        department:
          employee.department
            ?.name ||
          requisition.department ||
          null,

        site:
          employee.site
            ?.name ||
          employee.siteName ||
          requisition.site ||
          null,

        branch:
          requisition.branch ||
          null,
      };
    }

    if (
      assignmentType ===
      'SITE'
    ) {
      const siteId =
        clean(
          assignment.referenceId,
        );

      if (!siteId) {
        throw new BadRequestException(
          `${operationLine.itemName} requires a site selection.`,
        );
      }

      const site =
        await this.db()
          .site
          .findUnique({
            where: {
              id:
                siteId,
            },

            select: {
              id:
                true,

              name:
                true,
            },
          });

      if (!site) {
        throw new BadRequestException(
          'Selected site does not exist.',
        );
      }

      return {
        stockItemId,
        quantity,

        assignmentType:
          'SITE',

        assignedToReferenceId:
          site.id,

        employeeId:
          null,

        assignedToName:
          site.name,

        assignedToEmail:
          null,

        employeeNumber:
          null,

        department:
          requisition.department ||
          null,

        site:
          site.name,

        branch:
          requisition.branch ||
          null,
      };
    }

    if (
      assignmentType ===
      'DEPARTMENT'
    ) {
      const departmentId =
        clean(
          assignment.referenceId,
        );

      if (!departmentId) {
        throw new BadRequestException(
          `${operationLine.itemName} requires a department selection.`,
        );
      }

      const department =
        await this.db()
          .department
          .findUnique({
            where: {
              id:
                departmentId,
            },

            select: {
              id:
                true,

              name:
                true,
            },
          });

      if (!department) {
        throw new BadRequestException(
          'Selected department does not exist.',
        );
      }

      return {
        stockItemId,
        quantity,

        assignmentType:
          'DEPARTMENT',

        assignedToReferenceId:
          department.id,

        employeeId:
          null,

        assignedToName:
          department.name,

        assignedToEmail:
          null,

        employeeNumber:
          null,

        department:
          department.name,

        site:
          requisition.site ||
          null,

        branch:
          requisition.branch ||
          null,
      };
    }

    /*
    * PROJECT currently uses the project code /
    * project reference supplied by the issue
    * UI. When a dedicated Project master model
    * is introduced, resolve it here exactly as
    * Site and Department are resolved above.
    */
    const projectReference =
      clean(
        assignment.referenceId,
      );

    if (!projectReference) {
      throw new BadRequestException(
        `${operationLine.itemName} requires a project reference.`,
      );
    }

    return {
      stockItemId,
      quantity,

      assignmentType:
        'PROJECT',

      assignedToReferenceId:
        projectReference,

      employeeId:
        null,

      assignedToName:
        projectReference,

      assignedToEmail:
        null,

      employeeNumber:
        null,

      department:
        requisition.department ||
        null,

      site:
        requisition.site ||
        null,

      branch:
        requisition.branch ||
        null,
    };
  }

  private async createCustodyAssignments(
    params: {
      custodyIntents:
        CustodyIntent[];
      movement:
        any;
      requisition:
        any;
      assignedBy:
        string;
    },
  ) {
    const {
      custodyIntents,
      movement,
      requisition,
      assignedBy,
    } = params;

    if (
      !custodyIntents.length
    ) {
      return [];
    }

    const movementLines:
      any[] =
        Array.isArray(
          movement.lines,
        )
          ? movement.lines
          : [];

    const assignments:
      any[] = [];

    for (
      const intent
      of custodyIntents
    ) {
      /*
      * issueRequisition already blocks the same
      * stock item appearing twice in one issue,
      * therefore stockItemId is unambiguous here.
      */
      const movementLine =
        movementLines.find(
          (
            line: any,
          ) =>
            clean(
              line.stockItemId,
            ) ===
            intent.stockItemId,
        );

      if (!movementLine) {
        throw new BadRequestException(
          `Unable to link custody for stock item ${intent.stockItemId} to its posted movement line.`,
        );
      }

      const assignmentNo =
        `CUST-${movement.movementNo}-${String(
          movementLine.id,
        ).slice(0, 8)}`;

      const assignment =
        await this.db()
          .assetCustodyAssignment
          .upsert({
            where: {
              assignmentNo,
            },

            update: {
              stockItemId:
                intent.stockItemId,

              quantity:
                intent.quantity,

              assignedToType:
                intent.assignmentType,

              assignedToReferenceId:
                intent.assignedToReferenceId,

              assignedToName:
                intent.assignedToName,

              assignedToEmail:
                intent.assignedToEmail ||
                null,

              employeeId:
                intent.employeeId ||
                null,

              employeeNumber:
                intent.employeeNumber ||
                null,

              department:
                intent.department ||
                null,

              site:
                intent.site ||
                null,

              branch:
                intent.branch ||
                null,

              stockMovementId:
                movement.id,

              stockMovementLineId:
                movementLine.id,

              storesRequisitionId:
                requisition.id,

              assignedBy,

              status:
                'ASSIGNED',

              approvalRequestId:
                requisition.approvalRequestId ||
                null,
            },

            create: {
              assignmentNo,

              stockItemId:
                intent.stockItemId,

              quantity:
                intent.quantity,

              assignedToType:
                intent.assignmentType,

              assignedToReferenceId:
                intent.assignedToReferenceId,

              assignedToName:
                intent.assignedToName,

              assignedToEmail:
                intent.assignedToEmail ||
                null,

              employeeId:
                intent.employeeId ||
                null,

              employeeNumber:
                intent.employeeNumber ||
                null,

              department:
                intent.department ||
                null,

              site:
                intent.site ||
                null,

              branch:
                intent.branch ||
                null,

              stockMovementId:
                movement.id,

              stockMovementLineId:
                movementLine.id,

              storesRequisitionId:
                requisition.id,

              assignedBy,

              assignedAt:
                new Date(),

              status:
                'ASSIGNED',

              approvalRequestId:
                requisition.approvalRequestId ||
                null,

              notes:
                `Created automatically from Stores issue ${movement.movementNo} against ${requisition.requisitionNo}.`,
            },
          });

      assignments.push(
        assignment,
      );
    }

    return assignments;
  }

  async issueRequisition(
    id: string,
    body: any,
  ) {
    const operations: any =
      await this.getRequisitionOperations(
        id,
      );

    const requisition: any =
      operations.requisition;

    const operationLines:
      any[] =
        Array.isArray(
          operations.lines,
        )
          ? operations.lines
          : [];

    if (
      clean(
        requisition.status,
      ).toUpperCase() !==
      'APPROVED'
    ) {
      throw new BadRequestException(
        'Stores stock can only be issued after the requisition has received final approval.',
      );
    }

    if (
      operations.availabilityStatus ===
      StoresAvailabilityStatus.ISSUED
    ) {
      throw new BadRequestException(
        'This Stores requisition has already been fully issued.',
      );
    }

    const fromLocationId =
      clean(
        body.fromLocationId,
      );

    if (!fromLocationId) {
      throw new BadRequestException(
        'Issuing stock location is required.',
      );
    }

    const location =
      await this.db()
        .stockLocation
        .findUnique({
          where: {
            id:
              fromLocationId,
          },
        });

    if (!location) {
      throw new BadRequestException(
        'Selected stock location does not exist.',
      );
    }

    if (!location.isActive) {
      throw new BadRequestException(
        `Stock location ${location.locationCode} is not active.`,
      );
    }

    const requestedSite =
      clean(
        requisition.site,
      );

    const issuingSite =
      clean(
        location.site,
      );

    if (
      requestedSite &&
      issuingSite &&
      requestedSite.toUpperCase() !==
        issuingSite.toUpperCase()
    ) {
      throw new BadRequestException(
        `Stock at ${location.locationName} belongs to ${issuingSite}, while this requisition is for ${requestedSite}. Create an inter-store transfer before issuing it.`,
      );
    }

    const issuedBy =
      clean(
        body.issuedBy,
      );

    if (!issuedBy) {
      throw new BadRequestException(
        'Issued By is required.',
      );
    }

    const issuedByEmail =
      cleanOrNull(
        body.issuedByEmail,
      );

    const requestedIssueLines =
      Array.isArray(
        body.lines,
      )
        ? body.lines
        : [];

    if (
      !requestedIssueLines.length
    ) {
      throw new BadRequestException(
        'At least one stock issue line is required.',
      );
    }

    const operationByStockItem =
      new Map<
        string,
        any
      >(
        operationLines
          .filter(
            (
              line: any,
            ) =>
              Boolean(
                line.stockItemId,
              ),
          )
          .map(
            (
              line: any,
            ): [
              string,
              any,
            ] => [
              String(
                line.stockItemId,
              ),
              line,
            ],
          ),
      );

    const seenStockItemIds =
      new Set<string>();

    const movementLines:
      Array<{
        stockItemId: string;
        quantity: Prisma.Decimal;
        unitCost: Prisma.Decimal;
        totalCost: Prisma.Decimal;
        notes: string | null;
      }> = [];

    const custodyIntents:
      CustodyIntent[] = [];

    for (
      const requestedLine
      of requestedIssueLines
    ) {
      const stockItemId =
        clean(
          requestedLine.stockItemId,
        );

      if (!stockItemId) {
        throw new BadRequestException(
          'Every issue line must contain stockItemId.',
        );
      }

      if (
        seenStockItemIds.has(
          stockItemId,
        )
      ) {
        throw new BadRequestException(
          'The same stock item cannot appear more than once in one issue transaction.',
        );
      }

      seenStockItemIds.add(
        stockItemId,
      );

      const operationLine =
        operationByStockItem.get(
          stockItemId,
        );

      if (!operationLine) {
        throw new BadRequestException(
          'One of the requested issue items does not belong to this requisition.',
        );
      }

      if (
        Number(
          operationLine.remainingQuantity ||
            0,
        ) <= 0
      ) {
        throw new BadRequestException(
          `${operationLine.itemCode || operationLine.itemName} has already been fully issued.`,
        );
      }

      const quantityNumber =
        Number(
          requestedLine.quantity ||
            0,
        );

      if (
        !Number.isFinite(
          quantityNumber,
        ) ||
        quantityNumber <= 0
      ) {
        throw new BadRequestException(
          `Issue quantity for ${operationLine.itemCode || operationLine.itemName} must be greater than zero.`,
        );
      }

      if (
        quantityNumber >
        Number(
          operationLine.remainingQuantity ||
            0,
        )
      ) {
        throw new BadRequestException(
          `Cannot issue ${quantityNumber} ${operationLine.unitOfMeasure} of ${operationLine.itemName}. Only ${operationLine.remainingQuantity} remain approved for issue.`,
        );
      }

      const balance =
        await this.db()
          .stockBalance
          .findUnique({
            where: {
              stockItemId_locationId: {
                stockItemId,

                locationId:
                  fromLocationId,
              },
            },
          });

      const quantityOnHand =
        Number(
          balance?.quantityOnHand ||
            0,
        );

      if (
        quantityNumber >
        quantityOnHand
      ) {
        throw new BadRequestException(
          `Insufficient stock for ${operationLine.itemName} at ${location.locationName}. Available ${quantityOnHand}, attempted issue ${quantityNumber}.`,
        );
      }

      /*
      * Asset-controlled stock still cannot leave
      * Stores until the asset-registration workflow
      * has produced the physical asset records.
      */
      if (
        operationLine.assetRegistrationRequired
      ) {
        throw new BadRequestException(
          `${operationLine.itemName} requires asset registration before issue. Complete the asset registration step first.`,
        );
      }

      const decimalQuantity =
        new Prisma.Decimal(
          quantityNumber,
        );

      const custodyIntent =
        await this.resolveCustodyIntent({
          requestedLine,
          operationLine,
          stockItemId,
          quantity:
            decimalQuantity,
          requisition,
        });

      if (custodyIntent) {
        custodyIntents.push(
          custodyIntent,
        );
      }

      const unitCost =
        new Prisma.Decimal(
          operationLine.standardCost ||
            0,
        );

      movementLines.push({
        stockItemId,

        quantity:
          decimalQuantity,

        unitCost,

        totalCost:
          decimalQuantity.mul(
            unitCost,
          ),

        notes:
          cleanOrNull(
            requestedLine.notes,
          ),
      });
    }

    const priorMovementCount =
      await this.db()
        .stockMovement
        .count({
          where: {
            referenceType:
              'STORES_REQUISITION',

            referenceId:
              requisition.id,
          },
        });

    const movementNo =
      `${requisition.requisitionNo}-ISS-${String(
        priorMovementCount + 1,
      ).padStart(3, '0')}`;

    const now =
      new Date();

    const movement =
      await this.db()
        .stockMovement
        .create({
          data: {
            movementNo,

            movementType:
              StockMovementType.ISSUE,

            /*
            * The Stores requisition already passed
            * its approval workflow. Do not create
            * another approval chain for the physical
            * issue.
            */
            status:
              StockMovementStatus.APPROVED,

            approvalStatus:
              'APPROVED',

            fromLocationId,

            requestedBy:
              requisition.requestedBy,

            requestedByEmail:
              requisition.requestedByEmail,

            department:
              requisition.department,

            site:
              requisition.site,

            branch:
              requisition.branch,

            projectCode:
              requisition.projectCode,

            reason:
              clean(
                body.notes,
              ) ||
              `Stores issue against ${requisition.requisitionNo}`,

            referenceType:
              'STORES_REQUISITION',

            referenceId:
              requisition.id,

            referenceNo:
              requisition.requisitionNo,

            submittedAt:
              now,

            approvedBy:
              requisition.approvedBy ||
              'Stores requisition approval workflow',

            approvedAt:
              requisition.approvedAt ||
              now,

            lines: {
              create:
                movementLines,
            },
          },

          include: {
            lines: {
              include: {
                stockItem:
                  true,
              },
            },

            fromLocation:
              true,
          },
        });

    /*
    * AssetsService remains the single
    * authoritative stock posting engine.
    */
    const postedMovement =
      await this.assetsService
        .postMovement(
          movement.id,
          {
            postedBy:
              issuedBy,

            postedByEmail:
              issuedByEmail,

            notes:
              cleanOrNull(
                body.notes,
              ),
          },
        );

    /*
    * Custody is created only after the physical
    * stock posting succeeds, so an unposted issue
    * can never create an active custody record.
    *
    * Until postMovement is transaction-aware, a
    * custody persistence failure is surfaced as a
    * warning rather than returning an HTTP failure
    * after stock has already moved.
    */
    let custodyAssignments:
      any[] = [];

    let custodyWarning:
      string | null =
        null;

    try {
      custodyAssignments =
        await this.createCustodyAssignments({
          custodyIntents,

          movement,

          requisition,

          assignedBy:
            issuedBy,
        });
    } catch (
      error: any
    ) {
      custodyWarning =
        error?.message ||
        'Stock was posted, but one or more structured custody assignments could not be stored.';
    }

    const refreshed =
      await this.getRequisitionOperations(
        id,
      );

    await this.db()
      .storesRequisition
      .update({
        where: {
          id,
        },

        data: {
          availabilityStatus:
            refreshed.availabilityStatus,
        },
      });

    let docketDocument:
      any =
        null;

    let documentWarning:
      string | null =
        null;

    try {
      docketDocument =
        await this.documentsService
          .createStoresIssueDocketDocument({
            requisition,

            movement:
              postedMovement,

            operations:
              refreshed,

            uploadedBy:
              issuedBy,

            uploadedByEmail:
              issuedByEmail,
          });
    } catch (
      error: any
    ) {
      /*
      * Stock posting is authoritative.
      * Do not roll back a successfully posted
      * issue because docket generation failed.
      */
      documentWarning =
        error?.message ||
        'Issue posted, but the immutable issue docket could not be stored.';
    }

    return {
      requisitionId:
        requisition.id,

      requisitionNo:
        requisition.requisitionNo,

      movement:
        postedMovement,

      custodyAssignments,
      custodyWarning,

      availabilityStatus:
        refreshed.availabilityStatus,

      lines:
        refreshed.lines,

      docketDocument,
      documentWarning,
    };
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

    const storesApprovalMatrixName =
      requestControlType ===
      InventoryControlType.NON_CONSUMABLE
        ? 'Stores Requisition Authorisation - Non-Consumable'
        : 'Stores Requisition Authorisation - Consumable';

    const approvalWorkflow =
      await this
        .approvalWorkflowService
        .startWorkflowSafe({
          module:
            'STORES',

          workflowType:
            'STORES_REQUISITION',

          matrixRuleName:
            storesApprovalMatrixName,

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


async createShortfallProcurementRequest(
      id: string,
      body: any,
    ) {
      const operations: any =
        await this.getRequisitionOperations(
          id,
        );

      const requisition: any =
        operations.requisition;

      if (
        clean(
          requisition.status,
        ).toUpperCase() !==
        'APPROVED'
      ) {
        throw new BadRequestException(
          'A Procurement Request for Stores shortfall can only be created after final requisition approval.',
        );
      }

      const requestedStockItemIds =
        Array.isArray(
          body.stockItemIds,
        )
          ? new Set(
              body.stockItemIds
                .map(
                  (
                    value:
                      unknown,
                  ) =>
                    clean(
                      value,
                    ),
                )
                .filter(
                  Boolean,
                ),
            )
          : null;

      const shortfallLines:
        any[] =
          (
            Array.isArray(
              operations.lines,
            )
              ? operations.lines
              : []
          ).filter(
            (
              line:
                any,
            ) => {
              if (
                !line.stockItemId
              ) {
                return false;
              }

              if (
                Number(
                  line.shortfallQuantity ||
                    0,
                ) <= 0
              ) {
                return false;
              }

              if (
                requestedStockItemIds &&
                !requestedStockItemIds.has(
                  line.stockItemId,
                )
              ) {
                return false;
              }

              return true;
            },
          );

      if (
        !shortfallLines.length
      ) {
        throw new BadRequestException(
          'There is no current Stores shortfall to send to Procurement.',
        );
      }

      /*
      * Idempotency guard:
      * only one active stock-replenishment PR may exist
      * for a Stores requisition at a time.
      */
      const existing =
        await this.db()
          .procurementRequest
          .findFirst({
            where: {
              sourceStoresRequisitionId:
                requisition.id,

              origin:
                ProcurementOrigin.STORES_STOCKOUT,

              requestType:
                ProcurementRequestType.STOCK_REPLENISHMENT,

              status: {
                notIn: [
                  ProcurementRequestStatus.REJECTED,
                  ProcurementRequestStatus.CLOSED,
                ],
              },
            },

            include: {
              lines:
                true,
            },

            orderBy: {
              createdAt:
                'desc',
            },
          });

      if (existing) {
        return {
          status:
            'EXISTING',

          procurementRequest:
            existing,

          approvalWorkflow:
            null,

          message:
            `An active stock-replenishment Procurement Request (${existing.requisitionNo}) already exists for this Stores requisition.`,
        };
      }

      const estimatedAmount =
        shortfallLines.reduce(
          (
            sum:
              Prisma.Decimal,
            line:
              any,
          ) => {
            const quantity =
              new Prisma.Decimal(
                Number(
                  line.shortfallQuantity ||
                    0,
                ),
              );

            const unitCost =
              new Prisma.Decimal(
                Number(
                  line.standardCost ||
                    0,
                ),
              );

            return sum.plus(
              quantity.mul(
                unitCost,
              ),
            );
          },
          new Prisma.Decimal(
            0,
          ),
        );

      const procurementNo =
        await this.nextProcurementRequisitionNo();

      const requestedBy =
        clean(
          body.requestedBy ||
            body.createdBy,
        ) ||
        'Stores Officer';

      const requestedByEmail =
        cleanOrNull(
          body.requestedByEmail ||
            body.createdByEmail,
        );

      const sourceLines =
        shortfallLines.map(
          (
            line:
              any,
          ) => ({
            stockItemId:
              line.stockItemId,

            itemCode:
              line.itemCode,

            itemName:
              line.itemName,

            category:
              line.category,

            inventoryControlType:
              line.inventoryControlType,

            requestedQuantity:
              Number(
                line.requestedQuantity ||
                  0,
              ),

            alreadyIssuedQuantity:
              Number(
                line.issuedQuantity ||
                  0,
              ),

            availableQuantity:
              Number(
                line.availableQuantity ||
                  0,
              ),

            shortfallQuantity:
              Number(
                line.shortfallQuantity ||
                  0,
              ),

            unitOfMeasure:
              line.unitOfMeasure,

            estimatedUnitCost:
              Number(
                line.standardCost ||
                  0,
              ),
          }),
        );

      const created =
        await this.db()
          .procurementRequest
          .create({
            data: {
              requisitionNo:
                procurementNo,

              requestType:
                ProcurementRequestType.STOCK_REPLENISHMENT,

              origin:
                ProcurementOrigin.STORES_STOCKOUT,

              department:
                requisition.department ||
                'Operations',

              site:
                requisition.site ||
                null,

              requestedBy,

              requestedByEmail,

              requestedByRole:
                clean(
                  body.requestedByRole,
                ) ||
                'STORES_OFFICER',

              sourceRequestFromName:
                requisition.requestedBy ||
                null,

              sourceRequestFromEmail:
                requisition.requestedByEmail ||
                null,

              sourceRequestDate:
                requisition.submittedAt ||
                requisition.createdAt ||
                new Date(),

              sourceRequestReference:
                requisition.requisitionNo,

              sourceStoresRequisitionId:
                requisition.id,

              description:
                `Stock replenishment required for Stores shortfall on ${requisition.requisitionNo}.`,

              estimatedAmount,

              amount:
                estimatedAmount,

              currency:
                requisition.currency ||
                'ZMW',

              procurementStage:
                'REQUISITION_SUBMITTED',

              financeStage:
                'NOT_REVIEWED',

              status:
                ProcurementRequestStatus.SUBMITTED,

              payload: {
                generatedBy:
                  'STORES_SHORTFALL',

                sourceStoresRequisitionId:
                  requisition.id,

                sourceStoresRequisitionNo:
                  requisition.requisitionNo,

                sourceInventoryControlType:
                  operations.inventoryControlType ||
                  null,

                generatedAt:
                  new Date().toISOString(),

                generatedByName:
                  requestedBy,

                generatedByEmail:
                  requestedByEmail,

                lines:
                  sourceLines,
              },

              lines: {
                create:
                  shortfallLines.map(
                    (
                      line:
                        any,
                    ) => {
                      const quantity =
                        new Prisma.Decimal(
                          Number(
                            line.shortfallQuantity ||
                              0,
                          ),
                        );

                      const unitCost =
                        new Prisma.Decimal(
                          Number(
                            line.standardCost ||
                              0,
                          ),
                        );

                      return {
                        itemName:
                          line.itemName,

                        description:
                          [
                            line.itemCode
                              ? `Stock code: ${line.itemCode}`
                              : null,

                            line.description ||
                              null,
                          ]
                            .filter(
                              Boolean,
                            )
                            .join(
                              ' | ',
                            ) ||
                          null,

                        specification:
                          null,

                        category:
                          line.category ||
                          null,

                        quantity,

                        unitOfMeasure:
                          line.unitOfMeasure ||
                          'EA',

                        estimatedUnitCost:
                          unitCost,

                        estimatedTotal:
                          quantity.mul(
                            unitCost,
                          ),

                        notes:
                          [
                            `Generated from Stores shortfall ${requisition.requisitionNo}.`,
                            `StockItemId: ${line.stockItemId}.`,
                            `Requested: ${line.requestedQuantity}.`,
                            `Already issued: ${line.issuedQuantity}.`,
                            `Current total available: ${line.availableQuantity}.`,
                          ].join(
                            ' ',
                          ),
                      };
                    },
                  ),
              },
            },

            include: {
              lines:
                true,
            },
          });

      const approvalWorkflow =
        await this
          .approvalWorkflowService
          .startWorkflowSafe({
            module:
              'PROCUREMENT',

            workflowType:
              'PROCUREMENT_REQUEST',

            sourceType:
              'PROCUREMENT_REQUEST',

            sourceId:
              created.id,

            requestNo:
              created.requisitionNo,

            title:
              `Stores Stock Replenishment ${created.requisitionNo}`,

            description:
              created.description,

            requestedBy:
              created.requestedBy,

            requestedByEmail:
              created.requestedByEmail,

            requesterRole:
              created.requestedByRole ||
              'STORES_OFFICER',

            department:
              created.department,

            site:
              created.site,

            branch:
              requisition.branch ||
              null,

            amount:
              created.estimatedAmount,

            currency:
              created.currency,

            payload: {
              procurementRequest:
                created,

              storesRequisition: {
                id:
                  requisition.id,

                requisitionNo:
                  requisition.requisitionNo,
              },

              shortfallLines:
                sourceLines,
            },
          });

      const approvalRequestId =
        (
          approvalWorkflow as
            any
        )
          ?.approvalRequest
          ?.id ||
        null;

      const updated =
        approvalRequestId
          ? await this.db()
              .procurementRequest
              .update({
                where: {
                  id:
                    created.id,
                },

                data: {
                  approvalRequestId,

                  procurementStage:
                    approvalWorkflow.status ===
                    'APPROVER_NOT_CONFIGURED'
                      ? 'APPROVER_NOT_CONFIGURED'
                      : 'APPROVAL_IN_PROGRESS',
                },

                include: {
                  lines:
                    true,
                },
              })
          : created;

      return {
        status:
          'CREATED',

        procurementRequest:
          updated,

        approvalWorkflow,

        message:
          `Procurement Request ${updated.requisitionNo} created for the current Stores shortfall.`,
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
  async getActiveSites() {
    return this.db().site.findMany({
      where: {
        isActive: true,
      },

      select: {
        id: true,
        name: true,
        code: true,
        isActive: true,
      },

      orderBy: {
        name: 'asc',
      },
    });
  }

}