import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function money(value: unknown) {
  return toNumber(value).toFixed(2);
}

function csvEscape(value: unknown) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

@Injectable()
export class ExecutiveService {
  constructor(private readonly prisma: PrismaService) {}

  private calculateRunTotals(run: any) {
    const employees = run.employees || [];

    const grossPay = employees.reduce(
      (sum: number, line: any) => sum + toNumber(line.grossPay),
      0,
    );

    const totalDeductions = employees.reduce(
      (sum: number, line: any) => sum + toNumber(line.totalDeductions),
      0,
    );

    const netPay = employees.reduce(
      (sum: number, line: any) => sum + toNumber(line.netPay),
      0,
    );

    const employerCost = employees.reduce(
      (sum: number, line: any) => sum + toNumber(line.employerCost),
      0,
    );

    return {
      employeeCount: employees.length,
      grossPay,
      totalDeductions,
      netPay,
      employerCost,
    };
  }

  async getDashboardSummary() {
    const [
      totalEmployees,
      draftEmployees,
      activeEmployees,
      totalPayslips,
      payrollPeriods,
      payrollRuns,
      lockedRuns,
      openRuns,
    ] = await Promise.all([
      this.prisma.employee.count(),
      this.prisma.employee.count({
        where: { status: 'DRAFT' as any },
      }),
      this.prisma.employee.count({
        where: { status: 'ACTIVE' as any },
      }),
      this.prisma.payslip.count(),
      this.prisma.payrollPeriod.findMany({
        orderBy: { startDate: 'desc' },
        take: 6,
        include: {
          runs: true,
        },
      }),
      this.prisma.payrollRun.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          payrollPeriod: true,
          employees: true,
          approvals: {
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      this.prisma.payrollRun.findMany({
        where: { status: 'LOCKED' as any },
        orderBy: { lockedAt: 'desc' },
        take: 5,
        include: {
          payrollPeriod: true,
          employees: true,
          approvals: true,
        },
      }),
      this.prisma.payrollRun.count({
        where: {
          status: {
            not: 'LOCKED' as any,
          },
        },
      }),
    ]);

    const latestLockedPayroll = lockedRuns[0] || null;
    const latestLockedTotals = latestLockedPayroll
      ? this.calculateRunTotals(latestLockedPayroll)
      : {
          employeeCount: 0,
          grossPay: 0,
          totalDeductions: 0,
          netPay: 0,
          employerCost: 0,
        };

    const recentPayrollRuns = payrollRuns.map((run) => {
      const totals = this.calculateRunTotals(run);

      return {
        id: run.id,
        runName: run.runName,
        runType: run.runType,
        status: run.status,
        periodName: run.payrollPeriod?.periodName || '-',
        employeeCount: totals.employeeCount,
        grossPay: totals.grossPay,
        totalDeductions: totals.totalDeductions,
        netPay: totals.netPay,
        employerCost: totals.employerCost,
        createdAt: run.createdAt,
        lockedAt: run.lockedAt,
        approvalCount: run.approvals?.length || 0,
      };
    });

    const periods = payrollPeriods.map((period) => ({
      id: period.id,
      periodName: period.periodName,
      startDate: period.startDate,
      endDate: period.endDate,
      payDate: period.payDate,
      status: period.status,
      runCount: period.runs?.length || 0,
    }));

    return {
      generatedAt: new Date(),
      summary: {
        totalEmployees,
        draftEmployees,
        activeEmployees,
        totalPayslips,
        payrollPeriods: payrollPeriods.length,
        payrollRuns: payrollRuns.length,
        lockedPayrollRuns: lockedRuns.length,
        openPayrollRuns: openRuns,
      },
      latestLockedPayroll: latestLockedPayroll
        ? {
            id: latestLockedPayroll.id,
            runName: latestLockedPayroll.runName,
            periodName: latestLockedPayroll.payrollPeriod?.periodName || '-',
            status: latestLockedPayroll.status,
            lockedAt: latestLockedPayroll.lockedAt,
            totals: latestLockedTotals,
          }
        : null,
      financials: {
        latestGrossPay: latestLockedTotals.grossPay,
        latestDeductions: latestLockedTotals.totalDeductions,
        latestNetPay: latestLockedTotals.netPay,
        latestEmployerCost: latestLockedTotals.employerCost,
      },
      payrollPeriods: periods,
      recentPayrollRuns,
      complianceNotes: [
        'Payroll must only be processed for payroll-ready employees.',
        'Statutory PAYE, NAPSA, NHIMA, and employer rates must be approved by HR and Finance before go-live.',
        'Locked payroll runs should be auditable and supported by payslip records.',
      ],
    };
  }

  async getSharePointFeed() {
    const dashboard = await this.getDashboardSummary();

    return {
      title: 'Southin PeoplePay Executive Feed',
      generatedAt: dashboard.generatedAt,
      source: 'Southin PeoplePay API',
      kpis: {
        totalEmployees: dashboard.summary.totalEmployees,
        activeEmployees: dashboard.summary.activeEmployees,
        totalPayslips: dashboard.summary.totalPayslips,
        lockedPayrollRuns: dashboard.summary.lockedPayrollRuns,
        openPayrollRuns: dashboard.summary.openPayrollRuns,
        latestGrossPay: money(dashboard.financials.latestGrossPay),
        latestDeductions: money(dashboard.financials.latestDeductions),
        latestNetPay: money(dashboard.financials.latestNetPay),
        latestEmployerCost: money(dashboard.financials.latestEmployerCost),
      },
      latestLockedPayroll: dashboard.latestLockedPayroll,
      recentPayrollRuns: dashboard.recentPayrollRuns.slice(0, 5),
      notes: dashboard.complianceNotes,
    };
  }

  async getPayrollAudit(runId?: string) {
    let run: any = null;

    if (runId) {
      run = await this.prisma.payrollRun.findUnique({
        where: { id: runId },
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
          approvals: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!run) {
        throw new NotFoundException('Payroll run not found');
      }
    } else {
      run = await this.prisma.payrollRun.findFirst({
        orderBy: { createdAt: 'desc' },
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
          approvals: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!run) {
        return {
          generatedAt: new Date(),
          message: 'No payroll runs found.',
          run: null,
          employees: [],
          approvals: [],
        };
      }
    }

    const totals = this.calculateRunTotals(run);

    return {
      generatedAt: new Date(),
      run: {
        id: run.id,
        runName: run.runName,
        runType: run.runType,
        status: run.status,
        periodName: run.payrollPeriod?.periodName || '-',
        periodStart: run.payrollPeriod?.startDate || null,
        periodEnd: run.payrollPeriod?.endDate || null,
        payDate: run.payrollPeriod?.payDate || null,
        preparedBy: run.preparedBy,
        submittedAt: run.submittedAt,
        hrReviewedBy: run.hrReviewedBy,
        financeReviewedBy: run.financeReviewedBy,
        directorApprovedBy: run.directorApprovedBy,
        lockedAt: run.lockedAt,
      },
      totals,
      employees: (run.employees || []).map((line: any) => ({
        lineId: line.id,
        employeeNumber: line.employee?.employeeNumber || '-',
        employeeName: `${line.employee?.firstName || ''} ${line.employee?.lastName || ''}`.trim(),
        department: line.employee?.department?.name || '-',
        jobTitle: line.employee?.jobTitle?.name || '-',
        site: line.employee?.site?.name || '-',
        employmentType: line.employee?.employmentType?.name || '-',
        grossPay: toNumber(line.grossPay),
        totalDeductions: toNumber(line.totalDeductions),
        netPay: toNumber(line.netPay),
        employerCost: toNumber(line.employerCost),
        lineStatus: line.status,
        earningsCount: line.earnings?.length || 0,
        deductionsCount: line.deductions?.length || 0,
        payslipGenerated: Boolean(line.payslip),
      })),
      approvals: (run.approvals || []).map((approval: any) => ({
        stage: approval.approvalStage,
        role: approval.approverRole,
        approverId: approval.approverId,
        status: approval.status,
        comments: approval.comments,
        approvedAt: approval.approvedAt,
        createdAt: approval.createdAt,
      })),
    };
  }

  async exportPayrollAuditCsv(runId?: string) {
    const audit = await this.getPayrollAudit(runId);

    if (!audit.run) {
      return 'Message\n"No payroll runs found."\n';
    }

    const rows = [
      [
        'Run Name',
        'Period',
        'Status',
        'Employee No',
        'Employee Name',
        'Department',
        'Job Title',
        'Site',
        'Employment Type',
        'Gross Pay',
        'Deductions',
        'Net Pay',
        'Employer Cost',
        'Line Status',
        'Payslip Generated',
      ],
    ];

    for (const employee of audit.employees) {
      rows.push([
        audit.run.runName,
        audit.run.periodName,
        audit.run.status,
        employee.employeeNumber,
        employee.employeeName,
        employee.department,
        employee.jobTitle,
        employee.site,
        employee.employmentType,
        money(employee.grossPay),
        money(employee.totalDeductions),
        money(employee.netPay),
        money(employee.employerCost),
        employee.lineStatus,
        employee.payslipGenerated ? 'YES' : 'NO',
      ]);
    }

    return rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  }
}