import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { ApprovalWorkflowService } from '../approvals/approval-workflow.service'; 

function clean(value: unknown) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asDate(value: unknown, fieldName: string) {
  const date = new Date(clean(value));
  if (Number.isNaN(date.getTime())) { 
    throw new BadRequestException(`${fieldName} is required.`);
  }
  return date;
}

function approvalRequestIdFrom(workflow: any) {
  return (
    workflow?.approvalRequest?.id ||
    workflow?.approvalRequestId ||
    workflow?.id ||
    null
  );
}

@Injectable()
export class PeopleOpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approvalWorkflowService: ApprovalWorkflowService,
  ) {}

  private db() {
    return this.prisma as any;
  }

  private async nextRef(prefix: string, modelName: string, fieldName: string) {
    const year = new Date().getFullYear();
    const count = await this.db()[modelName].count();
    return `${prefix}-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  private async getEmployee(employeeIdentifier: string) {
    const value = clean(employeeIdentifier);

    if (!value) {
      throw new BadRequestException('Employee is required.');
    }

    const employee = await this.db().employee.findFirst({
      where: {
        OR: [
          { id: value },
          { employeeNumber: value },
        ],
      },
      include: {
        department: true,
        jobTitle: true,
        employmentType: true,
        site: true,
      },
    });

    if (!employee) {
      throw new BadRequestException(
        `Selected employee does not exist for identifier: ${value}`,
      );
    }

    return employee;
  }

  private employeeName(employee: any) {
    return (
      employee.name ||
      `${employee.firstName || ''} ${employee.lastName || ''}`.trim() ||
      employee.employeeNumber ||
      'Employee'
    );
  }

  private decimalNumber(value: any) {
    const parsed = Number(value?.toString?.() ?? value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private async startPeopleOpsApproval(input: {
    workflowType:
      | 'LEAVE_REQUEST'
      | 'OVERTIME_REQUEST'
      | 'TIMESHEET_APPROVAL'
      | 'PEOPLE_ATTENDANCE_REVIEW';
    sourceType: string;
    sourceId: string;
    requestNo: string;
    title: string;
    description: string;
    requestedBy: string;
    requestedByEmail: string | null;
    employee: any;
    siteName: string | null;
    branch?: string | null;
    amount?: any;
    payload: any;
  }) {
    return this.approvalWorkflowService.startWorkflowSafe({
      module: 'PEOPLE_OPERATIONS' as any,
      workflowType: input.workflowType as any,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      requestNo: input.requestNo,
      title: input.title,
      description: input.description,
      requestedBy: input.requestedBy,
      requestedByEmail: input.requestedByEmail,
      requesterRole: 'PEOPLE_OPERATIONS_REQUESTER',
      department: input.employee?.department?.name || null,
      departmentId: input.employee?.departmentId || null,
      site: input.siteName || null,
      branch: input.branch || null,
      amount: this.decimalNumber(input.amount),
      currency: 'ZMW',
      payload: {
        ...input.payload,
        employeeNumber: input.employee?.employeeNumber || null,
        employeeName: this.employeeName(input.employee),
        department: input.employee?.department?.name || null,
        jobTitle: input.employee?.jobTitle?.name || null,
        employmentType: input.employee?.employmentType?.name || null,
      },
    });
  }

  async createAttendance(body: any) {
    const employee = await this.getEmployee(clean(body.employeeId));

    const attendanceNo = await this.nextRef(
      'ATT',
      'attendanceRecord',
      'attendanceNo',
    );

    return this.db().attendanceRecord.create({
      data: {
        attendanceNo,
        employeeId: employee.id,
        employeeNumber: employee.employeeNumber,
        employeeName: this.employeeName(employee),
        siteId: clean(body.siteId) || employee.siteId || null,
        siteName: clean(body.siteName) || employee.siteName || employee.site?.name || null,
        siteManagerName: clean(body.siteManagerName) || null,
        siteManagerEmail: clean(body.siteManagerEmail) || null,
        attendanceDate: asDate(body.attendanceDate, 'Attendance date'),
        shift: clean(body.shift) || null,
        status: clean(body.status) || 'CAPTURED',
        notes: clean(body.notes) || null,
        capturedBy: clean(body.capturedBy) || 'Staff user',
        capturedByEmail: clean(body.capturedByEmail) || null,
      },
    });
  }

  async createTimesheet(body: any) {
    const employee = await this.getEmployee(clean(body.employeeId));

    const timesheetNo = await this.nextRef(
      'TSH',
      'timesheetRecord',
      'timesheetNo',
    );

    const branch =
    clean(body.branch) ||
    clean(body.siteBranch) ||
    clean(employee.branch) ||
    clean(employee.site?.branch) ||
    null;

    const timesheet = await this.db().timesheetRecord.create({
      data: {
        timesheetNo,
        employeeId: employee.id,
        employeeNumber: employee.employeeNumber,
        employeeName: this.employeeName(employee),
        siteId: clean(body.siteId) || employee.siteId || null,
        siteName: clean(body.siteName) || employee.siteName || employee.site?.name || null,
        siteManagerName: clean(body.siteManagerName) || null,
        siteManagerEmail: clean(body.siteManagerEmail) || null,
        periodStart: asDate(body.periodStart, 'Period start'),
        periodEnd: asDate(body.periodEnd, 'Period end'),
        normalHours: new Prisma.Decimal(asNumber(body.normalHours)),
        overtimeHours: new Prisma.Decimal(asNumber(body.overtimeHours)),
        status: 'SUBMITTED',
        notes: clean(body.notes) || null,
        submittedBy: clean(body.submittedBy) || 'Staff user',
        submittedByEmail: clean(body.submittedByEmail) || null,
      },
    });

    const totalHours =
      this.decimalNumber(timesheet.normalHours) +
      this.decimalNumber(timesheet.overtimeHours);

    const approvalWorkflow: any = await this.startPeopleOpsApproval({
      workflowType: 'TIMESHEET_APPROVAL',
      sourceType: 'TIMESHEET',
      sourceId: timesheet.id,
      requestNo: timesheet.timesheetNo,
      title: `Timesheet approval - ${timesheet.timesheetNo}`,
      description: `Timesheet for ${timesheet.employeeName}`,
      requestedBy: timesheet.submittedBy || 'Staff user',
      requestedByEmail: timesheet.submittedByEmail || null,
      employee,
      siteName: timesheet.siteName || null,
      amount: 0,
      payload: {
        ...timesheet,
        totalHours,
      },
    });

    return {
      ...timesheet,
      approvalWorkflow,
    };
  }

  async createLeaveRequest(body: any) {
    const employee = await this.getEmployee(clean(body.employeeId));

    const managerEmail = clean(body.siteManagerEmail);

    if (!managerEmail) {
      throw new BadRequestException(
        'This employee/site has no responsible manager email configured.',
      );
    }

    const branch =
      clean(body.branch) ||
      clean(body.siteBranch) ||
      clean(employee.branch) ||
      clean(employee.site?.branch) ||
      null;

    const leave = await this.db().leaveRequest.create({
      data: {
        employeeId: employee.id,
        leaveType: clean(body.leaveType) || 'ANNUAL',
        startDate: asDate(body.startDate, 'Start date'),
        endDate: asDate(body.endDate, 'End date'),
        totalDays: Math.max(
          1,
          Math.round(asNumber(body.totalDays || body.requestedDays || 1)),
        ),
        reason: clean(body.reason) || null,
        siteId: clean(body.siteId) || employee.siteId || null,
        siteName: clean(body.siteName) || employee.siteName || employee.site?.name || null,
        siteManagerName: clean(body.siteManagerName) || null,
        siteManagerEmail: managerEmail,
        supervisorName: clean(body.siteManagerName) || null,
        supervisorEmail: managerEmail,
        status: 'PENDING_SUPERVISOR',
      },
    });

    const leaveNo = leave.leaveNo || leave.requestNo || `LEAVE-${leave.id}`;

    const approvalWorkflow: any = await this.startPeopleOpsApproval({
      workflowType: 'LEAVE_REQUEST',
      sourceType: 'LEAVE_REQUEST',
      sourceId: leave.id,
      requestNo: leaveNo,
      title: `Leave approval - ${leaveNo}`,
      description: leave.reason || `${leave.leaveType} leave request`,
      requestedBy: clean(body.submittedBy) || this.employeeName(employee),
      requestedByEmail: clean(body.submittedByEmail) || null,
      employee,
      siteName: leave.siteName || null,
      branch,
      amount: 0,
      payload: {
        ...leave,
        branch,
        leaveNo,
        employeeNumber: employee.employeeNumber,
        employeeName: this.employeeName(employee),
        siteManagerName: leave.siteManagerName,
        siteManagerEmail: leave.siteManagerEmail,
        leaveType: leave.leaveType,
        startDate: leave.startDate,
        endDate: leave.endDate,
        totalDays: leave.totalDays,
        reason: leave.reason,
      },
    });

    const approvalRequestId = approvalRequestIdFrom(approvalWorkflow);

    const updatedLeave = await this.db().leaveRequest.update({
      where: { id: leave.id },
      data: {
        approvalRequestId,
        status: 'PENDING_SUPERVISOR',
      },
    });

    return {
      ...updatedLeave,
      approvalWorkflow,
    };
  }

  async createOvertimeRequest(body: any) {
    const employee = await this.getEmployee(clean(body.employeeId));

    const hours = new Prisma.Decimal(asNumber(body.requestedHours));
    const rate = new Prisma.Decimal(asNumber(body.hourlyRate || employee.hourlyRate || 0));
    const estimatedCost = hours.mul(rate);

    const branch =
    clean(body.branch) ||
    clean(body.siteBranch) ||
    clean(employee.branch) ||
    clean(employee.site?.branch) ||
    null;

    const overtimeNo = await this.nextRef(
      'OT',
      'overtimeRequest',
      'overtimeNo',
    );

    const overtime = await this.db().overtimeRequest.create({
      data: {
        overtimeNo,
        employeeId: employee.id,
        employeeNumber: employee.employeeNumber,
        employeeName: this.employeeName(employee),
        siteId: clean(body.siteId) || employee.siteId || null,
        siteName: clean(body.siteName) || employee.siteName || employee.site?.name || null,
        siteManagerName: clean(body.siteManagerName) || null,
        siteManagerEmail: clean(body.siteManagerEmail) || null,
        overtimeDate: asDate(body.overtimeDate, 'Overtime date'),
        requestedHours: hours,
        hourlyRate: rate,
        estimatedCost,
        reason: clean(body.reason) || null,
        status: 'SUBMITTED',
        submittedBy: clean(body.submittedBy) || 'Staff user',
        submittedByEmail: clean(body.submittedByEmail) || null,
      },
    });

    const approvalWorkflow: any = await this.approvalWorkflowService.startWorkflowSafe({
      module: 'PEOPLE_OPERATIONS',
      workflowType: 'OVERTIME_REQUEST',
      sourceType: 'OVERTIME_REQUEST',
      sourceId: overtime.id,
      requestNo: overtime.overtimeNo,
      title: `Overtime approval - ${overtime.overtimeNo}`,
      description: overtime.reason || 'Overtime request',
      requestedBy: overtime.submittedBy || 'Staff user',
      requestedByEmail: overtime.submittedByEmail || null,
      requesterRole: 'PEOPLE_OPERATIONS_REQUESTER',
      department: employee.department?.name || null,
      departmentId: employee.departmentId || null,
      site: overtime.siteName || null,
      branch: branch,
      amount: this.decimalNumber(overtime.estimatedCost),
      currency: 'ZMW',
      payload: {
        ...overtime,
        branch,
        employeeNumber: employee.employeeNumber,
        employeeName: this.employeeName(employee),
        department: employee.department?.name || null,
        jobTitle: employee.jobTitle?.name || null,
        employmentType: employee.employmentType?.name || null,
        siteName: overtime.siteName,
        siteManagerName: overtime.siteManagerName,
        siteManagerEmail: overtime.siteManagerEmail,
        overtimeDate: overtime.overtimeDate,
        requestedHours: this.decimalNumber(overtime.requestedHours),
        hourlyRate: this.decimalNumber(overtime.hourlyRate),
        estimatedCost: this.decimalNumber(overtime.estimatedCost),
        reason: overtime.reason,
      },
    });

    const approvalRequestId = approvalRequestIdFrom(approvalWorkflow);

    const updatedOvertime = await this.db().overtimeRequest.update({
      where: { id: overtime.id },
      data: {
        approvalRequestId,
        status: 'SUBMITTED',
      },
    });

    return {
      ...updatedOvertime,
      approvalWorkflow,
    };
  }
  
}