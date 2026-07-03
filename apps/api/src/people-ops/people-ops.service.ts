import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PeopleOpsService {
  constructor(private readonly prisma: PrismaService) {}

  async getContext(query: { siteId?: string; managerEmail?: string }) {
    const siteId = query.siteId || undefined;
    const managerEmail = query.managerEmail
      ? String(query.managerEmail).trim().toLowerCase()
      : undefined;

    const sites = await this.prisma.site.findMany({
      orderBy: { name: 'asc' },
      include: {
        managerAssignments: {
          where: { isActive: true },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });

    const selectedSite =
      siteId
        ? sites.find((site) => site.id === siteId) || null
        : sites[0] || null;

    const managerFilteredSiteIds = managerEmail
      ? sites
          .filter((site) =>
            site.managerAssignments.some(
              (manager) => manager.managerEmail.toLowerCase() === managerEmail,
            ),
          )
          .map((site) => site.id)
      : [];

    const effectiveSiteId = siteId || selectedSite?.id || undefined;

    const employees = await this.prisma.employee.findMany({
      where: {
        ...(effectiveSiteId ? { siteId: effectiveSiteId } : {}),
        ...(managerEmail && managerFilteredSiteIds.length
          ? { siteId: { in: managerFilteredSiteIds } }
          : {}),
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      include: {
        department: true,
        jobTitle: true,
        site: true,
        employmentType: true,
        portalAccount: true,
      },
    });

    return {
      generatedAt: new Date().toISOString(),
      sites,
      selectedSite,
      siteManagers: selectedSite?.managerAssignments || [],
      employees: employees.map((employee) => ({
        id: employee.id,
        employeeNumber: employee.employeeNumber,
        name: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
        firstName: employee.firstName,
        lastName: employee.lastName,
        siteId: employee.siteId,
        siteName: employee.site?.name || employee.siteName || '-',
        department: employee.department?.name || '-',
        jobTitle: employee.jobTitle?.name || '-',
        employmentType: employee.employmentType?.name || '-',
        payBasis: employee.payBasis || null,
        hourlyRate: employee.hourlyRate || null,
        dailyRate: employee.dailyRate || null,
        monthlyRate: employee.monthlyRate || null,
        status: employee.status,
        portalProfile: employee.portalAccount?.accessProfile || null,
      })),
    };
  }
}