import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';

type CreateLeaveRequestInput = {
  leaveType?: string;
  startDate?: string;
  endDate?: string;
  reason?: string;
  supervisorName?: string;
  supervisorEmail?: string;
};

type ReviewLeaveRequestInput = {
  action?: 'APPROVE' | 'REJECT';
  reviewedBy?: string;
  reviewComment?: string;
};

@Injectable()
export class LeaveService {
  constructor(private readonly prisma: PrismaService) {}

  async createEmployeeLeaveRequest(employeeId: string, input: CreateLeaveRequestInput) {
    const leaveType = String(input.leaveType || 'ANNUAL').trim().toUpperCase();
    const startDate = this.toDate(input.startDate, 'Start date is required.');
    const endDate = this.toDate(input.endDate, 'End date is required.');
    const supervisorEmail = String(input.supervisorEmail || '').trim().toLowerCase();
    const supervisorName = String(input.supervisorName || '').trim();

    if (!supervisorEmail) {
      throw new BadRequestException('Supervisor email is required.');
    }

    if (endDate < startDate) {
      throw new BadRequestException('End date cannot be before start date.');
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        department: true,
        jobTitle: true,
        site: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee profile not found.');
    }

    const totalDays = this.calculateInclusiveDays(startDate, endDate);

    const request = await this.prisma.leaveRequest.create({
      data: {
        employeeId,
        leaveType: leaveType as any,
        startDate,
        endDate,
        totalDays,
        reason: input.reason || null,
        supervisorName: supervisorName || null,
        supervisorEmail,
        status: 'PENDING_SUPERVISOR',
      },
      include: {
        employee: {
          include: {
            department: true,
            jobTitle: true,
            site: true,
          },
        },
      },
    });

    await this.notifySupervisor(request);

    return {
      message: 'Leave request submitted successfully.',
      request,
    };
  }

  async getEmployeeLeaveRequests(employeeId: string) {
    const requests = await this.prisma.leaveRequest.findMany({
      where: {
        employeeId,
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });

    return {
      totalReturned: requests.length,
      requests,
    };
  }

  async getSupervisorLeaveRequests(supervisorEmail: string) {
    const email = String(supervisorEmail || '').trim().toLowerCase();

    if (!email) {
      throw new BadRequestException('Supervisor email is required.');
    }

    const requests = await this.prisma.leaveRequest.findMany({
      where: {
        supervisorEmail: email,
      },
      orderBy: {
        submittedAt: 'desc',
      },
      include: {
        employee: {
          include: {
            department: true,
            jobTitle: true,
            site: true,
          },
        },
      },
    });

    return {
      totalReturned: requests.length,
      requests,
    };
  }

  async reviewLeaveRequest(id: string, input: ReviewLeaveRequestInput) {
    const action = String(input.action || '').toUpperCase();

    if (!['APPROVE', 'REJECT'].includes(action)) {
      throw new BadRequestException('Review action must be APPROVE or REJECT.');
    }

    const existing = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            department: true,
            jobTitle: true,
            site: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Leave request not found.');
    }

    if (existing.status !== 'PENDING_SUPERVISOR') {
      throw new BadRequestException('Only pending leave requests can be reviewed.');
    }

    const status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedBy: input.reviewedBy || 'Supervisor',
        reviewComment: input.reviewComment || null,
      },
      include: {
        employee: {
          include: {
            department: true,
            jobTitle: true,
            site: true,
          },
        },
      },
    });

    await this.notifyEmployeeAfterReview(updated);

    return {
      message: `Leave request ${status.toLowerCase()}.`,
      request: updated,
    };
  }

  private async notifySupervisor(request: any) {
    const employee = request.employee;
    const employeeName = this.employeeName(employee);

    const subject = `Leave Approval Required - ${employeeName || employee?.employeeNumber}`;

    const body = `
Dear ${request.supervisorName || 'Supervisor'},

A leave request has been submitted in Southin PeoplePay and requires your review.

Employee: ${employeeName}
Employee No.: ${employee?.employeeNumber}
Department: ${employee?.department?.name || '-'}
Job Title: ${employee?.jobTitle?.name || '-'}
Site: ${employee?.site?.name || '-'}

Leave Type: ${request.leaveType}
Start Date: ${this.formatDate(request.startDate)}
End Date: ${this.formatDate(request.endDate)}
Total Days: ${request.totalDays}
Reason: ${request.reason || '-'}

Current Status: ${request.status}

Please login to Southin PeoplePay to approve or reject this request.

Regards,
Southin PeoplePay
`.trim();

    await this.sendEmail({
      to: request.supervisorEmail,
      subject,
      text: body,
    });
  }

  private async notifyEmployeeAfterReview(request: any) {
    const employee = request.employee;
    const employeeName = this.employeeName(employee);
    const employeeEmail = String(employee?.email || '').trim().toLowerCase();

    if (!employeeEmail) {
      console.log('Leave review notification skipped: employee email is missing.');
      return;
    }

    const approved = request.status === 'APPROVED';

    const subject = approved
      ? `Leave Request Approved - ${this.formatDate(request.startDate)} to ${this.formatDate(
          request.endDate,
        )}`
      : `Leave Request Rejected - ${this.formatDate(request.startDate)} to ${this.formatDate(
          request.endDate,
        )}`;

    const body = `
Dear ${employeeName || 'Employee'},

Your leave request has been reviewed.

Employee No.: ${employee?.employeeNumber}
Leave Type: ${request.leaveType}
Start Date: ${this.formatDate(request.startDate)}
End Date: ${this.formatDate(request.endDate)}
Total Days: ${request.totalDays}
Reason: ${request.reason || '-'}

Decision: ${request.status}
Reviewed By: ${request.reviewedBy || '-'}
Review Date: ${request.reviewedAt ? this.formatDate(request.reviewedAt) : '-'}
Supervisor Comment: ${request.reviewComment || '-'}

${
  approved
    ? 'Your leave request has been approved. Please ensure your handover and operational arrangements are completed.'
    : 'Your leave request was not approved. Please contact your supervisor or HR for further guidance if required.'
}

Regards,
Southin PeoplePay
`.trim();

    await this.sendEmail({
      to: employeeEmail,
      subject,
      text: body,
    });
  }

  private async sendEmail(input: { to: string; subject: string; text: string }) {
    const enabled = process.env.SMTP_ENABLED === 'true';

    if (!enabled) {
      console.log('========== SOUTHIN PEOPLEPAY EMAIL DEV MODE ==========');
      console.log('To:', input.to);
      console.log('Subject:', input.subject);
      console.log(input.text);
      console.log('=====================================================');
      return;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.office365.com',
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
  }

  private toDate(value: unknown, message: string) {
    if (!value) {
      throw new BadRequestException(message);
    }

    const date = new Date(String(value));

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(message);
    }

    return date;
  }

  private calculateInclusiveDays(startDate: Date, endDate: Date) {
    const start = Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      startDate.getUTCDate(),
    );

    const end = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());

    return Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
  }

  private formatDate(value: Date | string) {
    return new Date(value).toISOString().slice(0, 10);
  }

  private employeeName(employee: any) {
    return `${employee?.firstName || ''} ${employee?.middleName || ''} ${employee?.lastName || ''}`
      .replace(/\s+/g, ' ')
      .trim();
  }
}