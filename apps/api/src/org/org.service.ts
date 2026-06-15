import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * OrgService
 * ------------------------------------------------------
 * Central organisation structure service for Southin Operations Hub.
 *
 * This service stores departments, roles, and reporting positions.
 * It is intentionally shared across HR, Payroll, Finance, Procurement,
 * Asset Management, Fleet, Safety, Quality/Admin, and Operations.
 */
@Injectable()
export class OrgService {
  constructor(private readonly prisma: PrismaService) {}

  async getDepartments() {
    return this.prisma.orgDepartment.findMany({
      orderBy: { name: 'asc' },
      include: {
        positions: true,
      },
    });
  }

  async createDepartment(payload: {
    code: string;
    name: string;
    description?: string;
  }) {
    return this.prisma.orgDepartment.upsert({
      where: { code: payload.code },
      update: {
        name: payload.name,
        description: payload.description,
        isActive: true,
      },
      create: {
        code: payload.code,
        name: payload.name,
        description: payload.description,
      },
    });
  }

  async getRoles() {
    return this.prisma.orgRole.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createRole(payload: {
    code: string;
    name: string;
    description?: string;
    isStaffRole?: boolean;
  }) {
    return this.prisma.orgRole.upsert({
      where: { code: payload.code },
      update: {
        name: payload.name,
        description: payload.description,
        isStaffRole: payload.isStaffRole ?? true,
        isActive: true,
      },
      create: {
        code: payload.code,
        name: payload.name,
        description: payload.description,
        isStaffRole: payload.isStaffRole ?? true,
      },
    });
  }

  async getPositions() {
    return this.prisma.orgPosition.findMany({
      orderBy: [{ branch: 'asc' }, { site: 'asc' }, { title: 'asc' }],
      include: {
        department: true,
        role: true,
        reportsToPosition: true,
        directReports: true,
      },
    });
  }

  async createPosition(payload: {
    title: string;
    positionCode?: string;
    site?: string;
    branch?: string;
    isHod?: boolean;
    departmentId?: string;
    roleId?: string;
    reportsToPositionId?: string;
  }) {
    return this.prisma.orgPosition.create({
      data: {
        title: payload.title,
        positionCode: payload.positionCode,
        site: payload.site,
        branch: payload.branch,
        isHod: payload.isHod ?? false,
        departmentId: payload.departmentId,
        roleId: payload.roleId,
        reportsToPositionId: payload.reportsToPositionId,
      },
      include: {
        department: true,
        role: true,
        reportsToPosition: true,
      },
    });
  }

  async seedSouthinOrgStructure() {
    const departments = [
      { code: 'OPS', name: 'Operations' },
      { code: 'FIN', name: 'Finance' },
      { code: 'HR', name: 'Human Resources' },
      { code: 'QA', name: 'Quality and Admin' },
      { code: 'ASSET', name: 'Asset Inventory' },
      { code: 'PROC', name: 'Procurement and Stores' },
      { code: 'SAFETY', name: 'Safety' },
      { code: 'FLEET', name: 'Fleet and Drivers' },
      { code: 'SECURITY', name: 'Security' },
    ];

    const roles = [
      { code: 'DIRECTOR_OPERATIONS', name: 'Director Operations' },
      { code: 'DIRECTOR_FINANCE', name: 'Director Finance' },
      { code: 'HR_MANAGER', name: 'Human Resource Manager' },
      { code: 'QUALITY_ADMIN_MANAGER', name: 'Quality and Admin Manager' },
      { code: 'ASSET_MANAGER', name: 'Asset Inventory Manager' },
      { code: 'OPERATIONS_MANAGER', name: 'Operations Manager' },
      { code: 'BRANCH_MANAGER', name: 'Branch Manager' },
      { code: 'PROCUREMENT_STORES_OFFICER', name: 'Procurement and Stores Officer' },
      { code: 'SAFETY_OFFICER', name: 'Safety Officer' },
      { code: 'YARD_ASSET_FOREMAN', name: 'Yard Asset Foreman' },
      { code: 'ASSET_MAINTENANCE_SUPERVISOR', name: 'Asset Maintenance Supervisor' },
      { code: 'DRIVER_OPERATOR', name: 'Driver / Mechanic / Operator', isStaffRole: false },
      { code: 'GENERAL_WORKER', name: 'Scaffolder / Sandblaster / Painter / Crew', isStaffRole: false },
      { code: 'OFFICE_ASSISTANT', name: 'Office Assistant' },
      { code: 'SECURITY_PERSONNEL', name: 'Security Personnel', isStaffRole: false },
    ];

    for (const department of departments) {
      await this.createDepartment(department);
    }

    for (const role of roles) {
      await this.createRole(role);
    }

    return {
      message: 'Southin organisation departments and roles seeded successfully.',
      departments: departments.length,
      roles: roles.length,
    };
  }
}