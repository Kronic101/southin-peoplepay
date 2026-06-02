import { Injectable, NotFoundException } from '@nestjs/common';
import { randomInt, createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

type CreateEmployeeInput = {
  employeeNumber?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender?: string;
  dateOfBirth?: string;
  nrcNumber?: string;
  email?: string;
  phone?: string;
  departmentId?: string;
  jobTitleId?: string;
  siteId?: string;
  employmentTypeId?: string;
  startDate?: string;
};

type UpdateEmployeeInput = Partial<CreateEmployeeInput> & {
  status?: 'DRAFT' | 'ACTIVE' | 'ON_PROBATION' | 'SUSPENDED' | 'ON_LEAVE' | 'CONTRACT_EXPIRING' | 'TERMINATED' | 'ARCHIVED';
};

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.employee.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        department: true,
        jobTitle: true,
        site: true,
        employmentType: true,
        portalAccount: {
          select: {
            id: true,
            isActive: true,
            mustChangePin: true,
            lastLoginAt: true,
          },
        },
        statutoryDetails: true,
      },
    });
  }

  async create(input: CreateEmployeeInput) {
    const employeeNumber = input.employeeNumber || (await this.generateEmployeeNumber());

    return this.prisma.employee.create({
      data: {
        employeeNumber,
        firstName: input.firstName,
        middleName: input.middleName || null,
        lastName: input.lastName,
        gender: input.gender || null,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
        nrcNumber: input.nrcNumber || null,
        email: input.email || null,
        phone: input.phone || null,
        departmentId: input.departmentId || null,
        jobTitleId: input.jobTitleId || null,
        siteId: input.siteId || null,
        employmentTypeId: input.employmentTypeId || null,
        startDate: input.startDate ? new Date(input.startDate) : null,
        status: 'DRAFT',
        statutoryDetails: {
          create: {
            payeApplicable: true,
            napsaApplicable: true,
            nhimaApplicable: true,
          },
        },
      },
      include: {
        department: true,
        jobTitle: true,
        site: true,
        employmentType: true,
        statutoryDetails: true,
      },
    });
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        jobTitle: true,
        site: true,
        employmentType: true,
        supervisor: true,
        portalAccount: {
          select: {
            id: true,
            employeeNumber: true,
            mustChangePin: true,
            isActive: true,
            lastLoginAt: true,
            failedAttempts: true,
            lockedUntil: true,
            createdAt: true,
          },
        },
        statutoryDetails: true,
        bankAccounts: true,
        serviceConditions: {
          include: {
            template: true,
          },
        },
        contracts: {
          include: {
            contractType: true,
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  async update(id: string, input: UpdateEmployeeInput) {
    await this.ensureEmployeeExists(id);

    return this.prisma.employee.update({
      where: { id },
      data: {
        firstName: input.firstName,
        middleName: input.middleName,
        lastName: input.lastName,
        gender: input.gender,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
        nrcNumber: input.nrcNumber,
        email: input.email,
        phone: input.phone,
        departmentId: input.departmentId,
        jobTitleId: input.jobTitleId,
        siteId: input.siteId,
        employmentTypeId: input.employmentTypeId,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        status: input.status,
      },
      include: {
        department: true,
        jobTitle: true,
        site: true,
        employmentType: true,
        statutoryDetails: true,
      },
    });
  }

  async createPortalAccount(id: string) {
    const employee = await this.ensureEmployeeExists(id);

    if (employee.portalAccount) {
      return {
        message: 'Portal account already exists',
        employeeNumber: employee.employeeNumber,
        temporaryPin: null,
        account: {
          id: employee.portalAccount.id,
          isActive: employee.portalAccount.isActive,
          mustChangePin: employee.portalAccount.mustChangePin,
        },
      };
    }

    const temporaryPin = this.generateTemporaryPin();
    const pinHash = this.hashPin(temporaryPin);

    const account = await this.prisma.employeePortalAccount.create({
      data: {
        employeeId: employee.id,
        employeeNumber: employee.employeeNumber,
        pinHash,
        mustChangePin: true,
        isActive: true,
      },
      select: {
        id: true,
        employeeNumber: true,
        mustChangePin: true,
        isActive: true,
        createdAt: true,
      },
    });

    return {
      message: 'Portal account created. Give the temporary PIN to the employee securely.',
      employeeNumber: employee.employeeNumber,
      temporaryPin,
      account,
    };
  }

  private async ensureEmployeeExists(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        portalAccount: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  private async generateEmployeeNumber() {
    const count = await this.prisma.employee.count();
    return `STH-${String(count + 1).padStart(6, '0')}`;
  }

  private generateTemporaryPin() {
    return String(randomInt(100000, 999999));
  }

  private hashPin(pin: string) {
    const salt = process.env.EMPLOYEE_PIN_SALT || 'southin-peoplepay-dev-salt';
    return createHash('sha256').update(`${pin}:${salt}`).digest('hex');
  }
}