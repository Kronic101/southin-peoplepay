import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PayrollRunType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type CreatePayrollPeriodInput = {
  periodName: string;
  startDate: string;
  endDate: string;
  payDate: string;
};

type CreatePayrollRunInput = {
  payrollPeriodId: string;
  runName: string;
  runType?: PayrollRunType;
};

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  async getPayrollPeriods() {
    return this.prisma.payrollPeriod.findMany({
      orderBy: {
        startDate: 'desc',
      },
      include: {
        runs: true,
      },
    });
  }

  async createPayrollPeriod(input: CreatePayrollPeriodInput) {
    if (!input.periodName || !input.startDate || !input.endDate || !input.payDate) {
      throw new BadRequestException('Period name, start date, end date, and pay date are required');
    }

    return this.prisma.payrollPeriod.create({
      data: {
        periodName: input.periodName,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        payDate: new Date(input.payDate),
        status: 'OPEN',
      },
    });
  }

  async getPayrollReadyEmployees() {
    const employees = await this.prisma.employee.findMany({
      orderBy: { employeeNumber: 'asc' },
      include: {
        department: true,
        jobTitle: true,
        site: true,
        employmentType: true,
        statutoryDetails: true,
        bankAccounts: true,
        contracts: true,
        serviceConditions: true,
        portalAccount: true,
      },
    });

    return employees
      .map((employee) => {
        const hasApprovedBankAccount = employee.bankAccounts.some(
          (account) => account.approvalStatus === 'APPROVED',
        );

        const hasApprovedConditionOfService = employee.serviceConditions.some(
          (condition) => condition.status === 'APPROVED',
        );

        const checks = {
          department: Boolean(employee.departmentId),
          jobTitle: Boolean(employee.jobTitleId),
          site: Boolean(employee.siteId),
          employmentType: Boolean(employee.employmentTypeId),
          tpin: Boolean(employee.statutoryDetails?.tpin),
          napsaNumber: Boolean(employee.statutoryDetails?.napsaNumber),
          nhimaNumber: Boolean(employee.statutoryDetails?.nhimaNumber),
          approvedBankAccount: hasApprovedBankAccount,
          contract: employee.contracts.length > 0,
          approvedConditionOfService: hasApprovedConditionOfService,
          portalAccess: Boolean(employee.portalAccount?.isActive),
        };

        const payrollReady = Object.values(checks).every(Boolean);

        return {
          id: employee.id,
          employeeNumber: employee.employeeNumber,
          name: `${employee.firstName} ${employee.lastName}`,
          status: employee.status,
          department: employee.department?.name || null,
          jobTitle: employee.jobTitle?.name || null,
          site: employee.site?.name || null,
          employmentType: employee.employmentType?.name || null,
          payrollReady,
        };
      })
      .filter((employee) => employee.payrollReady);
  }

  async getPayrollRuns() {
    return this.prisma.payrollRun.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        payrollPeriod: true,
        employees: true,
      },
    });
  }

  async createPayrollRun(input: CreatePayrollRunInput) {
    if (!input.payrollPeriodId || !input.runName) {
      throw new BadRequestException('Payroll period and run name are required');
    }

    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: input.payrollPeriodId },
    });

    if (!period) {
      throw new NotFoundException('Payroll period not found');
    }

    if (period.status !== 'OPEN') {
      throw new BadRequestException('Payroll period must be OPEN to create a payroll run');
    }

    const readyEmployees = await this.getPayrollReadyEmployees();

    if (readyEmployees.length === 0) {
      throw new BadRequestException('No payroll-ready employees found');
    }

    const payrollRun = await this.prisma.payrollRun.create({
      data: {
        payrollPeriodId: input.payrollPeriodId,
        runName: input.runName,
        runType: input.runType || 'MONTHLY',
        status: 'OPEN',
        employees: {
          create: readyEmployees.map((employee) => ({
            employeeId: employee.id,
            grossPay: 0,
            totalDeductions: 0,
            netPay: 0,
            employerCost: 0,
            status: 'DRAFT',
          })),
        },
      },
      include: {
        payrollPeriod: true,
        employees: {
          include: {
            employee: {
              include: {
                department: true,
                jobTitle: true,
                employmentType: true,
              },
            },
          },
        },
      },
    });

    return payrollRun;
  }

    async updatePayrollLineGrossPay(
    runId: string,
    lineId: string,
    input: {
      grossPay: number | string;
      description?: string;
    },
  ) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id: runId },
    });

    if (!run) {
      throw new NotFoundException('Payroll run not found');
    }

    if (run.status !== 'OPEN' && run.status !== 'PROCESSING') {
      throw new BadRequestException('Only OPEN or PROCESSING payroll runs can be edited');
    }

    const payrollLine = await this.prisma.payrollRunEmployee.findFirst({
      where: {
        id: lineId,
        payrollRunId: runId,
      },
      include: {
        employee: true,
      },
    });

    if (!payrollLine) {
      throw new NotFoundException('Payroll employee line not found');
    }

    const grossPay = Number(input.grossPay || 0);

    if (Number.isNaN(grossPay) || grossPay < 0) {
      throw new BadRequestException('Gross pay must be a valid positive number');
    }

    await this.prisma.payrollEarning.deleteMany({
      where: {
        payrollRunEmployeeId: lineId,
        earningType: 'BASIC_PAY',
      },
    });

    if (grossPay > 0) {
      await this.prisma.payrollEarning.create({
        data: {
          payrollRunEmployeeId: lineId,
          earningType: 'BASIC_PAY',
          description: input.description || 'Basic salary / gross pay',
          amount: grossPay,
          taxable: true,
          napsaPensionable: true,
          nhimaApplicable: true,
          source: 'MANUAL_ENTRY',
        },
      });
    }

    return this.prisma.payrollRunEmployee.update({
      where: {
        id: lineId,
      },
      data: {
        grossPay,
        totalDeductions: 0,
        netPay: grossPay,
        employerCost: grossPay,
        status: grossPay > 0 ? 'CALCULATED' : 'DRAFT',
        calculatedAt: new Date(),
      },
      include: {
        employee: {
          include: {
            department: true,
            jobTitle: true,
            employmentType: true,
          },
        },
        earnings: true,
        deductions: true,
      },
    });
  }

  async getPayrollRun(id: string) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id },
      include: {
        payrollPeriod: true,
        employees: {
          include: {
            employee: {
              include: {
                department: true,
                jobTitle: true,
                employmentType: true,
              },
            },
            earnings: true,
            deductions: true,
            payslip: true,
          },
        },
        approvals: true,
      },
    });

    if (!run) {
      throw new NotFoundException('Payroll run not found');
    }

    return run;
  }
}