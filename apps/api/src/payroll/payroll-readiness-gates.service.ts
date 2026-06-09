import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type GateStatus = 'READY' | 'BLOCKED';

@Injectable()
export class PayrollReadinessGatesService {
  constructor(private readonly prisma: PrismaService) {}

  async getPayrollReadinessGates() {
    const employees = await this.getEmployeesWithGateData();
    const rows = this.mapEmployeesToGateRows(employees);

    const totalEmployees = rows.length;
    const hrReady = rows.filter((row) => row.hrStatus === 'READY').length;
    const financeReady = rows.filter((row) => row.financeStatus === 'READY').length;
    const payrollReady = rows.filter((row) => row.payrollReady).length;
    const blocked = totalEmployees - payrollReady;

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        totalEmployees,
        hrReady,
        financeReady,
        payrollReady,
        blocked,
      },
      gates: {
        hr: [
          'Employee status must be ACTIVE or ON_PROBATION.',
          'Department must be assigned.',
          'Job title must be assigned.',
          'Site must be assigned.',
          'Employment type must be assigned.',
          'Start date must be captured.',
          'Employee must have a contract record.',
          'Employee contract must be ACTIVE, APPROVED, or SIGNED.',
          'Employee must have approved conditions of service.',
        ],
        finance: [
          'Statutory details must exist.',
          'Primary bank account must exist.',
          'Primary bank account must be approved.',
          'Bank account name must exist.',
          'Bank account number must exist.',
          'Bank details must be validated by Finance.',
        ],
      },
      employees: rows,
    };
  }

  async getPayrollReadyEmployees() {
    const readiness = await this.getPayrollReadinessGates();
    const employees = readiness.employees.filter((employee) => employee.payrollReady);

    return {
      generatedAt: readiness.generatedAt,
      totalReturned: employees.length,
      employees,
    };
  }

  async evaluatePayrollRunCreationReadiness() {
    const readiness = await this.getPayrollReadinessGates();

    const readyEmployees = readiness.employees.filter((employee) => employee.payrollReady);
    const blockedEmployees = readiness.employees.filter((employee) => !employee.payrollReady);

    return {
      generatedAt: new Date().toISOString(),
      canCreatePayrollRun: readyEmployees.length > 0,
      hasBlockedEmployees: blockedEmployees.length > 0,
      readyCount: readyEmployees.length,
      blockedCount: blockedEmployees.length,
      summary: readiness.summary,
      readyEmployees,
      blockedEmployees,
      message:
        readyEmployees.length === 0
          ? 'Payroll run cannot be created because no employee has passed all HR and Finance readiness gates.'
          : blockedEmployees.length > 0
            ? 'Payroll run can be created for ready employees only. Some employees are blocked by HR/Finance readiness gates.'
            : 'All employees are payroll-ready.',
    };
  }

  async getReadyEmployeeIds() {
    const evaluation = await this.evaluatePayrollRunCreationReadiness();

    return evaluation.readyEmployees.map((employee) => employee.employeeId);
  }

  private async getEmployeesWithGateData() {
    return this.prisma.employee.findMany({
      orderBy: [{ employeeNumber: 'asc' }],
      include: {
        department: true,
        jobTitle: true,
        site: true,
        employmentType: true,
        statutoryDetails: true,
        contracts: {
          orderBy: [{ createdAt: 'desc' }],
        },
        serviceConditions: {
          orderBy: [{ createdAt: 'desc' }],
          include: {
            template: true,
          },
        },
        bankAccounts: {
          orderBy: [{ isPrimary: 'desc' }, { updatedAt: 'desc' }],
        },
      },
    });
  }

  private mapEmployeesToGateRows(employees: any[]) {
    return employees.map((employee) => {
      const employeeStatus = String(employee.status || '').toUpperCase();

      const activeEmployee = ['ACTIVE', 'ON_PROBATION'].includes(employeeStatus);

      const hasDepartment = Boolean(employee.departmentId);
      const hasJobTitle = Boolean(employee.jobTitleId);
      const hasSite = Boolean(employee.siteId);
      const hasEmploymentType = Boolean(employee.employmentTypeId);
      const hasStartDate = Boolean(employee.startDate);

      const hasContract = Array.isArray(employee.contracts) && employee.contracts.length > 0;

      const hasApprovedContract = (employee.contracts || []).some((contract: any) =>
        ['ACTIVE', 'APPROVED', 'SIGNED'].includes(String(contract.status || '').toUpperCase()),
      );

      const hasApprovedConditionsOfService = (employee.serviceConditions || []).some(
        (condition: any) => String(condition.status || '').toUpperCase() === 'APPROVED',
      );

      const primaryBank =
        (employee.bankAccounts || []).find((account: any) => account.isPrimary) || null;

      const hasStatutoryDetails = Boolean(employee.statutoryDetails);
      const hasPrimaryBankAccount = Boolean(primaryBank);

      const hasApprovedBankAccount =
        Boolean(primaryBank) &&
        String(primaryBank?.approvalStatus || '').toUpperCase() === 'APPROVED';

      const hasBankAccountName = Boolean(
        this.cleanValue(primaryBank?.accountName) || this.cleanValue(employee.bankAccountName),
      );

      const hasBankAccountNumber = Boolean(
        this.cleanValue(primaryBank?.accountNumber) || this.cleanValue(employee.bankAccountNumber),
      );

      const bankDetailsValidated =
        String(employee.bankDetailsStatus || '').toUpperCase() === 'VALIDATED';

      const hrChecks = {
        activeEmployee,
        hasDepartment,
        hasJobTitle,
        hasSite,
        hasEmploymentType,
        hasStartDate,
        hasContract,
        hasApprovedContract,
        hasApprovedConditionsOfService,
      };

      const financeChecks = {
        hasStatutoryDetails,
        hasPrimaryBankAccount,
        hasApprovedBankAccount,
        hasBankAccountName,
        hasBankAccountNumber,
        bankDetailsValidated,
      };

      const hrMissing = this.getMissingChecks(hrChecks);
      const financeMissing = this.getMissingChecks(financeChecks);

      const hrStatus: GateStatus = hrMissing.length === 0 ? 'READY' : 'BLOCKED';
      const financeStatus: GateStatus = financeMissing.length === 0 ? 'READY' : 'BLOCKED';

      const payrollReady = hrStatus === 'READY' && financeStatus === 'READY';

      const missingItems = [...hrMissing, ...financeMissing];

      return {
        employeeId: employee.id,
        id: employee.id,
        employeeNumber: employee.employeeNumber,
        name: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
        firstName: employee.firstName,
        lastName: employee.lastName,
        department: employee.department?.name || '-',
        jobTitle: employee.jobTitle?.name || '-',
        site: employee.site?.name || '-',
        employmentType: employee.employmentType?.name || '-',
        employeeStatus: employee.status,

        hrStatus,
        financeStatus,
        payrollReady,

        hrChecks,
        financeChecks,

        hrMissing,
        financeMissing,
        missingItems,

        blockingReasons: missingItems.map((item) => this.describeMissingItem(item)),

        bankDetailsStatus: employee.bankDetailsStatus || 'PENDING_VALIDATION',

        primaryBank: primaryBank
          ? {
              id: primaryBank.id,
              bankName: primaryBank.bankName,
              branchName: primaryBank.branchName,
              accountName: primaryBank.accountName,
              maskedAccountNumber: this.maskAccountNumber(primaryBank.accountNumber),
              isPrimary: primaryBank.isPrimary,
              approvalStatus: primaryBank.approvalStatus,
            }
          : null,
      };
    });
  }

  private getMissingChecks(checks: Record<string, boolean>) {
    return Object.entries(checks)
      .filter(([, passed]) => !passed)
      .map(([key]) => key);
  }

  private describeMissingItem(item: string) {
    const descriptions: Record<string, string> = {
      activeEmployee: 'Employee status must be ACTIVE or ON_PROBATION.',
      hasDepartment: 'Department is missing.',
      hasJobTitle: 'Job title is missing.',
      hasSite: 'Site is missing.',
      hasEmploymentType: 'Employment type is missing.',
      hasStartDate: 'Start date is missing.',
      hasContract: 'Employee contract record is missing.',
      hasApprovedContract: 'Employee contract is not ACTIVE, APPROVED, or SIGNED.',
      hasApprovedConditionsOfService: 'Conditions of service are not approved.',
      hasStatutoryDetails: 'Statutory details are missing.',
      hasPrimaryBankAccount: 'Primary bank account is missing.',
      hasApprovedBankAccount: 'Primary bank account is not approved.',
      hasBankAccountName: 'Bank account name is missing.',
      hasBankAccountNumber: 'Bank account number is missing.',
      bankDetailsValidated: 'Bank details have not been validated by Finance.',
    };

    return descriptions[item] || item;
  }

  private cleanValue(value?: string | null) {
    if (!value) return '';
    return String(value).trim();
  }

  private maskAccountNumber(value?: string | null) {
    if (!value) return null;

    const raw = String(value).trim();

    if (!raw) return null;
    if (raw.length <= 4) return '****';

    return `${'*'.repeat(Math.max(raw.length - 4, 0))}${raw.slice(-4)}`;
  }
}