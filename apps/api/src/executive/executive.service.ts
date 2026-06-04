import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SharePointGraphService } from './sharepoint-graph.service';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly sharePointGraphService: SharePointGraphService,
  ) {}

  private calculateRunTotals(run: any) {
    const employees = run?.employees || [];

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
          approvals: {
            orderBy: { createdAt: 'asc' },
          },
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

    const recentPayrollRuns = payrollRuns.map((run: any) => {
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

    const periods = payrollPeriods.map((period: any) => ({
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
      financials: {
        latestGrossPay: latestLockedTotals.grossPay,
        latestDeductions: latestLockedTotals.totalDeductions,
        latestNetPay: latestLockedTotals.netPay,
        latestEmployerCost: latestLockedTotals.employerCost,
      },
      latestLockedPayroll: latestLockedPayroll
        ? {
            id: latestLockedPayroll.id,
            runName: latestLockedPayroll.runName,
            runType: latestLockedPayroll.runType,
            status: latestLockedPayroll.status,
            periodName: latestLockedPayroll.payrollPeriod?.periodName || '-',
            lockedAt: latestLockedPayroll.lockedAt,
            totals: latestLockedTotals,
          }
        : null,
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
      generatedAt: new Date(),
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
      recentPayrollRuns: dashboard.recentPayrollRuns.map((run: any) => ({
        id: run.id,
        runName: run.runName,
        periodName: run.periodName,
        status: run.status,
        lockedAt: run.lockedAt,
        employeeCount: run.employeeCount,
        grossPay: money(run.grossPay),
        totalDeductions: money(run.totalDeductions),
        netPay: money(run.netPay),
        employerCost: money(run.employerCost),
      })),
      complianceNotes: dashboard.complianceNotes,
    };
  }

  private async resolvePayrollRunForAudit(runId?: string) {
    const include = {
      payrollPeriod: true,
      approvals: {
        orderBy: { createdAt: 'asc' as const },
      },
      employees: {
        orderBy: { createdAt: 'asc' as const },
        include: {
          employee: {
            include: {
              department: true,
              jobTitle: true,
              site: true,
              employmentType: true,
            },
          },
          earnings: {
            orderBy: { createdAt: 'asc' as const },
          },
          deductions: {
            orderBy: { createdAt: 'asc' as const },
          },
          payslip: true,
        },
      },
    };

    if (runId) {
      const run = await this.prisma.payrollRun.findUnique({
        where: { id: runId },
        include,
      });

      if (!run) {
        throw new NotFoundException('Payroll run not found');
      }

      return run;
    }

    const latestLocked = await this.prisma.payrollRun.findFirst({
      where: { status: 'LOCKED' as any },
      orderBy: { lockedAt: 'desc' },
      include,
    });

    if (latestLocked) {
      return latestLocked;
    }

    return this.prisma.payrollRun.findFirst({
      orderBy: { createdAt: 'desc' },
      include,
    });
  }

  async getPayrollAudit(runId?: string) {
    const run = await this.resolvePayrollRunForAudit(runId);

    if (!run) {
      return {
        generatedAt: new Date(),
        run: null,
        totals: {
          employeeCount: 0,
          grossPay: 0,
          totalDeductions: 0,
          netPay: 0,
          employerCost: 0,
        },
        employees: [],
        approvals: [],
      };
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
        preparedBy: run.preparedBy || null,
        submittedAt: run.submittedAt || null,
        hrReviewedBy: run.hrReviewedBy || null,
        financeReviewedBy: run.financeReviewedBy || null,
        directorApprovedBy: run.directorApprovedBy || null,
        lockedAt: run.lockedAt || null,
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
        status: line.status,
        calculatedAt: line.calculatedAt || null,
        earningsCount: line.earnings?.length || 0,
        deductionsCount: line.deductions?.length || 0,
        payslipGenerated: Boolean(line.payslip),
        payslipStatus: line.payslip?.status || null,
        earnings: (line.earnings || []).map((earning: any) => ({
          id: earning.id,
          earningType: earning.earningType,
          description: earning.description,
          amount: toNumber(earning.amount),
          taxable: earning.taxable,
          napsaPensionable: earning.napsaPensionable,
          nhimaApplicable: earning.nhimaApplicable,
          source: earning.source,
          createdAt: earning.createdAt,
        })),
        deductions: (line.deductions || []).map((deduction: any) => ({
          id: deduction.id,
          deductionType: deduction.deductionType,
          description: deduction.description,
          amount: toNumber(deduction.amount),
          source: deduction.source,
          createdAt: deduction.createdAt,
        })),
      })),
      approvals: (run.approvals || []).map((approval: any) => ({
        id: approval.id,
        stage: approval.approvalStage,
        role: approval.approverRole,
        approverId: approval.approverId || null,
        status: approval.status,
        comments: approval.comments || null,
        approvedAt: approval.approvedAt || null,
        createdAt: approval.createdAt,
      })),
    };
  }

  async exportPayrollAuditCsv(runId?: string) {
    const audit = await this.getPayrollAudit(runId);

    const rows = [
      [
        'Run Name',
        'Period',
        'Run Type',
        'Status',
        'Employee No.',
        'Employee Name',
        'Department',
        'Job Title',
        'Site',
        'Employment Type',
        'Gross Pay',
        'Deductions',
        'Net Pay',
        'Employer Cost',
        'Earnings Count',
        'Deductions Count',
        'Payslip Generated',
        'Payslip Status',
      ],
    ];

    for (const employee of audit.employees || []) {
      rows.push([
        audit.run?.runName || '-',
        audit.run?.periodName || '-',
        audit.run?.runType || '-',
        audit.run?.status || '-',
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
        String(employee.earningsCount),
        String(employee.deductionsCount),
        employee.payslipGenerated ? 'Yes' : 'No',
        employee.payslipStatus || '-',
      ]);
    }

    return rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  }

  async getExecutivePagePayload() {
    try {
      const dashboard = await this.getDashboardSummary();

      const latestLocked = dashboard.latestLockedPayroll;
      const recentRuns = dashboard.recentPayrollRuns || [];

      return {
        payloadType: 'EXECUTIVE_LEADERSHIP_PAGE',
        status: 'READY',
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
              totalPayslips: dashboard.summary.totalPayslips,
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
            data: latestLocked
              ? {
                  id: latestLocked.id,
                  runName: latestLocked.runName,
                  periodName: latestLocked.periodName,
                  runType: latestLocked.runType,
                  status: latestLocked.status,
                  lockedAt: latestLocked.lockedAt,
                  employeeCount: latestLocked.totals.employeeCount,
                  grossPay: money(latestLocked.totals.grossPay),
                  totalDeductions: money(latestLocked.totals.totalDeductions),
                  netPay: money(latestLocked.totals.netPay),
                  employerCost: money(latestLocked.totals.employerCost),
                }
              : null,
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
            data: recentRuns.map((run: any) => ({
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
    } catch (error: any) {
      return {
        payloadType: 'EXECUTIVE_LEADERSHIP_PAGE',
        status: 'ERROR',
        generatedAt: new Date(),
        sourceSystem: 'Southin PeoplePay',
        error: {
          message: error?.message || 'Failed to build executive page payload',
        },
        target: {
          siteName: 'Executive Leadership',
          recommendedPageName: 'PeoplePay Executive Dashboard',
          confidentiality: 'CONFIDENTIAL_EXECUTIVE',
          publishingMethod: 'CONTROLLED_JSON_PAYLOAD',
        },
        pageSections: [],
        securityRules: [
          'No SharePoint write operation was performed.',
          'Resolve API payload error before enabling Microsoft Graph publishing.',
        ],
      };
    }
  }

  async getPublicDashboardPayload() {
    try {
      const dashboard = await this.getDashboardSummary();
      const summary = dashboard.summary || {};
      const latestStatus = dashboard.latestLockedPayroll?.status || 'NO_LOCKED_PAYROLL';

      return {
        payloadType: 'PUBLIC_DASHBOARD_SUMMARY',
        status: 'READY',
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
          totalEmployees: Number(summary.totalEmployees || 0),
          activeEmployees: Number(summary.activeEmployees || 0),
          payrollProcessingStatus: latestStatus,
          lockedPayrollRuns: Number(summary.lockedPayrollRuns || 0),
          openPayrollRuns: Number(summary.openPayrollRuns || 0),
          lastUpdated: dashboard?.generatedAt || new Date(),
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
    } catch (error: any) {
      return {
        payloadType: 'PUBLIC_DASHBOARD_SUMMARY',
        status: 'ERROR',
        generatedAt: new Date(),
        sourceSystem: 'Southin PeoplePay',
        error: {
          message: error?.message || 'Failed to build public dashboard payload',
        },
        target: {
          siteName: 'Southin Public Dashboard',
          recommendedPageName: 'PeoplePay Public Summary',
          confidentiality: 'PUBLIC_SUMMARY_ONLY',
          publishingMethod: 'CONTROLLED_JSON_PAYLOAD',
        },
        publicSummary: {
          totalEmployees: 0,
          activeEmployees: 0,
          payrollProcessingStatus: 'PAYLOAD_ERROR',
          lockedPayrollRuns: 0,
          openPayrollRuns: 0,
          lastUpdated: new Date(),
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
          'No confidential payroll data is included in this error payload.',
          'Resolve API payload error before enabling Microsoft Graph publishing.',
        ],
      };
    }
  }

  async getFinanceAuditPayload(runId?: string) {
    try {
      const audit = await this.getPayrollAudit(runId);

      return {
        payloadType: 'FINANCE_PAYROLL_AUDIT_PACKAGE',
        status: 'READY',
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
    } catch (error: any) {
      return {
        payloadType: 'FINANCE_PAYROLL_AUDIT_PACKAGE',
        status: 'ERROR',
        generatedAt: new Date(),
        sourceSystem: 'Southin PeoplePay',
        error: {
          message: error?.message || 'Failed to build finance audit payload',
        },
        target: {
          siteName: 'Finance',
          recommendedLibraryName: 'Payroll Audit Reports',
          confidentiality: 'CONFIDENTIAL_FINANCE',
          publishingMethod: 'CONTROLLED_JSON_PAYLOAD',
        },
        auditPackage: null,
        recommendedFiles: [],
        financeControls: [
          'Resolve finance audit payload error before enabling Microsoft Graph publishing.',
        ],
      };
    }
  }

  async getSharePointExportPackage() {
    const executivePage = await this.getExecutivePagePayload();
    const publicDashboard = await this.getPublicDashboardPayload();
    const financeAudit = await this.getFinanceAuditPayload();

    return {
      payloadType: 'SOUTHIN_PEOPLEPAY_SHAREPOINT_EXPORT_PACKAGE',
      status: 'READY',
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
          status: executivePage.status || 'READY',
        },
        {
          siteName: 'Finance',
          purpose: 'Payroll audit reports and finance evidence',
          payloadEndpoint: '/api/executive/sharepoint/finance-audit-payload',
          status: financeAudit.status || 'READY',
        },
        {
          siteName: 'Human Resource',
          purpose: 'Employee master validation and payroll readiness tracking',
          payloadEndpoint: '/api/employees/payroll-readiness',
          status: 'READY',
        },
        {
          siteName: 'Southin Public Dashboard',
          purpose: 'Non-confidential employee and payroll processing status only',
          payloadEndpoint: '/api/executive/sharepoint/public-dashboard-payload',
          status: publicDashboard.status || 'READY',
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
    const targetSite = body?.targetSite || 'Unknown SharePoint Site';
    const targetPage = body?.targetPage || null;
    const targetLibrary = body?.targetLibrary || null;
    const payloadEndpoint = body?.payloadEndpoint || '/api/executive/sharepoint/export-package';
    const requestedBy = body?.requestedBy || 'dev-admin';

    const graphResult = await this.sharePointGraphService.publish({
      targetKey: body?.targetKey,
      targetSite,
      targetPage,
      targetLibrary,
      payloadEndpoint,
      payloadType: body?.payloadType || null,
      confidentiality: body?.confidentiality || null,
      requestedBy,
      payload: body,
    });

    const log = await this.prisma.sharePointExportLog.create({
      data: {
        targetSite,
        targetPage,
        targetLibrary,
        payloadEndpoint,
        payloadType: body?.payloadType || null,
        confidentiality: body?.confidentiality || null,
        requestedBy,
        graphEnabled: Boolean(graphResult.graphEnabled),
        graphStatus: graphResult.graphStatus as any,
        requestPayload: body || {},
        responsePayload: graphResult || {},
        errorMessage:
          graphResult.graphStatus === 'FAILED'
            ? graphResult.message || 'SharePoint Graph publishing failed'
            : null,
      },
    });

    return {
      message: graphResult.message,
      graphAutomationStatus: graphResult.graphStatus,
      receivedAt: log.createdAt,
      exportLogId: log.id,
      receivedPayload: body,
      graphResult,
      nextStep:
        'Enable Microsoft Graph only after Azure App Registration, permissions, site IDs, and library IDs are configured.',
    };
  }

  async getSharePointExportLogs() {
    const logs = await this.prisma.sharePointExportLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      generatedAt: new Date(),
      totalReturned: logs.length,
      logs,
    };
  }

  async getSharePointExportLog(id: string) {
    const log = await this.prisma.sharePointExportLog.findUnique({
      where: { id },
    });

    if (!log) {
      throw new NotFoundException('SharePoint export log not found');
    }

    return {
      generatedAt: new Date(),
      log,
    };
  }

  getSharePointGraphStatus() {
    return this.sharePointGraphService.getStatus();
  }

  getSharePointGraphTargets() {
    return this.sharePointGraphService.getTargets();
  }

  validateSharePointTarget(body: any) {
    return this.sharePointGraphService.validateTarget(body);
  }

  getSharePointSetupGuide() {
    const graphStatus = this.sharePointGraphService.getStatus();
    const targets = this.sharePointGraphService.getTargets();

    return {
      generatedAt: new Date(),
      title: 'Southin PeoplePay Microsoft Graph Setup Guide',
      currentMode: graphStatus.mode,
      graphEnabled: graphStatus.graphEnabled,
      readyForGraphWrites: graphStatus.readyForGraphWrites,
      message: graphStatus.message,
      setupPhases: [
        {
          phase: 1,
          name: 'Create Azure App Registration',
          status: graphStatus.requiredConfig.AZURE_TENANT_ID ? 'DONE_OR_PARTIAL' : 'PENDING',
          actions: [
            'Go to Microsoft Entra admin center.',
            'Create a new App Registration for Southin PeoplePay.',
            'Record Tenant ID, Client ID, and create a Client Secret.',
            'Do not enable SHAREPOINT_GRAPH_ENABLED=true yet.',
          ],
          envKeys: ['AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET'],
        },
        {
          phase: 2,
          name: 'Grant Microsoft Graph Permissions',
          status: 'PENDING',
          actions: [
            'Add Microsoft Graph Application permissions.',
            'Recommended initial permissions: Sites.Read.All for discovery.',
            'Later add Sites.ReadWrite.All only when publishing is ready.',
            'Grant admin consent using a Global Admin account.',
          ],
          warning:
            'Do not give write permissions until payloads, logs, and target IDs are fully validated.',
        },
        {
          phase: 3,
          name: 'Resolve SharePoint Site IDs',
          status:
            targets.targets.every((target: any) => target.configured?.siteId) === true
              ? 'DONE'
              : 'PENDING',
          actions: [
            'Resolve the Executive Leadership site ID.',
            'Resolve the Finance site ID.',
            'Resolve the Human Resource site ID.',
            'Resolve the Southin Public Dashboard site ID.',
            'Store the IDs in .env.',
          ],
          envKeys: [
            'SHAREPOINT_EXECUTIVE_SITE_ID',
            'SHAREPOINT_FINANCE_SITE_ID',
            'SHAREPOINT_HR_SITE_ID',
            'SHAREPOINT_PUBLIC_DASHBOARD_SITE_ID',
          ],
        },
        {
          phase: 4,
          name: 'Resolve SharePoint Page/List/Drive IDs',
          status:
            targets.targets.every((target: any) => {
              const siteReady = Boolean(target.configured?.siteId);
              const driveReady =
                target.configured?.driveId === null ? true : Boolean(target.configured?.driveId);
              const listReady =
                target.configured?.listId === null ? true : Boolean(target.configured?.listId);

              return siteReady && driveReady && listReady;
            }) === true
              ? 'DONE'
              : 'PENDING',
          actions: [
            'Resolve Executive Leadership Site Pages list ID.',
            'Resolve Southin Public Dashboard Site Pages list ID.',
            'Resolve Finance Payroll Audit Reports document library drive ID.',
            'Store the IDs in .env.',
          ],
          envKeys: [
            'SHAREPOINT_EXECUTIVE_PAGE_LIST_ID',
            'SHAREPOINT_PUBLIC_PAGE_LIST_ID',
            'SHAREPOINT_FINANCE_AUDIT_DRIVE_ID',
          ],
        },
        {
          phase: 5,
          name: 'Enable Controlled Graph Publishing',
          status: graphStatus.readyForGraphWrites ? 'READY_TO_TEST' : 'BLOCKED',
          actions: [
            'Confirm export logs are working.',
            'Confirm all payloads show READY.',
            'Confirm target IDs are configured.',
            'Only then set SHAREPOINT_GRAPH_ENABLED=true.',
            'Test with one non-critical payload first.',
          ],
          warning:
            'Do not enable live Graph publishing until Executive, Finance, HR, and Public data separation is confirmed.',
        },
      ],
      envTemplate: {
        SHAREPOINT_GRAPH_ENABLED: 'false',
        AZURE_TENANT_ID: '',
        AZURE_CLIENT_ID: '',
        AZURE_CLIENT_SECRET: '',
        SHAREPOINT_EXECUTIVE_SITE_ID: '',
        SHAREPOINT_EXECUTIVE_PAGE_LIST_ID: '',
        SHAREPOINT_FINANCE_SITE_ID: '',
        SHAREPOINT_FINANCE_AUDIT_DRIVE_ID: '',
        SHAREPOINT_HR_SITE_ID: '',
        SHAREPOINT_PUBLIC_DASHBOARD_SITE_ID: '',
        SHAREPOINT_PUBLIC_PAGE_LIST_ID: '',
      },
      targets: targets.targets,
      missingConfig: graphStatus.missingConfig,
      safetyRules: [
        'Keep SHAREPOINT_GRAPH_ENABLED=false until all IDs and permissions are confirmed.',
        'Public dashboard must never contain pay values, employee names, NRC, bank details, or payslip details.',
        'Finance audit exports must stay in the Finance site or Executive Leadership site only.',
        'Every export attempt must be recorded in SharePointExportLog.',
        'Graph publishing must fail closed if any required ID is missing.',
      ],
    };
}

  getSharePointDiscoveryGuide() {
    const graphStatus = this.sharePointGraphService.getStatus();
    const targets = this.sharePointGraphService.getTargets();

    return {
      generatedAt: new Date(),
      title: 'SharePoint Graph Discovery Guide',
      graphEnabled: graphStatus.graphEnabled,
      mode: graphStatus.mode,
      message:
        'This discovery guide prepares the API for Microsoft Graph site/list/drive ID resolution. In dev mode, no Microsoft Graph request is made.',
      tenantHost: 'southingcontracting.sharepoint.com',
      discoverySteps: [
        {
          step: 1,
          name: 'Confirm SharePoint tenant host',
          example: 'southingcontracting.sharepoint.com',
          requiredFor: ['All SharePoint discovery requests'],
        },
        {
          step: 2,
          name: 'Resolve site ID by site path',
          graphTemplate:
            'GET https://graph.microsoft.com/v1.0/sites/{tenantHost}:/sites/{sitePath}',
          examples: [
            '/sites/ExecutiveLeadership',
            '/sites/Finance',
            '/sites/HumanResource',
            '/sites/SouthinPublicDashboard',
          ],
        },
        {
          step: 3,
          name: 'Resolve document libraries / drives',
          graphTemplate: 'GET https://graph.microsoft.com/v1.0/sites/{siteId}/drives',
          requiredFor: ['Finance Payroll Audit Reports document library'],
        },
        {
          step: 4,
          name: 'Resolve site pages list',
          graphTemplate: 'GET https://graph.microsoft.com/v1.0/sites/{siteId}/lists',
          requiredFor: [
            'Executive Leadership PeoplePay Executive Dashboard page',
            'Southin Public Dashboard PeoplePay Public Summary page',
          ],
        },
        {
          step: 5,
          name: 'Store resolved IDs in .env',
          envKeys: [
            'SHAREPOINT_EXECUTIVE_SITE_ID',
            'SHAREPOINT_EXECUTIVE_PAGE_LIST_ID',
            'SHAREPOINT_FINANCE_SITE_ID',
            'SHAREPOINT_FINANCE_AUDIT_DRIVE_ID',
            'SHAREPOINT_HR_SITE_ID',
            'SHAREPOINT_PUBLIC_DASHBOARD_SITE_ID',
            'SHAREPOINT_PUBLIC_PAGE_LIST_ID',
          ],
        },
      ],
      targets: targets.targets,
      safetyRules: [
        'Discovery must begin with read-only Microsoft Graph permissions.',
        'Do not enable Sites.ReadWrite.All until write payloads have been validated.',
        'Do not publish public payroll values to Southin Public Dashboard.',
        'Keep SHAREPOINT_GRAPH_ENABLED=false until IDs are confirmed.',
      ],
    };
  }

  getSharePointDiscoveryPreview(body: any) {
    const tenantHost = body?.tenantHost || 'southingcontracting.sharepoint.com';
    const targetKey = body?.targetKey || null;
    const sitePath = body?.sitePath || null;
    const siteId = body?.siteId || null;

    const validation = this.sharePointGraphService.validateTarget({
      targetKey,
      targetSite: body?.targetSite,
      payloadEndpoint: body?.payloadEndpoint,
    });

    const graphEnabled = String(process.env.SHAREPOINT_GRAPH_ENABLED || 'false').toLowerCase() === 'true';

    return {
      generatedAt: new Date(),
      mode: graphEnabled ? 'GRAPH_ENABLED' : 'DISABLED_DEV_MODE',
      graphRequestPerformed: false,
      message:
        'Discovery preview generated only. No Microsoft Graph request was made in this phase.',
      input: {
        tenantHost,
        targetKey,
        sitePath,
        siteId,
      },
      targetValidation: validation,
      previewUrls: {
        resolveSiteId: sitePath
          ? `https://graph.microsoft.com/v1.0/sites/${tenantHost}:/sites/${sitePath.replace(/^\/?sites\//, '')}`
          : null,
        listDrives: siteId ? `https://graph.microsoft.com/v1.0/sites/${siteId}/drives` : null,
        listLists: siteId ? `https://graph.microsoft.com/v1.0/sites/${siteId}/lists` : null,
        sitePagesHint: siteId
          ? `Use /sites/${siteId}/lists and identify the Site Pages list for page publishing.`
          : null,
      },
      requiredNextStep:
        'After Azure App Registration is ready, replace this preview with real Microsoft Graph discovery calls using application permissions.',
    };
  }
}