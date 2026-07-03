import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SitesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.operationalSite.findMany({
      where: { isActive: true },
      include: {
        siteManagers: {
          where: { isActive: true },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const site = await this.prisma.operationalSite.findUnique({
      where: { id },
      include: {
        siteManagers: {
          where: { isActive: true },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!site) {
      throw new NotFoundException('Site not found.');
    }

    return site;
  }

  create(body: any) {
    return this.prisma.operationalSite.create({
      data: {
        code: String(body.code || '').trim().toUpperCase(),
        name: String(body.name || '').trim(),
        location: body.location || null,
        description: body.description || null,
        isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      },
    });
  }

  update(id: string, body: any) {
    return this.prisma.operationalSite.update({
      where: { id },
      data: {
        code: body.code ? String(body.code).trim().toUpperCase() : undefined,
        name: body.name ? String(body.name).trim() : undefined,
        location: body.location === undefined ? undefined : body.location || null,
        description: body.description === undefined ? undefined : body.description || null,
        isActive: body.isActive === undefined ? undefined : Boolean(body.isActive),
      },
    });
  }

  addManager(siteId: string, body: any) {
    return this.prisma.siteManagerAssignment.create({
      data: {
        siteId,
        managerName: String(body.managerName || '').trim(),
        managerEmail: String(body.managerEmail || '').trim().toLowerCase(),
        managerRole: body.managerRole || 'SITE_MANAGER',
        isPrimary: body.isPrimary === undefined ? true : Boolean(body.isPrimary),
        isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      },
    });
  }

  updateManager(id: string, body: any) {
    return this.prisma.siteManagerAssignment.update({
      where: { id },
      data: {
        managerName: body.managerName === undefined ? undefined : String(body.managerName || '').trim(),
        managerEmail:
          body.managerEmail === undefined ? undefined : String(body.managerEmail || '').trim().toLowerCase(),
        managerRole: body.managerRole === undefined ? undefined : body.managerRole || 'SITE_MANAGER',
        isPrimary: body.isPrimary === undefined ? undefined : Boolean(body.isPrimary),
        isActive: body.isActive === undefined ? undefined : Boolean(body.isActive),
      },
    });
  }
}