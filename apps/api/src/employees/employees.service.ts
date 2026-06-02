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

    async getSetupLookups() {
    const [departments, jobTitles, sites, employmentTypes, contractTypes, serviceConditionTemplates] =
      await Promise.all([
        this.prisma.department.findMany({ orderBy: { name: 'asc' } }),
        this.prisma.jobTitle.findMany({ orderBy: { name: 'asc' } }),
        this.prisma.site.findMany({ orderBy: { name: 'asc' } }),
        this.prisma.employmentType.findMany({ orderBy: { name: 'asc' } }),
        this.prisma.contractType.findMany({ orderBy: { name: 'asc' } }),
        this.prisma.serviceConditionTemplate.findMany({
          where: { isActive: true },
          orderBy: { name: 'asc' },
        }),
      ]);

    return {
      departments,
      jobTitles,
      sites,
      employmentTypes,
      contractTypes,
      serviceConditionTemplates,
    };
  }

  async updateStatutoryDetails(
    id: string,
    input: {
      tpin?: string;
      napsaNumber?: string;
      nhimaNumber?: string;
      payeApplicable?: boolean;
      napsaApplicable?: boolean;
      nhimaApplicable?: boolean;
    },
  ) {
    await this.ensureEmployeeExists(id);

    return this.prisma.employeeStatutoryDetails.upsert({
      where: { employeeId: id },
      create: {
        employeeId: id,
        tpin: input.tpin || null,
        napsaNumber: input.napsaNumber || null,
        nhimaNumber: input.nhimaNumber || null,
        payeApplicable: input.payeApplicable ?? true,
        napsaApplicable: input.napsaApplicable ?? true,
        nhimaApplicable: input.nhimaApplicable ?? true,
      },
      update: {
        tpin: input.tpin || null,
        napsaNumber: input.napsaNumber || null,
        nhimaNumber: input.nhimaNumber || null,
        payeApplicable: input.payeApplicable ?? true,
        napsaApplicable: input.napsaApplicable ?? true,
        nhimaApplicable: input.nhimaApplicable ?? true,
      },
    });
  }

  async createBankAccount(
    id: string,
    input: {
      bankName: string;
      branchName?: string;
      accountNumber: string;
      accountName: string;
      isPrimary?: boolean;
      effectiveFrom?: string;
    },
  ) {
    await this.ensureEmployeeExists(id);

    if (input.isPrimary) {
      await this.prisma.employeeBankAccount.updateMany({
        where: { employeeId: id },
        data: { isPrimary: false },
      });
    }

    return this.prisma.employeeBankAccount.create({
      data: {
        employeeId: id,
        bankName: input.bankName,
        branchName: input.branchName || null,
        accountNumber: input.accountNumber,
        accountName: input.accountName,
        isPrimary: input.isPrimary ?? true,
        approvalStatus: 'PENDING',
        effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : new Date(),
      },
    });
  }

    async createContract(
    id: string,
    input: {
      contractTypeId: string;
      contractNumber?: string;
      startDate: string;
      endDate?: string;
      probationEndDate?: string;
      noticePeriod?: string;
      status?: string;
    },
  ) {
    await this.ensureEmployeeExists(id);

    const generatedContractNumber =
      input.contractNumber && input.contractNumber.trim().length > 0
        ? input.contractNumber.trim()
        : await this.generateContractNumber();

    return this.prisma.employeeContract.create({
      data: {
        employeeId: id,
        contractTypeId: input.contractTypeId,
        contractNumber: generatedContractNumber,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : null,
        probationEnd: input.probationEndDate ? new Date(input.probationEndDate) : null,
        noticePeriod: String(input.noticePeriod || '30 days'),
        status: input.status || 'DRAFT',
      },
      include: {
        contractType: true,
      },
    });
  }

  async assignServiceCondition(
    id: string,
    input: {
      templateId: string;
      effectiveFrom: string;
      effectiveTo?: string;
    },
  ) {
    await this.ensureEmployeeExists(id);

    await this.prisma.employeeServiceCondition.updateMany({
      where: {
        employeeId: id,
        status: 'APPROVED',
        effectiveTo: null,
      },
      data: {
        effectiveTo: new Date(input.effectiveFrom),
      },
    });

    return this.prisma.employeeServiceCondition.create({
      data: {
        employeeId: id,
        templateId: input.templateId,
        effectiveFrom: new Date(input.effectiveFrom),
        effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
        status: 'PENDING',
      },
      include: {
        template: true,
      },
    });
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

    private async generateContractNumber() {
    const year = new Date().getFullYear();

    const count = await this.prisma.employeeContract.count({
      where: {
        contractNumber: {
          startsWith: `CNT-${year}-`,
        },
      },
    });

    return `CNT-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  private generateTemporaryPin() {
    return String(randomInt(100000, 999999));
  }

  private hashPin(pin: string) {
    const salt = process.env.EMPLOYEE_PIN_SALT || 'southin-peoplepay-dev-salt';
    return createHash('sha256').update(`${pin}:${salt}`).digest('hex');
  }
}