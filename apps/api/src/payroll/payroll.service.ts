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

type UpdatePayrollLineGrossPayInput = {
  grossPay: number | string;
  description?: string;
};

type DraftDeductionInput = {
  payrollRunEmployeeId: string;
  deductionType: string;
  description: string;
  amount: number;
  source: string;
};

type WorkflowActionInput = {
  actorId?: string;
  comments?: string;
  approved?: boolean;
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
      orderBy: {
        employeeNumber: 'asc',
      },
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
      where: {
        id: input.payrollPeriodId,
      },
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

    return this.prisma.payrollRun.create({
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
                site: true,
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
  }

  async getPayrollRun(id: string) {
    const run = await this.prisma.payrollRun.findUnique({
      where: {
        id,
      },
      include: {
        payrollPeriod: true,
        employees: {
          include: {
            employee: {
              include: {
                department: true,
                jobTitle: true,
                site: true,
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

  async updatePayrollLineGrossPay(
    runId: string,
    lineId: string,
    input: UpdatePayrollLineGrossPayInput,
  ) {
    const run = await this.prisma.payrollRun.findUnique({
      where: {
        id: runId,
      },
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

    await this.prisma.payrollDeduction.deleteMany({
      where: {
        payrollRunEmployeeId: lineId,
        deductionType: {
          in: ['PAYE', 'NAPSA', 'NHIMA'],
        },
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
            site: true,
            employmentType: true,
          },
        },
        earnings: true,
        deductions: true,
        payslip: true,
      },
    });
  }

    async calculatePayrollLineStatutory(runId: string, lineId: string) {
    const run = await this.prisma.payrollRun.findUnique({
      where: {
        id: runId,
      },
      include: {
        payrollPeriod: true,
      },
    });

    if (!run) {
      throw new NotFoundException('Payroll run not found');
    }

    if (run.status !== 'OPEN' && run.status !== 'PROCESSING') {
      throw new BadRequestException('Only OPEN or PROCESSING payroll runs can be calculated');
    }

    const payrollLine = await this.prisma.payrollRunEmployee.findFirst({
      where: {
        id: lineId,
        payrollRunId: runId,
      },
      include: {
        employee: {
          include: {
            statutoryDetails: true,
            department: true,
            jobTitle: true,
            site: true,
            employmentType: true,
          },
        },
        earnings: true,
        deductions: true,
        payslip: true,
      },
    });

    if (!payrollLine) {
      throw new NotFoundException('Payroll employee line not found');
    }

    const grossPay = Number(payrollLine.grossPay || 0);

    if (grossPay <= 0) {
      throw new BadRequestException('Gross pay must be entered before statutory calculation');
    }

    const statutory = payrollLine.employee.statutoryDetails;

    if (!statutory) {
      throw new BadRequestException('Employee statutory details are missing');
    }

    const payDate = run.payrollPeriod?.payDate || new Date();

    const activeTaxYear = await this.prisma.taxYear.findFirst({
      where: {
        isActive: true,
        startDate: {
          lte: payDate,
        },
        endDate: {
          gte: payDate,
        },
      },
      include: {
        payeBands: {
          orderBy: {
            lowerBound: 'asc',
          },
        },
      },
    });

    const approvedNapsaRate = await this.prisma.napsaRate.findFirst({
      where: {
        status: 'APPROVED',
        effectiveFrom: {
          lte: payDate,
        },
        OR: [
          {
            effectiveTo: null,
          },
          {
            effectiveTo: {
              gte: payDate,
            },
          },
        ],
      },
      orderBy: {
        effectiveFrom: 'desc',
      },
    });

    const approvedNhimaRate = await this.prisma.nhimaRate.findFirst({
      where: {
        status: 'APPROVED',
        effectiveFrom: {
          lte: payDate,
        },
        OR: [
          {
            effectiveTo: null,
          },
          {
            effectiveTo: {
              gte: payDate,
            },
          },
        ],
      },
      orderBy: {
        effectiveFrom: 'desc',
      },
    });

    const approvedSdlRate = await this.prisma.sdlRate.findFirst({
      where: {
        status: 'APPROVED',
        effectiveFrom: {
          lte: payDate,
        },
        OR: [
          {
            effectiveTo: null,
          },
          {
            effectiveTo: {
              gte: payDate,
            },
          },
        ],
      },
      orderBy: {
        effectiveFrom: 'desc',
      },
    });

    const paye = statutory.payeApplicable
      ? this.calculatePayeFromBands(grossPay, activeTaxYear?.payeBands || [])
      : 0;

    const napsaBase =
      approvedNapsaRate?.monthlyCeiling === null || approvedNapsaRate?.monthlyCeiling === undefined
        ? grossPay
        : Math.min(grossPay, Number(approvedNapsaRate.monthlyCeiling || 0));

    const napsa =
      statutory.napsaApplicable && approvedNapsaRate
        ? this.roundMoney(napsaBase * Number(approvedNapsaRate.employeeRate || 0))
        : 0;

    const nhima =
      statutory.nhimaApplicable && approvedNhimaRate
        ? this.roundMoney(grossPay * Number(approvedNhimaRate.employeeRate || 0))
        : 0;

    const sdlEmployerCost = approvedSdlRate
      ? this.roundMoney(grossPay * Number(approvedSdlRate.employerRate || 0))
      : 0;

    const napsaEmployerCost =
      statutory.napsaApplicable && approvedNapsaRate
        ? this.roundMoney(napsaBase * Number(approvedNapsaRate.employerRate || 0))
        : 0;

    const nhimaEmployerCost =
      statutory.nhimaApplicable && approvedNhimaRate
        ? this.roundMoney(grossPay * Number(approvedNhimaRate.employerRate || 0))
        : 0;

    await this.prisma.payrollDeduction.deleteMany({
      where: {
        payrollRunEmployeeId: lineId,
        deductionType: {
          in: ['PAYE', 'NAPSA', 'NHIMA'],
        },
      },
    });

    const deductionsToCreate: DraftDeductionInput[] = [];

    if (statutory.payeApplicable) {
      deductionsToCreate.push({
        payrollRunEmployeeId: lineId,
        deductionType: 'PAYE',
        description: activeTaxYear
          ? `PAYE calculated using active tax year: ${activeTaxYear.name}`
          : 'PAYE not calculated - no active approved tax year/bands configured',
        amount: paye,
        source: activeTaxYear ? 'SYSTEM_CONFIGURED' : 'SYSTEM_DRAFT',
      });
    }

    if (statutory.napsaApplicable) {
      deductionsToCreate.push({
        payrollRunEmployeeId: lineId,
        deductionType: 'NAPSA',
        description: approvedNapsaRate
          ? `NAPSA calculated using approved rate: ${approvedNapsaRate.name}`
          : 'NAPSA not calculated - no approved NAPSA rate configured',
        amount: napsa,
        source: approvedNapsaRate ? 'SYSTEM_CONFIGURED' : 'SYSTEM_DRAFT',
      });
    }

    if (statutory.nhimaApplicable) {
      deductionsToCreate.push({
        payrollRunEmployeeId: lineId,
        deductionType: 'NHIMA',
        description: approvedNhimaRate
          ? `NHIMA calculated using approved rate: ${approvedNhimaRate.name}`
          : 'NHIMA not calculated - no approved NHIMA rate configured',
        amount: nhima,
        source: approvedNhimaRate ? 'SYSTEM_CONFIGURED' : 'SYSTEM_DRAFT',
      });
    }

    if (deductionsToCreate.length > 0) {
      await this.prisma.payrollDeduction.createMany({
        data: deductionsToCreate,
      });
    }

    const totalDeductions = this.roundMoney(paye + napsa + nhima);
    const netPay = this.roundMoney(grossPay - totalDeductions);
    const employerCost = this.roundMoney(grossPay + napsaEmployerCost + nhimaEmployerCost + sdlEmployerCost);

    return this.prisma.payrollRunEmployee.update({
      where: {
        id: lineId,
      },
      data: {
        totalDeductions,
        netPay,
        employerCost,
        status: 'CALCULATED',
        calculatedAt: new Date(),
      },
      include: {
        employee: {
          include: {
            department: true,
            jobTitle: true,
            site: true,
            employmentType: true,
          },
        },
        earnings: true,
        deductions: true,
        payslip: true,
      },
    });
  }

    private calculatePayeFromBands(
    grossPay: number,
    bands: Array<{
      lowerBound: unknown;
      upperBound: unknown;
      rate: unknown;
    }>,
  ) {
    if (!bands || bands.length === 0) {
      return 0;
    }

    let totalTax = 0;

    for (const band of bands) {
      const lowerBound = Number(band.lowerBound || 0);
      const upperBound =
        band.upperBound === null || band.upperBound === undefined
          ? null
          : Number(band.upperBound);

      const rate = Number(band.rate || 0);

      if (grossPay <= lowerBound) {
        continue;
      }

      const taxableInBand =
        upperBound === null
          ? grossPay - lowerBound
          : Math.min(grossPay, upperBound) - lowerBound;

      if (taxableInBand > 0) {
        totalTax += taxableInBand * rate;
      }
    }

    return this.roundMoney(totalTax);
  }

  private roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

    private async getRunForWorkflow(id: string) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id },
      include: {
        payrollPeriod: true,
        employees: {
          include: {
            employee: true,
            earnings: true,
            deductions: true,
          },
        },
        approvals: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!run) {
      throw new NotFoundException('Payroll run not found');
    }

    return run;
  }

  private ensureAllPayrollLinesCalculated(run: any) {
    if (run.employees.length === 0) {
      throw new BadRequestException('Payroll run has no employees');
    }

    const uncalculatedLines = run.employees.filter((line: any) => {
      return Number(line.grossPay || 0) <= 0 || line.status !== 'CALCULATED';
    });

    if (uncalculatedLines.length > 0) {
      throw new BadRequestException(
        'All payroll employees must have gross pay and calculated statutory deductions before submission',
      );
    }
  }

  private async createWorkflowApproval(params: {
    payrollRunId: string;
    approvalStage: string;
    approverRole: string;
    approverId?: string | null;
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
    comments?: string | null;
  }) {
    return this.prisma.payrollApproval.create({
      data: {
        payrollRunId: params.payrollRunId,
        approvalStage: params.approvalStage,
        approverRole: params.approverRole,
        approverId: params.approverId || null,
        status: params.status || 'PENDING',
        comments: params.comments || null,
        approvedAt: params.status === 'APPROVED' || params.status === 'REJECTED' ? new Date() : null,
      },
    });
  }

  async submitPayrollRunToHr(id: string, input: WorkflowActionInput) {
    const run = await this.getRunForWorkflow(id);

    if (run.status !== 'OPEN' && run.status !== 'PROCESSING') {
      throw new BadRequestException('Only OPEN or PROCESSING payroll runs can be submitted to HR');
    }

    this.ensureAllPayrollLinesCalculated(run);

    await this.createWorkflowApproval({
      payrollRunId: id,
      approvalStage: 'HR_REVIEW',
      approverRole: 'HR_MANAGER',
      status: 'PENDING',
      comments: input.comments || 'Submitted to HR for employee changes, attendance, and payroll validation',
    });

    return this.prisma.payrollRun.update({
      where: { id },
      data: {
        status: 'SUBMITTED_HR_REVIEW',
        submittedAt: new Date(),
        preparedBy: input.actorId || null,
      },
      include: {
        payrollPeriod: true,
        employees: {
          include: {
            employee: true,
            earnings: true,
            deductions: true,
          },
        },
        approvals: true,
      },
    });
  }

  async hrReviewPayrollRun(id: string, input: WorkflowActionInput) {
    const run = await this.getRunForWorkflow(id);

    if (run.status !== 'SUBMITTED_HR_REVIEW') {
      throw new BadRequestException('Payroll run must be submitted to HR before HR review');
    }

    if (input.approved === false) {
      await this.createWorkflowApproval({
        payrollRunId: id,
        approvalStage: 'HR_REVIEW',
        approverRole: 'HR_MANAGER',
        approverId: input.actorId || null,
        status: 'REJECTED',
        comments: input.comments || 'Rejected by HR',
      });

      return this.prisma.payrollRun.update({
        where: { id },
        data: {
          status: 'REJECTED',
          hrReviewedBy: input.actorId || null,
        },
        include: {
          payrollPeriod: true,
          employees: true,
          approvals: true,
        },
      });
    }

    await this.createWorkflowApproval({
      payrollRunId: id,
      approvalStage: 'HR_REVIEW',
      approverRole: 'HR_MANAGER',
      approverId: input.actorId || null,
      status: 'APPROVED',
      comments: input.comments || 'HR review completed',
    });

    return this.prisma.payrollRun.update({
      where: { id },
      data: {
        status: 'HR_REVIEWED',
        hrReviewedBy: input.actorId || null,
      },
      include: {
        payrollPeriod: true,
        employees: true,
        approvals: true,
      },
    });
  }

  async submitPayrollRunToFinance(id: string, input: WorkflowActionInput) {
    const run = await this.getRunForWorkflow(id);

    if (run.status !== 'HR_REVIEWED') {
      throw new BadRequestException('Payroll run must be HR reviewed before submission to Finance');
    }

    await this.createWorkflowApproval({
      payrollRunId: id,
      approvalStage: 'FINANCE_REVIEW',
      approverRole: 'FINANCE_MANAGER',
      status: 'PENDING',
      comments: input.comments || 'Submitted to Finance for totals, deductions, and bank file validation',
    });

    return this.prisma.payrollRun.update({
      where: { id },
      data: {
        status: 'SUBMITTED_FINANCE_REVIEW',
      },
      include: {
        payrollPeriod: true,
        employees: true,
        approvals: true,
      },
    });
  }

  async financeReviewPayrollRun(id: string, input: WorkflowActionInput) {
    const run = await this.getRunForWorkflow(id);

    if (run.status !== 'SUBMITTED_FINANCE_REVIEW') {
      throw new BadRequestException('Payroll run must be submitted to Finance before Finance review');
    }

    if (input.approved === false) {
      await this.createWorkflowApproval({
        payrollRunId: id,
        approvalStage: 'FINANCE_REVIEW',
        approverRole: 'FINANCE_MANAGER',
        approverId: input.actorId || null,
        status: 'REJECTED',
        comments: input.comments || 'Rejected by Finance',
      });

      return this.prisma.payrollRun.update({
        where: { id },
        data: {
          status: 'REJECTED',
          financeReviewedBy: input.actorId || null,
        },
        include: {
          payrollPeriod: true,
          employees: true,
          approvals: true,
        },
      });
    }

    await this.createWorkflowApproval({
      payrollRunId: id,
      approvalStage: 'FINANCE_REVIEW',
      approverRole: 'FINANCE_MANAGER',
      approverId: input.actorId || null,
      status: 'APPROVED',
      comments: input.comments || 'Finance review completed',
    });

    return this.prisma.payrollRun.update({
      where: { id },
      data: {
        status: 'FINANCE_REVIEWED',
        financeReviewedBy: input.actorId || null,
      },
      include: {
        payrollPeriod: true,
        employees: true,
        approvals: true,
      },
    });
  }

  async submitPayrollRunToDirector(id: string, input: WorkflowActionInput) {
    const run = await this.getRunForWorkflow(id);

    if (run.status !== 'FINANCE_REVIEWED') {
      throw new BadRequestException('Payroll run must be Finance reviewed before Director approval');
    }

    await this.createWorkflowApproval({
      payrollRunId: id,
      approvalStage: 'DIRECTOR_APPROVAL',
      approverRole: 'DIRECTOR',
      status: 'PENDING',
      comments: input.comments || 'Submitted to Director for final payroll approval',
    });

    return this.prisma.payrollRun.update({
      where: { id },
      data: {
        status: 'SUBMITTED_DIRECTOR_APPROVAL',
      },
      include: {
        payrollPeriod: true,
        employees: true,
        approvals: true,
      },
    });
  }

  async directorApprovePayrollRun(id: string, input: WorkflowActionInput) {
    const run = await this.getRunForWorkflow(id);

    if (run.status !== 'SUBMITTED_DIRECTOR_APPROVAL') {
      throw new BadRequestException('Payroll run must be submitted to Director before approval');
    }

    if (input.approved === false) {
      await this.createWorkflowApproval({
        payrollRunId: id,
        approvalStage: 'DIRECTOR_APPROVAL',
        approverRole: 'DIRECTOR',
        approverId: input.actorId || null,
        status: 'REJECTED',
        comments: input.comments || 'Rejected by Director',
      });

      return this.prisma.payrollRun.update({
        where: { id },
        data: {
          status: 'REJECTED',
          directorApprovedBy: input.actorId || null,
        },
        include: {
          payrollPeriod: true,
          employees: true,
          approvals: true,
        },
      });
    }

    await this.createWorkflowApproval({
      payrollRunId: id,
      approvalStage: 'DIRECTOR_APPROVAL',
      approverRole: 'DIRECTOR',
      approverId: input.actorId || null,
      status: 'APPROVED',
      comments: input.comments || 'Director approved payroll',
    });

    return this.prisma.payrollRun.update({
      where: { id },
      data: {
        status: 'DIRECTOR_APPROVED',
        directorApprovedBy: input.actorId || null,
      },
      include: {
        payrollPeriod: true,
        employees: true,
        approvals: true,
      },
    });
  }

  async lockPayrollRun(id: string, input: WorkflowActionInput) {
    const run = await this.getRunForWorkflow(id);

    if (run.status !== 'DIRECTOR_APPROVED') {
      throw new BadRequestException('Payroll run must be Director approved before locking');
    }

    return this.prisma.payrollRun.update({
      where: { id },
      data: {
        status: 'LOCKED',
        lockedAt: new Date(),
      },
      include: {
        payrollPeriod: true,
        employees: {
          include: {
            employee: true,
            earnings: true,
            deductions: true,
            payslip: true,
          },
        },
        approvals: true,
      },
    });
  }
}