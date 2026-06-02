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