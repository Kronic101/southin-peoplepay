import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

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

@Injectable()
export class PeopleOpsService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma as any;
  }

  private async nextRef(prefix: string, modelName: string, fieldName: string) {
    const year = new Date().getFullYear();
    const count = await this.db()[modelName].count();
    return `${prefix}-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  private async getEmployee(employeeId: string) {
    if (!employeeId) {
      throw new BadRequestException('Employee is required.');
    }

    const employee = await this.db().employee.findUnique({
      where: { id: employeeId },
      include: {
        department: true,
        jobTitle: true,
        employmentType: true,
        site: true,
      },
    });

    if (!employee) {
      throw new BadRequestException('Selected employee does not exist.');
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

    return this.db().timesheetRecord.create({
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
  }

  async createLeaveRequest(body: any) {
    const employee = await this.getEmployee(clean(body.employeeId));

    const managerEmail = clean(body.siteManagerEmail);

    if (!managerEmail) {
      throw new BadRequestException(
        'This employee/site has no responsible manager email configured.',
      );
    }

    return this.db().leaveRequest.create({
      data: {
        employeeId: employee.id,
        leaveType: clean(body.leaveType) || 'ANNUAL',
        startDate: asDate(body.startDate, 'Start date'),
        endDate: asDate(body.endDate, 'End date'),
        totalDays: Math.max(1, Math.round(asNumber(body.totalDays || body.requestedDays || 1))),
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
  }

  async createOvertimeRequest(body: any) {
    const employee = await this.getEmployee(clean(body.employeeId));

    const hours = new Prisma.Decimal(asNumber(body.requestedHours));
    const rate = new Prisma.Decimal(asNumber(body.hourlyRate || employee.hourlyRate || 0));
    const estimatedCost = hours.mul(rate);

    const overtimeNo = await this.nextRef(
      'OT',
      'overtimeRequest',
      'overtimeNo',
    );

    return this.db().overtimeRequest.create({
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
  }
}