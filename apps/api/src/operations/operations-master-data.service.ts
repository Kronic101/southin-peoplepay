import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function sortByCodeThenName<T extends { code?: string | null; name?: string | null }>(items: T[]) {
  return [...items].sort((a, b) => {
    const aKey = `${a.code || ''}${a.name || ''}`;
    const bKey = `${b.code || ''}${b.name || ''}`;
    return aKey.localeCompare(bKey);
  });
}

@Injectable()
export class OperationsMasterDataService {
  constructor(private readonly prisma: PrismaService) {}

  async getMasterData() {
    const [sites, stockLocations] = await Promise.all([
      this.prisma.site.findMany({
        include: {
          managerAssignments: {
            where: {
              isActive: true,
            },
            orderBy: [
              { isPrimary: 'desc' },
              { createdAt: 'asc' },
            ],
          },
          initiatorAssignments: {
            where: {
              isActive: true,
            },
            orderBy: [
              { isPrimary: 'desc' },
              { createdAt: 'asc' },
            ],
          },
        },
      }),

      this.prisma.stockLocation.findMany({
        where: {
          isActive: true,
        },
        orderBy: [
          { locationCode: 'asc' },
        ],
      }),
    ]);

    const formattedSites = sortByCodeThenName(
      sites.map((site) => {
        const primaryManager =
          site.managerAssignments.find((item) => item.isPrimary) ||
          site.managerAssignments[0] ||
          null;

        const activeInitiators = site.initiatorAssignments || [];

        return {
          id: site.id,
          code: site.code,
          name: site.name,
          description: site.description,

          manager: primaryManager
            ? {
                id: primaryManager.id,
                name: primaryManager.managerName,
                email: primaryManager.managerEmail,
                role: primaryManager.managerRole,
                isPrimary: primaryManager.isPrimary,
                isActive: primaryManager.isActive,
              }
            : null,

          managers: site.managerAssignments.map((manager) => ({
            id: manager.id,
            name: manager.managerName,
            email: manager.managerEmail,
            role: manager.managerRole,
            isPrimary: manager.isPrimary,
            isActive: manager.isActive,
          })),

          initiators: activeInitiators.map((initiator) => ({
            id: initiator.id,
            name: initiator.initiatorName,
            email: initiator.initiatorEmail,
            role: initiator.initiatorRole,
            moduleScope: initiator.moduleScope,
            isPrimary: initiator.isPrimary,
            isActive: initiator.isActive,
          })),
        };
      }),
    );

    const formattedStockLocations = stockLocations.map((location) => ({
      id: location.id,
      locationCode: location.locationCode,
      locationName: location.locationName,
      locationType: location.locationType,
      site: location.site,
      branch: location.branch,
      department: location.department,
      isActive: location.isActive,
    }));

    const warehouseLocations = formattedStockLocations.filter(
      (location) => location.locationType === 'WAREHOUSE',
    );

    const siteStockLocations = formattedStockLocations.filter(
      (location) => location.locationType === 'SITE_STORE',
    );

    const containerLocations = formattedStockLocations.filter(
      (location) => location.locationType === 'CONTAINER',
    );

    const yardLocations = formattedStockLocations.filter(
      (location) => location.locationType === 'YARD',
    );

    const quarantineLocations = formattedStockLocations.filter(
      (location) => location.locationType === 'QUARANTINE',
    );

    return {
      generatedAt: new Date().toISOString(),

      sites: formattedSites,

      siteManagers: formattedSites.flatMap((site) =>
        site.managers.map((manager) => ({
          ...manager,
          siteId: site.id,
          siteCode: site.code,
          siteName: site.name,
        })),
      ),

      siteInitiators: formattedSites.flatMap((site) =>
        site.initiators.map((initiator) => ({
          ...initiator,
          siteId: site.id,
          siteCode: site.code,
          siteName: site.name,
        })),
      ),

      stockLocations: formattedStockLocations,
      warehouseLocations,
      siteStockLocations,
      containerLocations,
      yardLocations,
      quarantineLocations,

      summary: {
        sites: formattedSites.length,
        siteManagers: formattedSites.flatMap((site) => site.managers).length,
        siteInitiators: formattedSites.flatMap((site) => site.initiators).length,
        stockLocations: formattedStockLocations.length,
        warehouses: warehouseLocations.length,
        siteStores: siteStockLocations.length,
        containers: containerLocations.length,
        yards: yardLocations.length,
        quarantineLocations: quarantineLocations.length,
      },
    };
  }
}