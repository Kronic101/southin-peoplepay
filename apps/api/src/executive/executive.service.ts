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

    async getExecutivePagePayload() {
    const dashboard = await this.getDashboardSummary();

    return {
      payloadType: 'EXECUTIVE_LEADERSHIP_PAGE',
      generatedAt: new Date(),
      sourceSystem: 'Southin PeoplePay',
      target: {
        siteName: 'Executive Leadership',
        recommendedPageName: 'PeoplePay Executive Dashboard',
        confidentiality: 'CONFIDENTIAL_EXECUTIVE',
        publishingMethod: 'CONTROLLED_JSON_PAYLOAD',
        futureGraphTarget: {
          sitePath: '/sites/ExecutiveLeadership',
          pageName: 'PeoplePay Executive Dashboard.aspx',
          status: 'PENDING_AZURE_APP_REGISTRATION',
        },
      },
      pageSections: [
        {
          sectionKey: 'kpi_summary',
          title: 'PeoplePay KPI Summary',
          displayOrder: 1,
          data: {
            totalEmployees: dashboard.summary.totalEmployees,
            activeEmployees: dashboard.summary.activeEmployees,
            draftEmployees: dashboard.summary.draftEmployees,
            payslipsGenerated: dashboard.summary.totalPayslips,
            payrollPeriods: dashboard.summary.payrollPeriods,
            payrollRuns: dashboard.summary.payrollRuns,
            lockedPayrollRuns: dashboard.summary.lockedPayrollRuns,
            openPayrollRuns: dashboard.summary.openPayrollRuns,
          },
        },
        {
          sectionKey: 'latest_locked_payroll',
          title: 'Latest Locked Payroll',
          displayOrder: 2,
          data: dashboard.latestLockedPayroll || {
            message: 'No locked payroll available yet.',
          },
        },
        {
          sectionKey: 'latest_financial_summary',
          title: 'Latest Payroll Financial Summary',
          displayOrder: 3,
          data: {
            grossPay: money(dashboard.financials.latestGrossPay),
            deductions: money(dashboard.financials.latestDeductions),
            netPay: money(dashboard.financials.latestNetPay),
            employerCost: money(dashboard.financials.latestEmployerCost),
          },
        },
        {
          sectionKey: 'recent_payroll_runs',
          title: 'Recent Payroll Runs',
          displayOrder: 4,
          data: dashboard.recentPayrollRuns.map((run: any) => ({
            id: run.id,
            runName: run.runName,
            periodName: run.periodName,
            runType: run.runType,
            status: run.status,
            employeeCount: run.employeeCount,
            grossPay: money(run.grossPay),
            deductions: money(run.totalDeductions),
            netPay: money(run.netPay),
            employerCost: money(run.employerCost),
            approvalCount: run.approvalCount,
            lockedAt: run.lockedAt,
          })),
        },
        {
          sectionKey: 'compliance_notes',
          title: 'Compliance Notes',
          displayOrder: 5,
          data: dashboard.complianceNotes,
        },
      ],
      securityRules: [
        'This payload may contain payroll totals and must only be published to restricted executive audiences.',
        'Do not publish individual employee payslip, NRC, bank, PAYE, NAPSA, or NHIMA details to public sites.',
        'Detailed payroll evidence must remain restricted to Finance and Executive Leadership.',
      ],
    };
  }

  async getPublicDashboardPayload() {
    const dashboard = await this.getDashboardSummary();

    const latestStatus = dashboard.latestLockedPayroll
      ? dashboard.latestLockedPayroll.status
      : 'NO_LOCKED_PAYROLL';

    return {
      payloadType: 'PUBLIC_DASHBOARD_SUMMARY',
      generatedAt: new Date(),
      sourceSystem: 'Southin PeoplePay',
      target: {
        siteName: 'Southin Public Dashboard',
        recommendedPageName: 'PeoplePay Public Summary',
        confidentiality: 'PUBLIC_SUMMARY_ONLY',
        publishingMethod: 'CONTROLLED_JSON_PAYLOAD',
        futureGraphTarget: {
          sitePath: '/sites/SouthinPublicDashboard',
          pageName: 'PeoplePay Public Summary.aspx',
          status: 'PENDING_AZURE_APP_REGISTRATION',
        },
      },
      publicSummary: {
        totalEmployees: dashboard.summary.totalEmployees,
        activeEmployees: dashboard.summary.activeEmployees,
        payrollProcessingStatus: latestStatus,
        lockedPayrollRuns: dashboard.summary.lockedPayrollRuns,
        openPayrollRuns: dashboard.summary.openPayrollRuns,
        lastUpdated: dashboard.generatedAt,
      },
      excludedFields: [
        'grossPay',
        'deductions',
        'netPay',
        'employerCost',
        'employeeNames',
        'employeeNumbers',
        'NRC',
        'bankDetails',
        'PAYE',
        'NAPSA',
        'NHIMA',
        'payslipDetails',
      ],
      securityRules: [
        'This payload must not contain salary values.',
        'This payload must not contain employee names or employee numbers.',
        'This payload must not contain statutory, banking, or payslip details.',
      ],
    };
  }

  async getFinanceAuditPayload(runId?: string) {
    const audit = await this.getPayrollAudit(runId);

    return {
      payloadType: 'FINANCE_PAYROLL_AUDIT_PACKAGE',
      generatedAt: new Date(),
      sourceSystem: 'Southin PeoplePay',
      target: {
        siteName: 'Finance',
        recommendedLibraryName: 'Payroll Audit Reports',
        confidentiality: 'CONFIDENTIAL_FINANCE',
        publishingMethod: 'CONTROLLED_JSON_PAYLOAD',
        futureGraphTarget: {
          sitePath: '/sites/Finance',
          documentLibrary: 'Payroll Audit Reports',
          status: 'PENDING_AZURE_APP_REGISTRATION',
        },
      },
      auditPackage: audit,
      recommendedFiles: audit.run
        ? [
            {
              fileName: `${audit.run.periodName} - ${audit.run.runName} - Payroll Audit.csv`,
              sourceEndpoint: `/api/executive/payroll-audit.csv?runId=${audit.run.id}`,
              documentType: 'PAYROLL_AUDIT_CSV',
            },
            {
              fileName: `${audit.run.periodName} - ${audit.run.runName} - Approval Evidence.json`,
              sourceEndpoint: `/api/executive/payroll-audit?runId=${audit.run.id}`,
              documentType: 'PAYROLL_APPROVAL_EVIDENCE_JSON',
            },
          ]
        : [],
      financeControls: [
        'Confirm payroll totals match approved Finance review.',
        'Confirm locked payroll has Director approval.',
        'Confirm payslips were generated after payroll lock.',
        'Confirm statutory configuration used for payroll was approved before live payroll use.',
        'Confirm bank payment preparation evidence is stored separately in Finance.',
      ],
    };
  }

  async getSharePointExportPackage() {
    const [executivePage, publicDashboard, financeAudit] = await Promise.all([
      this.getExecutivePagePayload(),
      this.getPublicDashboardPayload(),
      this.getFinanceAuditPayload(),
    ]);

    return {
      payloadType: 'SOUTHIN_PEOPLEPAY_SHAREPOINT_EXPORT_PACKAGE',
      generatedAt: new Date(),
      sourceSystem: 'Southin PeoplePay',
      graphAutomationStatus: 'NOT_ENABLED_YET',
      reasonGraphNotEnabled:
        'Azure App Registration, Microsoft Graph permissions, site IDs, and document library IDs are not configured yet.',
      packageTargets: [
        {
          siteName: 'Executive Leadership',
          purpose: 'Confidential executive payroll dashboard summary',
          payloadEndpoint: '/api/executive/sharepoint/executive-page-payload',
        },
        {
          siteName: 'Finance',
          purpose: 'Payroll audit reports and finance evidence',
          payloadEndpoint: '/api/executive/sharepoint/finance-audit-payload',
        },
        {
          siteName: 'Human Resource',
          purpose: 'Employee master validation and payroll readiness tracking',
          payloadEndpoint: '/api/employees/payroll-readiness',
        },
        {
          siteName: 'Southin Public Dashboard',
          purpose: 'Non-confidential employee and payroll processing status only',
          payloadEndpoint: '/api/executive/sharepoint/public-dashboard-payload',
        },
      ],
      payloads: {
        executiveLeadership: executivePage,
        financeAudit,
        publicDashboard,
      },
      nextGraphReadinessChecklist: [
        'Create Azure App Registration.',
        'Grant Microsoft Graph Application permissions.',
        'Approve admin consent.',
        'Store tenant ID, client ID, and client secret in .env.',
        'Resolve SharePoint site IDs.',
        'Resolve document library drive IDs.',
        'Create Graph upload service.',
        'Add audit logs for every SharePoint export.',
      ],
    };
  }

  async logSharePointExportRequest(body: any) {
    return {
      message:
        'SharePoint export request received in development mode. No Microsoft Graph write operation was performed.',
      graphAutomationStatus: 'DISABLED_DEV_MODE',
      receivedAt: new Date(),
      receivedPayload: body,
      nextStep:
        'Enable Microsoft Graph only after Azure App Registration, permissions, site IDs, and library IDs are configured.',
    };
  }
}