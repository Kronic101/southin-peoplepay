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
          'Department must be assigned.',
          'Job title must be assigned.',
          'Site must be assigned.',
          'Employment type must be assigned.',
          'Start date must be captured.',
          'Employee must have a contract record.',
          'Employee must have approved conditions of service.',
        ],
        finance: [
          'Statutory details must exist.',
          'Primary bank account must exist.',
          'Primary bank account must be approved.',
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
        contracts: true,
        serviceConditions: {
          include: {
            template: true,
          },
        },
        bankAccounts: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
        },
      },
    });
  }

  private mapEmployeesToGateRows(employees: any[]) {
    return employees.map((employee) => {
      const primaryBank =
        employee.bankAccounts.find((account: any) => account.isPrimary) ||
        employee.bankAccounts[0] ||
        null;

      const hrChecks = {
        hasDepartment: Boolean(employee.departmentId),
        hasJobTitle: Boolean(employee.jobTitleId),
        hasSite: Boolean(employee.siteId),
        hasEmploymentType: Boolean(employee.employmentTypeId),
        hasStartDate: Boolean(employee.startDate),
        hasContract: employee.contracts.length > 0,
        hasApprovedConditionsOfService: employee.serviceConditions.some(
          (condition: any) => condition.status === 'APPROVED',
        ),
      };

      const financeChecks = {
        hasStatutoryDetails: Boolean(employee.statutoryDetails),
        hasPrimaryBankAccount: Boolean(primaryBank),
        hasApprovedBankAccount: Boolean(primaryBank?.approvalStatus === 'APPROVED'),
        bankDetailsValidated: employee.bankDetailsStatus === 'VALIDATED',
      };

      const hrMissing = this.getMissingChecks(hrChecks);
      const financeMissing = this.getMissingChecks(financeChecks);

      const hrStatus: GateStatus = hrMissing.length === 0 ? 'READY' : 'BLOCKED';
      const financeStatus: GateStatus = financeMissing.length === 0 ? 'READY' : 'BLOCKED';

      const payrollReady = hrStatus === 'READY' && financeStatus === 'READY';

      return {
        employeeId: employee.id,
        id: employee.id,
        employeeNumber: employee.employeeNumber,
        name: `${employee.firstName} ${employee.lastName}`.trim(),
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
        missingItems: [...hrMissing, ...financeMissing],

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

  private maskAccountNumber(value?: string | null) {
    if (!value) return null;

    const raw = String(value);
    if (raw.length <= 4) return '****';

    return `${'*'.repeat(Math.max(raw.length - 4, 0))}${raw.slice(-4)}`;
  }
}