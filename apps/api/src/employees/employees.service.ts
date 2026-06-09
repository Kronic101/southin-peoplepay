import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.employee.findMany({
      orderBy: [{ createdAt: 'desc' }],
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

  async create(input: any) {
    const employeeNumber =
      input.employeeNumber && String(input.employeeNumber).trim().length > 0
        ? String(input.employeeNumber).trim()
        : await this.generateEmployeeNumber();

    const existing = await this.prisma.employee.findUnique({
      where: { employeeNumber },
    });

    if (existing) {
      throw new BadRequestException('Employee number already exists');
    }

    const employee = await this.prisma.employee.create({
      data: {
        employeeNumber,
        firstName: this.cleanString(input.firstName) || 'New',
        middleName: this.cleanNullableString(input.middleName),
        lastName: this.cleanString(input.lastName) || 'Employee',
        gender: this.cleanNullableString(input.gender),
        dateOfBirth: this.parseOptionalDate(input.dateOfBirth),
        nrcNumber: this.cleanNullableString(input.nrcNumber),
        email: this.cleanNullableString(input.email),
        phone: this.cleanNullableString(input.phone),

        departmentId: this.cleanNullableString(input.departmentId),
        jobTitleId: this.cleanNullableString(input.jobTitleId),
        siteId: this.cleanNullableString(input.siteId),
        employmentTypeId: this.cleanNullableString(input.employmentTypeId),
        supervisorId: this.cleanNullableString(input.supervisorId),

        startDate: this.parseOptionalDate(input.startDate),
        endDate: this.parseOptionalDate(input.endDate),
        status: input.status || 'DRAFT',

        bankName: this.cleanNullableString(input.bankName),
        bankBranch: this.cleanNullableString(input.bankBranch),
        bankAccountNumber: this.cleanNullableString(input.bankAccountNumber),
        bankAccountName: this.cleanNullableString(input.bankAccountName),
        bankSortCode: this.cleanNullableString(input.bankSortCode),
        bankDetailsStatus: input.bankDetailsStatus || 'PENDING_VALIDATION',
      },
      include: this.employeeInclude(),
    });

    if (employee.bankName || employee.bankAccountNumber || employee.bankAccountName) {
      await this.createBankAuditLog({
        employeeId: employee.id,
        action: 'EMPLOYEE_CREATED_WITH_BANK_PLACEHOLDER',
        previousStatus: null,
        newStatus: employee.bankDetailsStatus || 'PENDING_VALIDATION',
        changedBy: input.createdBy || input.updatedBy || 'system',
        notes: 'Employee created with legacy/simple bank fields.',
        snapshot: {
          bankName: employee.bankName,
          bankBranch: employee.bankBranch,
          bankAccountName: employee.bankAccountName,
          bankDetailsStatus: employee.bankDetailsStatus,
        },
      });
    }

    return this.findOne(employee.id);
  }

  async update(id: string, input: any) {
    await this.ensureEmployeeExists(id);

    const before = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        bankAccounts: true,
      },
    });

    if (!before) {
      throw new NotFoundException('Employee not found');
    }

    const bankFieldsChanged =
      input.bankName !== undefined ||
      input.bankBranch !== undefined ||
      input.bankAccountNumber !== undefined ||
      input.bankAccountName !== undefined ||
      input.bankSortCode !== undefined ||
      input.bankDetailsStatus !== undefined;

    const employee = await this.prisma.employee.update({
      where: { id },
      data: {
        firstName: input.firstName !== undefined ? this.cleanString(input.firstName) : undefined,
        middleName:
          input.middleName !== undefined ? this.cleanNullableString(input.middleName) : undefined,
        lastName: input.lastName !== undefined ? this.cleanString(input.lastName) : undefined,
        gender: input.gender !== undefined ? this.cleanNullableString(input.gender) : undefined,
        dateOfBirth:
          input.dateOfBirth !== undefined ? this.parseOptionalDate(input.dateOfBirth) : undefined,
        nrcNumber:
          input.nrcNumber !== undefined ? this.cleanNullableString(input.nrcNumber) : undefined,
        email: input.email !== undefined ? this.cleanNullableString(input.email) : undefined,
        phone: input.phone !== undefined ? this.cleanNullableString(input.phone) : undefined,

        departmentId:
          input.departmentId !== undefined ? this.cleanNullableString(input.departmentId) : undefined,
        jobTitleId:
          input.jobTitleId !== undefined ? this.cleanNullableString(input.jobTitleId) : undefined,
        siteId: input.siteId !== undefined ? this.cleanNullableString(input.siteId) : undefined,
        employmentTypeId:
          input.employmentTypeId !== undefined
            ? this.cleanNullableString(input.employmentTypeId)
            : undefined,
        supervisorId:
          input.supervisorId !== undefined ? this.cleanNullableString(input.supervisorId) : undefined,

        startDate: input.startDate !== undefined ? this.parseOptionalDate(input.startDate) : undefined,
        endDate: input.endDate !== undefined ? this.parseOptionalDate(input.endDate) : undefined,
        status: input.status !== undefined ? input.status : undefined,

        bankName: input.bankName !== undefined ? this.cleanNullableString(input.bankName) : undefined,
        bankBranch:
          input.bankBranch !== undefined ? this.cleanNullableString(input.bankBranch) : undefined,
        bankAccountNumber:
          input.bankAccountNumber !== undefined
            ? this.cleanNullableString(input.bankAccountNumber)
            : undefined,
        bankAccountName:
          input.bankAccountName !== undefined
            ? this.cleanNullableString(input.bankAccountName)
            : undefined,
        bankSortCode:
          input.bankSortCode !== undefined ? this.cleanNullableString(input.bankSortCode) : undefined,
        bankDetailsStatus:
          input.bankDetailsStatus !== undefined ? input.bankDetailsStatus : undefined,
        bankDetailsReviewedBy:
          input.bankDetailsReviewedBy !== undefined
            ? this.cleanNullableString(input.bankDetailsReviewedBy)
            : undefined,
        bankDetailsReviewedAt:
          input.bankDetailsReviewedAt !== undefined
            ? this.parseOptionalDate(input.bankDetailsReviewedAt)
            : undefined,
        bankDetailsNotes:
          input.bankDetailsNotes !== undefined
            ? this.cleanNullableString(input.bankDetailsNotes)
            : undefined,
      },
      include: this.employeeInclude(),
    });

    if (bankFieldsChanged) {
      await this.createBankAuditLog({
        employeeId: id,
        action: 'BANK_FIELDS_UPDATED',
        previousStatus: before.bankDetailsStatus || null,
        newStatus: employee.bankDetailsStatus || null,
        changedBy: input.updatedBy || input.reviewedBy || 'system',
        notes: input.bankDetailsNotes || input.notes || 'Employee bank fields updated.',
        snapshot: {
          before: {
            bankName: before.bankName,
            bankBranch: before.bankBranch,
            bankAccountName: before.bankAccountName,
            bankDetailsStatus: before.bankDetailsStatus,
          },
          after: {
            bankName: employee.bankName,
            bankBranch: employee.bankBranch,
            bankAccountName: employee.bankAccountName,
            bankDetailsStatus: employee.bankDetailsStatus,
          },
        },
      });
    }

    return employee;
  }

  async createPortalAccount(id: string, input: any) {
    const employee = await this.ensureEmployeeExists(id);

    const existing = await this.prisma.employeePortalAccount.findUnique({
      where: { employeeId: id },
    });

    if (existing) {
      return {
        message: 'Employee portal account already exists.',
        temporaryPin: input?.returnTemporaryPin ? undefined : undefined,
        portalAccount: existing,
        employee: await this.findOne(id),
      };
    }

    const temporaryPin =
      input?.temporaryPin && /^\d{6}$/.test(String(input.temporaryPin))
        ? String(input.temporaryPin)
        : '123456';

    const portalAccount = await this.prisma.employeePortalAccount.create({
      data: {
        employeeId: id,
        employeeNumber: employee.employeeNumber,
        pinHash: this.hashPin(temporaryPin),
        mustChangePin: true,
        isActive: true,
      },
    });

    return {
      message: 'Employee portal account created.',
      temporaryPin,
      portalAccount,
      employee: await this.findOne(id),
    };
  }

  async createBankAccount(employeeId: string, input: any) {
    await this.ensureEmployeeExists(employeeId);

    const bankName = this.cleanString(input.bankName);
    const accountNumber = this.cleanString(input.accountNumber);
    const accountName = this.cleanString(input.accountName);

    if (!bankName || !accountNumber || !accountName) {
      throw new BadRequestException('Bank name, account number, and account name are required.');
    }

    const makePrimary = input.isPrimary === true || input.isPrimary === 'YES';

    const result = await this.prisma.$transaction(async (tx) => {
      if (makePrimary) {
        await tx.employeeBankAccount.updateMany({
          where: { employeeId },
          data: { isPrimary: false },
        });
      }

      const bankAccount = await tx.employeeBankAccount.create({
        data: {
          employeeId,
          bankName,
          branchName: this.cleanNullableString(input.branchName),
          accountNumber,
          accountName,
          isPrimary: makePrimary,
          approvalStatus: input.approvalStatus || 'PENDING',
          effectiveFrom: this.parseOptionalDate(input.effectiveFrom) || new Date(),
        },
      });

      await tx.employee.update({
        where: { id: employeeId },
        data: {
          bankDetailsStatus:
            bankAccount.approvalStatus === 'APPROVED' ? 'VALIDATED' : 'PENDING_VALIDATION',
          bankName: makePrimary ? bankAccount.bankName : undefined,
          bankBranch: makePrimary ? bankAccount.branchName : undefined,
          bankAccountNumber: makePrimary ? bankAccount.accountNumber : undefined,
          bankAccountName: makePrimary ? bankAccount.accountName : undefined,
        },
      });

      await tx.employeeBankAuditLog.create({
        data: {
          employeeId,
          bankAccountId: bankAccount.id,
          action: 'BANK_ACCOUNT_CREATED',
          previousStatus: null,
          newStatus: bankAccount.approvalStatus,
          changedBy: input.createdBy || input.reviewedBy || 'system',
          notes: input.notes || 'Employee bank account added.',
          snapshot: {
            bankName: bankAccount.bankName,
            branchName: bankAccount.branchName,
            accountName: bankAccount.accountName,
            accountNumberMasked: this.maskAccountNumber(bankAccount.accountNumber),
            isPrimary: bankAccount.isPrimary,
            approvalStatus: bankAccount.approvalStatus,
          },
        },
      });

      return bankAccount;
    });

    return {
      message: 'Employee bank account added.',
      bankAccount: result,
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

    const reviewedBy = input?.reviewedBy || input?.approvedBy || 'finance-manager-dev';
    const notes = input?.notes || 'Primary bank account approved and validated by Finance.';

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.employeeBankAccount.updateMany({
        where: { employeeId },
        data: { isPrimary: false },
      });

      const updatedBankAccount = await tx.employeeBankAccount.update({
        where: { id: bankAccountId },
        data: {
          approvalStatus: 'APPROVED',
          isPrimary: true,
        },
      });

      const updatedEmployee = await tx.employee.update({
        where: { id: employeeId },
        data: {
          bankName: updatedBankAccount.bankName,
          bankBranch: updatedBankAccount.branchName,
          bankAccountNumber: updatedBankAccount.accountNumber,
          bankAccountName: updatedBankAccount.accountName,
          bankDetailsStatus: 'VALIDATED',
          bankDetailsReviewedBy: reviewedBy,
          bankDetailsReviewedAt: new Date(),
          bankDetailsNotes: notes,
        },
      });

      await tx.employeeBankAuditLog.create({
        data: {
          employeeId,
          bankAccountId,
          action: 'BANK_ACCOUNT_APPROVED',
          previousStatus: bankAccount.approvalStatus,
          newStatus: 'APPROVED',
          changedBy: reviewedBy,
          notes,
          snapshot: {
            bankName: updatedBankAccount.bankName,
            branchName: updatedBankAccount.branchName,
            accountName: updatedBankAccount.accountName,
            accountNumberMasked: this.maskAccountNumber(updatedBankAccount.accountNumber),
            isPrimary: updatedBankAccount.isPrimary,
            employeeBankDetailsStatus: updatedEmployee.bankDetailsStatus,
          },
        },
      });

      return updatedBankAccount;
    });

    return {
      message: 'Employee bank account approved and set as primary.',
      bankAccount: result,
      employee: await this.findOne(employeeId),
    };
  }

  async validateBankDetails(id: string, input: any) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        bankAccounts: {
          orderBy: [
            { isPrimary: 'desc' },
            { updatedAt: 'desc' },
          ],
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const reviewedBy =
      this.cleanNullableString(input?.reviewedBy) ||
      this.cleanNullableString(input?.validatedBy) ||
      'finance-manager-dev';

    const notes =
      this.cleanNullableString(input?.notes) ||
      'Employee bank details validated by Finance.';

    const previousStatus = employee.bankDetailsStatus || 'PENDING_VALIDATION';

    const approvedAccount =
      employee.bankAccounts.find((account) => account.approvalStatus === 'APPROVED') ||
      employee.bankAccounts.find((account) => account.isPrimary) ||
      employee.bankAccounts[0] ||
      null;

    let selectedBankAccount = approvedAccount;

    const result = await this.prisma.$transaction(async (tx) => {
      if (selectedBankAccount) {
        const approved = await tx.employeeBankAccount.update({
          where: { id: selectedBankAccount.id },
          data: {
            approvalStatus: 'APPROVED',
            isPrimary: true,
          },
        });

        selectedBankAccount = approved;

        await tx.employeeBankAccount.updateMany({
          where: {
            employeeId: id,
            id: {
              not: approved.id,
            },
          },
          data: {
            isPrimary: false,
          },
        });

        await tx.employee.update({
          where: { id },
          data: {
            bankName: approved.bankName,
            bankBranch: approved.branchName,
            bankAccountNumber: approved.accountNumber,
            bankAccountName: approved.accountName,
            bankDetailsStatus: 'VALIDATED',
            bankDetailsReviewedBy: reviewedBy,
            bankDetailsReviewedAt: new Date(),
            bankDetailsNotes: notes,
          },
        });
      } else {
        await tx.employee.update({
          where: { id },
          data: {
            bankDetailsStatus: 'VALIDATED',
            bankDetailsReviewedBy: reviewedBy,
            bankDetailsReviewedAt: new Date(),
            bankDetailsNotes: notes,
          },
        });
      }

      return tx.employeeBankAuditLog.create({
        data: {
          employeeId: id,
          bankAccountId: selectedBankAccount?.id || null,
          action: 'BANK_DETAILS_VALIDATED',
          previousStatus,
          newStatus: 'VALIDATED',
          changedBy: reviewedBy,
          notes,
          snapshot: {
            employeeId: id,
            employeeNumber: employee.employeeNumber,
            employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
            bankName: selectedBankAccount?.bankName || employee.bankName || null,
            branchName: selectedBankAccount?.branchName || employee.bankBranch || null,
            accountName: selectedBankAccount?.accountName || employee.bankAccountName || null,
            accountNumberMasked: this.maskAccountNumber(
              selectedBankAccount?.accountNumber || employee.bankAccountNumber,
            ),
          },
        },
      });
    });

    return {
      message: 'Employee bank details validated.',
      auditLog: result,
      employee: await this.findOne(id),
    };
  }

    async getPayrollReadiness() {
    const employees = await this.prisma.employee.findMany({
      orderBy: [{ employeeNumber: 'asc' }],
      include: {
        department: true,
        jobTitle: true,
        site: true,
        employmentType: true,
        statutoryDetails: true,
        portalAccount: true,
        contracts: true,
        serviceConditions: true,
        bankAccounts: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
        },
      },
    });

    const rows = employees.map((employee) => {
      const hasCoreProfile = Boolean(
        employee.departmentId &&
          employee.jobTitleId &&
          employee.siteId &&
          employee.employmentTypeId,
      );

      const hasStatutoryDetails = Boolean(employee.statutoryDetails);
      const hasPortalAccount = Boolean(employee.portalAccount?.isActive);

      const hasBankAccount = employee.bankAccounts.length > 0;
      const hasApprovedBankAccount =
        employee.bankDetailsStatus === 'VALIDATED' ||
        employee.bankAccounts.some((account) => account.approvalStatus === 'APPROVED');

      const hasContract = employee.contracts.length > 0;
      const hasConditionOfService = employee.serviceConditions.length > 0;
      const hasApprovedConditionOfService = employee.serviceConditions.some(
        (condition) => condition.status === 'APPROVED',
      );

      const checks = {
        hasCoreProfile,
        hasStatutoryDetails,
        hasPortalAccount,
        hasBankAccount,
        hasApprovedBankAccount,
        hasContract,
        hasConditionOfService,
        hasApprovedConditionOfService,
      };

      const missingItems = Object.entries(checks)
        .filter(([, passed]) => !passed)
        .map(([key]) => key);

      const requiredCheckCount = Object.keys(checks).length;
      const passedCheckCount = Object.values(checks).filter(Boolean).length;

      const payrollReady = missingItems.length === 0;

      return {
        employeeId: employee.id,
        employeeNumber: employee.employeeNumber,
        name: `${employee.firstName} ${employee.lastName}`.trim(),
        department: employee.department?.name || '-',
        jobTitle: employee.jobTitle?.name || '-',
        site: employee.site?.name || '-',
        employmentType: employee.employmentType?.name || '-',
        status: employee.status,
        bankDetailsStatus: employee.bankDetailsStatus || 'PENDING_VALIDATION',
        checks,
        missingItems,
        passedCheckCount,
        requiredCheckCount,
        readinessPercentage: Math.round((passedCheckCount / requiredCheckCount) * 100),
        payrollReady,
      };
    });

    const totalEmployees = rows.length;
    const payrollReadyEmployees = rows.filter((row) => row.payrollReady).length;
    const notReadyEmployees = totalEmployees - payrollReadyEmployees;

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        totalEmployees,
        payrollReadyEmployees,
        notReadyEmployees,
        readinessPercentage:
          totalEmployees === 0 ? 0 : Math.round((payrollReadyEmployees / totalEmployees) * 100),
      },
      totalEmployees,
      payrollReadyEmployees,
      employees: rows,
      rows,
    };
  }

  private async ensureEmployeeExists(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  private async syncEmployeePrimaryBankFields(employeeId: string) {
    const primaryBank = await this.prisma.employeeBankAccount.findFirst({
      where: { employeeId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });

    if (!primaryBank) {
      await this.prisma.employee.update({
        where: { id: employeeId },
        data: {
          bankName: null,
          bankBranch: null,
          bankAccountNumber: null,
          bankAccountName: null,
          bankDetailsStatus: 'PENDING_VALIDATION',
        },
      });

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
    return createHash('sha256').update(String(pin)).digest('hex');
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
      bankAuditLogs: {
        orderBy: { createdAt: 'desc' as const },
        take: 10,
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

  private maskAccountNumber(accountNumber?: string | null) {
    if (!accountNumber) {
      return '';
    }

    const value = String(accountNumber).trim();

    if (!value) {
      return '';
    }

    if (value.length <= 4) {
      return '****';
    }

    return `${'*'.repeat(Math.max(value.length - 4, 4))}${value.slice(-4)}`;
  }

  private async createBankAuditLog(input: {
    employeeId: string;
    bankAccountId?: string | null;
    action: string;
    previousStatus?: string | null;
    newStatus?: string | null;
    changedBy?: string | null;
    notes?: string | null;
    snapshot?: any;
  }) {
    return this.prisma.employeeBankAuditLog.create({
      data: {
        employeeId: input.employeeId,
        bankAccountId: input.bankAccountId || null,
        action: input.action,
        previousStatus: input.previousStatus || null,
        newStatus: input.newStatus || null,
        changedBy: input.changedBy || 'system',
        notes: input.notes || null,
        snapshot: input.snapshot || undefined,
      },
    });
  }

  async getEmployeeBankAuditHistory(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        department: true,
        jobTitle: true,
        site: true,
        employmentType: true,
        bankAccounts: {
          orderBy: [
            { isPrimary: 'desc' },
            { updatedAt: 'desc' },
          ],
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const logs = await this.prisma.employeeBankAuditLog.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
      include: {
        bankAccount: true,
      },
    });

    return {
      generatedAt: new Date().toISOString(),
      employee: {
        id: employee.id,
        employeeNumber: employee.employeeNumber,
        firstName: employee.firstName,
        middleName: employee.middleName,
        lastName: employee.lastName,
        name: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
        department: employee.department?.name || null,
        jobTitle: employee.jobTitle?.name || null,
        site: employee.site?.name || null,
        employmentType: employee.employmentType?.name || null,
        bankDetailsStatus: employee.bankDetailsStatus || 'PENDING_VALIDATION',
        bankName: employee.bankName || null,
        bankBranch: employee.bankBranch || null,
        bankAccountName: employee.bankAccountName || null,
        bankAccountNumberMasked: this.maskAccountNumber(employee.bankAccountNumber),
        bankDetailsReviewedBy: employee.bankDetailsReviewedBy || null,
        bankDetailsReviewedAt: employee.bankDetailsReviewedAt || null,
        bankDetailsNotes: employee.bankDetailsNotes || null,
      },
      bankAccounts: (employee.bankAccounts || []).map((account) => ({
        id: account.id,
        bankName: account.bankName,
        branchName: account.branchName,
        accountName: account.accountName,
        accountNumberMasked: this.maskAccountNumber(account.accountNumber),
        isPrimary: account.isPrimary,
        approvalStatus: account.approvalStatus,
        effectiveFrom: account.effectiveFrom,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      })),
      totalReturned: logs.length,
      logs: logs.map((log) => ({
        id: log.id,
        employeeId: log.employeeId,
        bankAccountId: log.bankAccountId,
        action: log.action,
        previousStatus: log.previousStatus,
        newStatus: log.newStatus,
        changedBy: log.changedBy,
        notes: log.notes,
        snapshot: log.snapshot,
        createdAt: log.createdAt,
        bankAccount: log.bankAccount
          ? {
              id: log.bankAccount.id,
              bankName: log.bankAccount.bankName,
              branchName: log.bankAccount.branchName,
              accountName: log.bankAccount.accountName,
              accountNumberMasked: this.maskAccountNumber(log.bankAccount.accountNumber),
              isPrimary: log.bankAccount.isPrimary,
              approvalStatus: log.bankAccount.approvalStatus,
            }
          : null,
      })),
    };
  }

  private cleanString(value: any) {
    if (value === undefined || value === null) return '';
    return String(value).trim();
  }

  private cleanNullableString(value: any) {
    if (value === undefined || value === null) return null;

    const cleaned = String(value).trim();
    return cleaned.length > 0 ? cleaned : null;
  }

  private parseOptionalDate(value: any) {
    if (!value) return null;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date;
  }

}