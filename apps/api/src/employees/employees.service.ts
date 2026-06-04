import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
  supervisorId?: string;
  startDate?: string;
  endDate?: string;

  bankName?: string;
  bankBranch?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  bankSortCode?: string;
  bankDetailsStatus?: string;
  bankDetailsReviewedBy?: string;
  bankDetailsReviewedAt?: string;
  bankDetailsNotes?: string;
};

type UpdateEmployeeInput = Partial<CreateEmployeeInput> & {
  status?:
    | 'DRAFT'
    | 'ACTIVE'
    | 'ON_PROBATION'
    | 'SUSPENDED'
    | 'ON_LEAVE'
    | 'CONTRACT_EXPIRING'
    | 'TERMINATED'
    | 'ARCHIVED';
};

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.employee.findMany({
      orderBy: { createdAt: 'desc' },
      include: this.employeeInclude(),
    });
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: this.employeeInclude(),
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
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
        supervisorId: input.supervisorId || null,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        status: 'DRAFT',

        bankName: input.bankName || null,
        bankBranch: input.bankBranch || null,
        bankAccountNumber: input.bankAccountNumber || null,
        bankAccountName: input.bankAccountName || null,
        bankSortCode: input.bankSortCode || null,
        bankDetailsStatus: input.bankDetailsStatus || 'PENDING_VALIDATION',
        bankDetailsReviewedBy: input.bankDetailsReviewedBy || null,
        bankDetailsReviewedAt: input.bankDetailsReviewedAt
          ? new Date(input.bankDetailsReviewedAt)
          : null,
        bankDetailsNotes: input.bankDetailsNotes || null,

        statutoryDetails: {
          create: {
            payeApplicable: true,
            napsaApplicable: true,
            nhimaApplicable: true,
          },
        },
      },
      include: this.employeeInclude(),
    });
  }

  async update(id: string, input: UpdateEmployeeInput) {
    const existing = await this.prisma.employee.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Employee not found');
    }

    return this.prisma.employee.update({
      where: { id },
      data: {
        employeeNumber: input.employeeNumber ?? undefined,
        firstName: input.firstName ?? undefined,
        middleName: input.middleName ?? undefined,
        lastName: input.lastName ?? undefined,
        gender: input.gender ?? undefined,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
        nrcNumber: input.nrcNumber ?? undefined,
        email: input.email ?? undefined,
        phone: input.phone ?? undefined,
        departmentId: input.departmentId ?? undefined,
        jobTitleId: input.jobTitleId ?? undefined,
        siteId: input.siteId ?? undefined,
        employmentTypeId: input.employmentTypeId ?? undefined,
        supervisorId: input.supervisorId ?? undefined,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        status: input.status ?? undefined,

        bankName: input.bankName ?? undefined,
        bankBranch: input.bankBranch ?? undefined,
        bankAccountNumber: input.bankAccountNumber ?? undefined,
        bankAccountName: input.bankAccountName ?? undefined,
        bankSortCode: input.bankSortCode ?? undefined,
        bankDetailsStatus: input.bankDetailsStatus ?? undefined,
        bankDetailsReviewedBy: input.bankDetailsReviewedBy ?? undefined,
        bankDetailsReviewedAt: input.bankDetailsReviewedAt
          ? new Date(input.bankDetailsReviewedAt)
          : undefined,
        bankDetailsNotes: input.bankDetailsNotes ?? undefined,
      },
      include: this.employeeInclude(),
    });
  }

  async createBankAccount(employeeId: string, input: any) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        bankAccounts: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (!input?.bankName || !input?.accountNumber || !input?.accountName) {
      throw new BadRequestException('Bank name, account number, and account name are required.');
    }

    const makePrimary = Boolean(input?.isPrimary) || employee.bankAccounts.length === 0;

    if (makePrimary) {
      await this.prisma.employeeBankAccount.updateMany({
        where: { employeeId },
        data: { isPrimary: false },
      });
    }

    const bankAccount = await this.prisma.employeeBankAccount.create({
      data: {
        employeeId,
        bankName: input.bankName,
        branchName: input.branchName || null,
        accountNumber: input.accountNumber,
        accountName: input.accountName,
        isPrimary: makePrimary,
        approvalStatus: input.approvalStatus || 'PENDING',
        effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : new Date(),
      },
    });

    if (makePrimary) {
      await this.syncEmployeePrimaryBankFields(employeeId);
    }

    return {
      message: 'Employee bank account added.',
      bankAccount,
      employee: await this.findOne(employeeId),
    };
  }

  async approveBankAccount(employeeId: string, bankAccountId: string, input: any) {
    const bankAccount = await this.prisma.employeeBankAccount.findFirst({
      where: {
        id: bankAccountId,
        employeeId,
      },
    });

    if (!bankAccount) {
      throw new NotFoundException('Employee bank account not found');
    }

    await this.prisma.employeeBankAccount.updateMany({
      where: { employeeId },
      data: { isPrimary: false },
    });

    const updatedBankAccount = await this.prisma.employeeBankAccount.update({
      where: { id: bankAccountId },
      data: {
        approvalStatus: 'APPROVED',
        isPrimary: true,
      },
    });

    await this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        bankName: updatedBankAccount.bankName,
        bankBranch: updatedBankAccount.branchName,
        bankAccountNumber: updatedBankAccount.accountNumber,
        bankAccountName: updatedBankAccount.accountName,
        bankDetailsStatus: 'VALIDATED',
        bankDetailsReviewedBy: input?.reviewedBy || 'finance-manager-dev',
        bankDetailsReviewedAt: new Date(),
        bankDetailsNotes:
          input?.notes || 'Primary bank account approved and validated by Finance.',
      },
    });

    return {
      message: 'Employee bank account approved and set as primary.',
      bankAccount: updatedBankAccount,
      employee: await this.findOne(employeeId),
    };
  }

  async validateBankDetails(id: string, input: any) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        bankAccounts: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const primaryBank =
      employee.bankAccounts.find((account) => account.isPrimary) || employee.bankAccounts[0];

    if (!primaryBank && (!employee.bankName || !employee.bankAccountNumber || !employee.bankAccountName)) {
      throw new BadRequestException(
        'Bank name, account number, and account name are required before validation.',
      );
    }

    if (primaryBank) {
      await this.prisma.employeeBankAccount.updateMany({
        where: { employeeId: id },
        data: { isPrimary: false },
      });

      await this.prisma.employeeBankAccount.update({
        where: { id: primaryBank.id },
        data: {
          isPrimary: true,
          approvalStatus: 'APPROVED',
        },
      });
    }

    await this.prisma.employee.update({
      where: { id },
      data: {
        bankName: primaryBank?.bankName || employee.bankName,
        bankBranch: primaryBank?.branchName || employee.bankBranch,
        bankAccountNumber: primaryBank?.accountNumber || employee.bankAccountNumber,
        bankAccountName: primaryBank?.accountName || employee.bankAccountName,
        bankDetailsStatus: 'VALIDATED',
        bankDetailsReviewedBy: input?.reviewedBy || 'finance-manager-dev',
        bankDetailsReviewedAt: new Date(),
        bankDetailsNotes:
          input?.notes || 'Employee bank details validated by Finance before payment processing.',
      },
    });

    return {
      message: 'Employee bank details validated.',
      employee: await this.findOne(id),
    };
  }

  async createPortalAccount(id: string, input: any) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        portalAccount: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (employee.portalAccount) {
      return {
        message: 'Employee already has a portal account.',
        temporaryPin: input?.devReturnPin ? null : undefined,
        employee,
      };
    }

    const temporaryPin = String(input?.temporaryPin || randomInt(100000, 999999));
    const pinHash = this.hashPin(temporaryPin);

    const portalAccount = await this.prisma.employeePortalAccount.create({
      data: {
        employeeId: employee.id,
        employeeNumber: employee.employeeNumber,
        pinHash,
        mustChangePin: true,
        isActive: true,
      },
    });

    return {
      message: 'Employee portal account created.',
      temporaryPin: input?.devReturnPin ? temporaryPin : undefined,
      portalAccount,
      employee: await this.findOne(id),
    };
  }

  async getPayrollReadiness() {
    const employees = await this.prisma.employee.findMany({
      orderBy: { employeeNumber: 'asc' },
      include: this.employeeInclude(),
    });

    const readiness = employees.map((employee) => {
      const hasCoreProfile = Boolean(
        employee.firstName &&
          employee.lastName &&
          employee.departmentId &&
          employee.jobTitleId &&
          employee.siteId &&
          employee.employmentTypeId,
      );

      const hasStatutoryDetails = Boolean(employee.statutoryDetails);
      const hasPortalAccount = Boolean(employee.portalAccount);
      const hasApprovedBankAccount =
        employee.bankDetailsStatus === 'VALIDATED' ||
        employee.bankAccounts.some((account) => account.approvalStatus === 'APPROVED');

      const payrollReady =
        hasCoreProfile && hasStatutoryDetails && hasPortalAccount && hasApprovedBankAccount;

      return {
        employeeId: employee.id,
        employeeNumber: employee.employeeNumber,
        name: `${employee.firstName} ${employee.lastName}`.trim(),
        department: employee.department?.name || '-',
        jobTitle: employee.jobTitle?.name || '-',
        site: employee.site?.name || '-',
        employmentType: employee.employmentType?.name || '-',
        status: employee.status,
        checks: {
          hasCoreProfile,
          hasStatutoryDetails,
          hasPortalAccount,
          hasApprovedBankAccount,
        },
        payrollReady,
      };
    });

    return {
      generatedAt: new Date().toISOString(),
      totalEmployees: readiness.length,
      payrollReadyEmployees: readiness.filter((item) => item.payrollReady).length,
      employees: readiness,
    };
  }

  private async syncEmployeePrimaryBankFields(employeeId: string) {
    const primaryBank = await this.prisma.employeeBankAccount.findFirst({
      where: { employeeId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });

    if (!primaryBank) {
      return;
    }

    await this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        bankName: primaryBank.bankName,
        bankBranch: primaryBank.branchName,
        bankAccountNumber: primaryBank.accountNumber,
        bankAccountName: primaryBank.accountName,
        bankDetailsStatus:
          primaryBank.approvalStatus === 'APPROVED' ? 'VALIDATED' : 'PENDING_VALIDATION',
      },
    });
  }

  private async generateEmployeeNumber() {
    const count = await this.prisma.employee.count();
    return `STH-${String(count + 1).padStart(6, '0')}`;
  }

  private hashPin(pin: string) {
    return createHash('sha256').update(pin).digest('hex');
  }

  private employeeInclude() {
    return {
      department: true,
      jobTitle: true,
      site: true,
      employmentType: true,
      supervisor: true,
      directReports: true,
      statutoryDetails: true,
      bankAccounts: {
        orderBy: [{ isPrimary: 'desc' as const }, { createdAt: 'desc' as const }],
      },
      portalAccount: {
        select: {
          id: true,
          isActive: true,
          mustChangePin: true,
          lastLoginAt: true,
          failedAttempts: true,
          lockedUntil: true,
        },
      },
      contracts: true,
      serviceConditions: true,
    };
  }
}