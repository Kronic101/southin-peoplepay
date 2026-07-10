import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

type StaffRole =
  | 'ADMIN'
  | 'DIRECTOR'
  | 'FINANCE_MANAGER'
  | 'FINANCE_OFFICER'
  | 'HR_MANAGER'
  | 'HR_OFFICER'
  | 'LINE_MANAGER'
  | 'SUPERVISOR'
  | 'ASSET_MANAGER'
  | 'ASSET_OFFICER'
  | 'FLEET_MANAGER'
  | 'FLEET_DISPATCH_OFFICER'
  | 'PAYROLL_OFFICER'
  | 'PROCUREMENT_OFFICER'
  | 'STORES_OFFICER'
  | 'AUDITOR';

function normaliseRole(value: unknown): StaffRole {
  const role = String(value || '')
    .trim()
    .toUpperCase()
    .replaceAll(' ', '_')
    .replaceAll('-', '_');

  if (role === 'HR') return 'HR_MANAGER';
  if (role === 'PAYROLL') return 'PAYROLL_OFFICER';
  if (role === 'FINANCE') return 'FINANCE_MANAGER';
  if (role === 'STORES') return 'STORES_OFFICER';
  if (role === 'PROCUREMENT') return 'PROCUREMENT_OFFICER';
  if (role === 'ASSET') return 'ASSET_MANAGER';
  if (role === 'FLEET') return 'FLEET_MANAGER';

  return (role || 'ADMIN') as StaffRole;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma as any;
  }

  private async safeCount(modelName: string, where?: any) {
    try {
      const model = this.db()[modelName];

      if (!model?.count) {
        return 0;
      }

      return await model.count(where ? { where } : undefined);
    } catch {
      return 0;
    }
  }

  private async safeNumberQuery(sql: string) {
    try {
      const rows = await this.prisma.$queryRawUnsafe<any[]>(sql);
      return Number(rows?.[0]?.value || 0);
    } catch {
      return 0;
    }
  }

  async summary(roleValue: string, email: string | null) {
    const role = normaliseRole(roleValue);

    const [
      employees,
      activeEmployees,
      draftEmployees,
      approvalRequests,
      pendingApprovals,
      payrollRuns,
      payslips,
      leaveRequests,
      pendingLeave,
      overtimeRequests,
      timesheets,
      stockItems,
      stockLocations,
      quantityOnHand,
      scaffoldComponents,
      hubAssets,
      storesRequisitions,
      pendingStoresRequisitions,
      procurementRequests,
      pendingProcurementRequests,
      fleetVehicles,
    ] = await Promise.all([
      this.safeCount('employee'),
      this.safeCount('employee', { status: 'ACTIVE' }),
      this.safeCount('employee', { status: 'DRAFT' }),

      this.safeCount('approvalRequest'),
      this.safeCount('approvalRequest', {
        status: {
          in: ['SUBMITTED', 'IN_REVIEW', 'PENDING', 'PENDING_APPROVAL'],
        },
      }),

      this.safeCount('payrollRun'),
      this.safeCount('payslip'),

      this.safeCount('leaveRequest'),
      this.safeCount('leaveRequest', {
        status: {
          in: ['PENDING', 'PENDING_SUPERVISOR', 'SUBMITTED'],
        },
      }),

      this.safeCount('overtimeRequest'),
      this.safeCount('timesheet'),

      this.safeCount('stockItem'),
      this.safeCount('stockLocation'),
      this.safeNumberQuery(
        `select coalesce(sum("quantityOnHand"), 0)::text as value from stock_balances`,
      ),

      this.safeCount('scaffoldComponent'),
      this.safeCount('hubAsset'),

      this.safeCount('storesRequisition'),
      this.safeCount('storesRequisition', {
        status: {
          in: ['SUBMITTED', 'IN_REVIEW', 'PENDING_APPROVAL', 'APPROVER_NOT_CONFIGURED'],
        },
      }),

      this.safeCount('procurementRequest'),
      this.safeCount('procurementRequest', {
        status: {
          in: ['SUBMITTED', 'IN_REVIEW', 'PENDING_APPROVAL', 'PENDING'],
        },
      }),

      this.safeCount('fleetVehicle'),
    ]);

    const commonMetrics = [
      {
        label: 'Pending approvals',
        value: pendingApprovals,
        helper: 'Items waiting for workflow action',
      },
      {
        label: 'Active employees',
        value: activeEmployees,
        helper: `${draftEmployees} draft profile(s) still need cleanup`,
      },
    ];

    const roleMetrics: Record<string, any[]> = {
      ADMIN: [
        { label: 'Employees', value: employees, helper: 'Total employee profiles' },
        { label: 'Stock items', value: stockItems, helper: 'Imported stock master records' },
        { label: 'Qty on hand', value: quantityOnHand.toLocaleString(), helper: 'Opening stock balance' },
        { label: 'Scaffold components', value: scaffoldComponents.toLocaleString(), helper: 'Individual scaffold parts' },
        { label: 'Assets / fleet', value: hubAssets + fleetVehicles, helper: 'Imported asset and fleet records' },
        { label: 'Stores requests', value: storesRequisitions, helper: `${pendingStoresRequisitions} pending` },
      ],

      HR_MANAGER: [
        { label: 'Employees', value: employees, helper: 'Employee register' },
        { label: 'Active employees', value: activeEmployees, helper: 'Payroll active profiles' },
        { label: 'Leave requests', value: leaveRequests, helper: `${pendingLeave} pending` },
        { label: 'Timesheets', value: timesheets, helper: 'Time records for payroll' },
      ],

      HR_OFFICER: [
        { label: 'Employees', value: employees, helper: 'Employee register' },
        { label: 'Draft employees', value: draftEmployees, helper: 'Profiles requiring completion' },
        { label: 'Leave requests', value: leaveRequests, helper: `${pendingLeave} pending` },
        { label: 'Timesheets', value: timesheets, helper: 'Time records for payroll' },
      ],

      PAYROLL_OFFICER: [
        { label: 'Payroll runs', value: payrollRuns, helper: 'Payroll processing records' },
        { label: 'Payslips', value: payslips, helper: 'Generated payslips' },
        { label: 'Timesheets', value: timesheets, helper: 'Payroll time source' },
        { label: 'Overtime records', value: overtimeRequests, helper: 'Overtime requiring payroll control' },
      ],

      FINANCE_MANAGER: [
        { label: 'Pending approvals', value: pendingApprovals, helper: 'Finance and payment approvals' },
        { label: 'Procurement requests', value: procurementRequests, helper: `${pendingProcurementRequests} pending` },
        { label: 'Payroll runs', value: payrollRuns, helper: 'Payroll finance review' },
        { label: 'Assets', value: hubAssets, helper: 'Asset register records' },
      ],

      FINANCE_OFFICER: [
        { label: 'Procurement requests', value: procurementRequests, helper: `${pendingProcurementRequests} pending` },
        { label: 'Payroll runs', value: payrollRuns, helper: 'Payment preparation source' },
        { label: 'Payslips', value: payslips, helper: 'Payment evidence source' },
        { label: 'Assets', value: hubAssets, helper: 'Finance asset records' },
      ],

      DIRECTOR: [
        { label: 'Pending approvals', value: pendingApprovals, helper: 'Final approval queue' },
        { label: 'Employees', value: employees, helper: 'Total staff records' },
        { label: 'Payroll runs', value: payrollRuns, helper: 'Payroll approval status' },
        { label: 'Stock quantity', value: quantityOnHand.toLocaleString(), helper: 'Imported ex-stock' },
        { label: 'Assets / fleet', value: hubAssets + fleetVehicles, helper: 'Operational assets' },
      ],

      STORES_OFFICER: [
        { label: 'Stock items', value: stockItems, helper: 'Stock master' },
        { label: 'Stock locations', value: stockLocations, helper: 'Stores, containers, yards, quarantine' },
        { label: 'Qty on hand', value: quantityOnHand.toLocaleString(), helper: 'Opening ex-stock balance' },
        { label: 'Stores requests', value: storesRequisitions, helper: `${pendingStoresRequisitions} pending` },
      ],

      PROCUREMENT_OFFICER: [
        { label: 'Procurement requests', value: procurementRequests, helper: `${pendingProcurementRequests} pending` },
        { label: 'Stores requests', value: storesRequisitions, helper: `${pendingStoresRequisitions} pending` },
        { label: 'Stock items', value: stockItems, helper: 'Available stock master' },
        { label: 'Pending approvals', value: pendingApprovals, helper: 'Workflow queue' },
      ],

      ASSET_MANAGER: [
        { label: 'Assets', value: hubAssets, helper: 'Asset register' },
        { label: 'Scaffold components', value: scaffoldComponents.toLocaleString(), helper: 'Scaffold part register' },
        { label: 'Stock locations', value: stockLocations, helper: 'Custody locations' },
        { label: 'Stock quantity', value: quantityOnHand.toLocaleString(), helper: 'Available stock' },
      ],

      ASSET_OFFICER: [
        { label: 'Assets', value: hubAssets, helper: 'Asset register' },
        { label: 'Scaffold components', value: scaffoldComponents.toLocaleString(), helper: 'Scaffold part register' },
        { label: 'Stock locations', value: stockLocations, helper: 'Custody locations' },
        { label: 'Stores requests', value: storesRequisitions, helper: 'Stores movement source' },
      ],

      FLEET_MANAGER: [
        { label: 'Fleet records', value: fleetVehicles || hubAssets, helper: 'Vehicles and fleet assets' },
        { label: 'Assets', value: hubAssets, helper: 'Asset register' },
        { label: 'Pending approvals', value: pendingApprovals, helper: 'Fleet workflow queue' },
        { label: 'Stores requests', value: storesRequisitions, helper: 'Fleet spares and requests' },
      ],

      FLEET_DISPATCH_OFFICER: [
        { label: 'Fleet records', value: fleetVehicles || hubAssets, helper: 'Vehicles and fleet assets' },
        { label: 'Pending approvals', value: pendingApprovals, helper: 'Dispatch workflow queue' },
        { label: 'Stores requests', value: storesRequisitions, helper: 'Fleet spares and requests' },
      ],

      LINE_MANAGER: [
        { label: 'Leave requests', value: leaveRequests, helper: `${pendingLeave} pending` },
        { label: 'Timesheets', value: timesheets, helper: 'Site time records' },
        { label: 'Overtime records', value: overtimeRequests, helper: 'Site overtime control' },
        { label: 'Pending approvals', value: pendingApprovals, helper: 'Your approval queue' },
      ],

      SUPERVISOR: [
        { label: 'Leave requests', value: leaveRequests, helper: `${pendingLeave} pending` },
        { label: 'Timesheets', value: timesheets, helper: 'Site time records' },
        { label: 'Overtime records', value: overtimeRequests, helper: 'Site overtime control' },
        { label: 'Pending approvals', value: pendingApprovals, helper: 'Your approval queue' },
      ],

      AUDITOR: [
        { label: 'Employees', value: employees, helper: 'Employee records' },
        { label: 'Payroll runs', value: payrollRuns, helper: 'Payroll audit records' },
        { label: 'Payslips', value: payslips, helper: 'Generated payroll evidence' },
        { label: 'Assets', value: hubAssets, helper: 'Asset audit records' },
      ],
    };

    const sections = this.getRoleSections(role);

    return {
      generatedAt: new Date().toISOString(),
      user: {
        email,
        role,
      },
      metrics: roleMetrics[role] || commonMetrics,
      sections,
    };
  }

  private getRoleSections(role: StaffRole) {
    const sections: Record<string, any[]> = {
      ADMIN: [
        {
          title: 'Control Centre',
          description: 'Full system access for rollout monitoring and support.',
          links: [
            { label: 'Employees', href: '/employees' },
            { label: 'Stores Dashboard', href: '/stores' },
            { label: 'Approval Inbox', href: '/approvals/inbox' },
            { label: 'Procurement Tracker', href: '/finance/procurement-tracker' },
            { label: 'Payroll Runs', href: '/payroll/runs' },
            { label: 'Asset Dashboard', href: '/assets/dashboard' },
          ],
        },
      ],

      HR_MANAGER: [
        {
          title: 'HR Workbench',
          description: 'Employee records, leave, payroll readiness, and people operations.',
          links: [
            { label: 'Employees', href: '/employees' },
            { label: 'Leave Dashboard', href: '/hr/leave-dashboard' },
            { label: 'Payroll Readiness', href: '/hr/payroll-readiness' },
            { label: 'Attendance', href: '/attendance' },
            { label: 'Timesheets', href: '/timesheets' },
          ],
        },
      ],

      PAYROLL_OFFICER: [
        {
          title: 'Payroll Workbench',
          description: 'Payroll preparation, statutory review, and approved time inputs.',
          links: [
            { label: 'Payroll', href: '/payroll' },
            { label: 'Payroll Runs', href: '/payroll/runs' },
            { label: 'Timesheets', href: '/timesheets' },
            { label: 'Overtime', href: '/overtime' },
            { label: 'Statutory', href: '/statutory' },
          ],
        },
      ],

      FINANCE_MANAGER: [
        {
          title: 'Finance Workbench',
          description: 'Approvals, procurement, payment preparation, and audit evidence.',
          links: [
            { label: 'Finance Dashboard', href: '/finance/dashboard' },
            { label: 'Procurement Tracker', href: '/finance/procurement-tracker' },
            { label: 'Approval Inbox', href: '/approvals/inbox' },
            { label: 'Payment Batches', href: '/reports/payment-batches' },
            { label: 'Finance Evidence', href: '/finance/approval-evidence' },
          ],
        },
      ],

      DIRECTOR: [
        {
          title: 'Executive Workbench',
          description: 'Final approvals and executive summaries across HR, Payroll, Stores, Assets, and Finance.',
          links: [
            { label: 'Executive Dashboard', href: '/executive/dashboard' },
            { label: 'Approval Inbox', href: '/approvals/inbox' },
            { label: 'Finance Reports', href: '/finance/reports' },
            { label: 'Stores Dashboard', href: '/stores' },
            { label: 'Reports Centre', href: '/reports' },
          ],
        },
      ],

      STORES_OFFICER: [
        {
          title: 'Stores Workbench',
          description: 'Stock, ex-stock balances, requisitions, locations, and stores issue controls.',
          links: [
            { label: 'Stores Dashboard', href: '/stores' },
            { label: 'Stores Requisitions', href: '/stores/requisitions' },
            { label: 'New Stores Requisition', href: '/stores/requisitions/new' },
            { label: 'Stores & Stock', href: '/assets/stock' },
            { label: 'Stock Movements', href: '/assets/movements' },
          ],
        },
      ],

      PROCUREMENT_OFFICER: [
        {
          title: 'Procurement Workbench',
          description: 'Procurement requests, stores requests, and approval tracking.',
          links: [
            { label: 'Procurement Tracker', href: '/finance/procurement-tracker' },
            { label: 'Stores Requisitions', href: '/stores/requisitions' },
            { label: 'Approval Inbox', href: '/approvals/inbox' },
          ],
        },
      ],

      ASSET_MANAGER: [
        {
          title: 'Asset Workbench',
          description: 'Assets, scaffolds, custody, stock movements, and deployment tracking.',
          links: [
            { label: 'Asset Dashboard', href: '/assets/dashboard' },
            { label: 'Scaffolds', href: '/assets/scaffolds' },
            { label: 'Custody', href: '/assets/custody' },
            { label: 'Stock Movements', href: '/assets/movements' },
            { label: 'QR Scan Centre', href: '/assets/qr-scan' },
          ],
        },
      ],

      FLEET_MANAGER: [
        {
          title: 'Fleet Workbench',
          description: 'Fleet register, fuel, trips, defects, and workshop tracking.',
          links: [
            { label: 'Fleet Dashboard', href: '/fleet/dashboard' },
            { label: 'Vehicle Register', href: '/fleet/vehicles' },
            { label: 'Fuel Logs', href: '/fleet/fuel' },
            { label: 'Trips', href: '/fleet/trips' },
            { label: 'Workshop', href: '/fleet/workshop' },
          ],
        },
      ],

      LINE_MANAGER: [
        {
          title: 'Site Manager Workbench',
          description: 'Site attendance, leave, timesheets, overtime, and approval queue.',
          links: [
            { label: 'Approval Inbox', href: '/approvals/inbox' },
            { label: 'Attendance', href: '/attendance' },
            { label: 'Leave', href: '/leave' },
            { label: 'Timesheets', href: '/timesheets' },
            { label: 'Overtime', href: '/overtime' },
          ],
        },
      ],
    };

    if (role === 'SUPERVISOR') return sections.LINE_MANAGER;
    if (role === 'HR_OFFICER') return sections.HR_MANAGER;
    if (role === 'FINANCE_OFFICER') return sections.FINANCE_MANAGER;
    if (role === 'ASSET_OFFICER') return sections.ASSET_MANAGER;
    if (role === 'FLEET_DISPATCH_OFFICER') return sections.FLEET_MANAGER;
    if (role === 'AUDITOR') return sections.DIRECTOR;

    return sections[role] || sections.ADMIN;
  }

  executivePlaceholder() {
    return {
      title: 'Southin PeoplePay Executive Dashboard',
      metrics: {
        activeEmployees: 0,
        casualWorkers: 0,
        grossPayroll: 0,
        netPayroll: 0,
        statutoryPayable: 0,
        payrollStatus: 'Not Started',
      },
    };
  }
}