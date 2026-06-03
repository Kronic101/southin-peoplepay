import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';

type EmployeeLoginInput = {
  employeeNumber: string;
  pin: string;
};

type EmployeeChangePinInput = {
  employeeNumber: string;
  currentPin: string;
  newPin: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService, 
    private readonly jwtService: JwtService,
  ) {}

  async employeeLogin(input: {
    employeeNumber?: string;
    pin?: string;
  }) {
    const employeeNumber = input.employeeNumber?.trim();
    const pin = input.pin?.trim();

    if (!employeeNumber || !pin) {
      throw new BadRequestException('Employee number and PIN are required');
    }

    const employee = await this.prisma.employee.findUnique({
      where: {
        employeeNumber,
      },
      include: {
        portalAccount: true,
      },
    });

    if (!employee || !employee.portalAccount) {
      throw new UnauthorizedException('Invalid employee number or PIN');
    }

    if (!employee.portalAccount.isActive) {
      throw new UnauthorizedException('Employee portal account is inactive');
    }

    const pinMatches = await bcrypt.compare(pin, employee.portalAccount.pinHash);

    if (!pinMatches) {
      throw new UnauthorizedException('Invalid employee number or PIN');
    }

    await this.prisma.employeePortalAccount.update({
      where: {
        id: employee.portalAccount.id,
      },
      data: {
        lastLoginAt: new Date(),
      },
    });

    const token = this.jwtService.sign({
      sub: employee.id,
      employeeId: employee.id,
      employeeNumber: employee.employeeNumber,
      role: 'EMPLOYEE',
    });

    if (employee.portalAccount.mustChangePin) {
      return {
        message: 'PIN change required',
        mustChangePin: true,
        employee: {
          id: employee.id,
          employeeNumber: employee.employeeNumber,
          firstName: employee.firstName,
          lastName: employee.lastName,
          status: employee.status,
        },
        token,
      };
    }

    return {
      message: 'Login successful',
      mustChangePin: false,
      employee: {
        id: employee.id,
        employeeNumber: employee.employeeNumber,
        firstName: employee.firstName,
        lastName: employee.lastName,
        status: employee.status,
      },
      token,
    };
}

  async employeeChangePin(input: {
      employeeNumber?: string;
      currentPin?: string;
      newPin?: string;
    }) {
      const employeeNumber = input.employeeNumber?.trim();
      const currentPin = input.currentPin?.trim();
      const newPin = input.newPin?.trim();

      if (!employeeNumber || !currentPin || !newPin) {
        throw new BadRequestException('Employee number, current PIN, and new PIN are required');
      }

      if (!/^\d{6}$/.test(newPin)) {
        throw new BadRequestException('New PIN must be exactly 6 digits');
      }

      if (currentPin === newPin) {
        throw new BadRequestException('New PIN must be different from the temporary PIN');
      }

      const employee = await this.prisma.employee.findUnique({
        where: {
          employeeNumber,
        },
        include: {
          portalAccount: true,
        },
      });

      if (!employee || !employee.portalAccount) {
        throw new UnauthorizedException('Invalid employee number or PIN');
      }

      if (!employee.portalAccount.isActive) {
        throw new UnauthorizedException('Employee portal account is inactive');
      }

      const pinMatches = await bcrypt.compare(currentPin, employee.portalAccount.pinHash);

      if (!pinMatches) {
        throw new UnauthorizedException('Invalid temporary PIN');
      }

      const newPinHash = await bcrypt.hash(newPin, 10);

      await this.prisma.employeePortalAccount.update({
        where: {
          id: employee.portalAccount.id,
        },
        data: {
          pinHash: newPinHash,
          mustChangePin: false,
          lastLoginAt: new Date(),
        },
      });

      const token = this.jwtService.sign({
        sub: employee.id,
        employeeId: employee.id,
        employeeNumber: employee.employeeNumber,
        role: 'EMPLOYEE',
      });

      return {
        message: 'PIN changed successfully',
        mustChangePin: false,
        employee: {
          id: employee.id,
          employeeNumber: employee.employeeNumber,
          firstName: employee.firstName,
          lastName: employee.lastName,
          status: employee.status,
        },
        token,
      };
    }

  async getEmployeeMe(employeeId: string) {
        const employee = await this.prisma.employee.findUnique({
          where: { id: employeeId },
          include: {
            statutoryDetails: true,
            portalAccount: {
              select: {
                employeeNumber: true,
                mustChangePin: true,
                isActive: true,
                lastLoginAt: true,
              },
            },
          },
        });

        if (!employee) {
          throw new UnauthorizedException('Invalid session');
        }

        const payslipCount = await this.prisma.payslip.count({
          where: {
            employeeId,
          },
        });

        return {
          id: employee.id,
          employeeNumber: employee.employeeNumber,
          firstName: employee.firstName,
          lastName: employee.lastName,
          status: employee.status,
          phone: employee.phone,
          email: employee.email,
          statutoryDetails: employee.statutoryDetails,
          portalAccount: employee.portalAccount,
          payslipCount,
        };
      }

  private async registerFailedAttempt(accountId: string, currentFailedAttempts: number) {
    const failedAttempts = currentFailedAttempts + 1;

    await this.prisma.employeePortalAccount.update({
      where: { id: accountId },
      data: {
        failedAttempts,
        lockedUntil: failedAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null,
      },
    });
  }

  private hashPin(pin: string) {
    const salt = process.env.EMPLOYEE_PIN_SALT || 'southin-peoplepay-dev-salt';
    return createHash('sha256').update(`${pin}:${salt}`).digest('hex');
  }

  private createDevToken(employeeId: string, employeeNumber: string) {
    return Buffer.from(
      JSON.stringify({
        sessionId: randomUUID(),
        type: 'EMPLOYEE',
        employeeId,
        employeeNumber,
        issuedAt: new Date().toISOString(),
      }),
    ).toString('base64url');
  }

    private extractEmployeeNumberFromRequest(req: any) {
    const authHeader = req.headers?.authorization || req.headers?.Authorization;

    if (!authHeader || !String(authHeader).startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing employee token');
    }

    const token = String(authHeader).replace('Bearer ', '').trim();

    try {
      const decoded = this.jwtService.verify(token);
      return decoded.employeeNumber;
    } catch {
      throw new UnauthorizedException('Invalid or expired employee token');
    }
  }

  async getEmployeePayslips(req: any) {
    const employeeNumber = this.extractEmployeeNumberFromRequest(req);

    const employee = await this.prisma.employee.findUnique({
      where: { employeeNumber },
      include: {
        payslips: {
          include: {
            payrollPeriod: true,
            payrollRunEmployee: {
              include: {
                earnings: true,
                deductions: true,
              },
            },
          },
          orderBy: {
            generatedAt: 'desc',
          },
        },
      },
    });

    if (!employee) {
      throw new UnauthorizedException('Employee not found');
    }

    return employee.payslips.map((payslip) => ({
      id: payslip.id,
      employeeNumber: employee.employeeNumber,
      employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
      payrollPeriod: payslip.payrollPeriod?.periodName || '-',
      periodStart: payslip.payrollPeriod?.startDate || null,
      periodEnd: payslip.payrollPeriod?.endDate || null,
      payDate: payslip.payrollPeriod?.payDate || null,
      grossPay: payslip.grossPay,
      totalDeductions: payslip.totalDeductions,
      netPay: payslip.netPay,
      employerCost: payslip.employerCost,
      status: payslip.status,
      generatedAt: payslip.generatedAt,
      earningsCount: payslip.payrollRunEmployee?.earnings?.length || 0,
      deductionsCount: payslip.payrollRunEmployee?.deductions?.length || 0,
    }));
  }

  async getEmployeePayslip(id: string, req: any) {
    const employeeNumber = this.extractEmployeeNumberFromRequest(req);

    const employee = await this.prisma.employee.findUnique({
      where: { employeeNumber },
    });

    if (!employee) {
      throw new UnauthorizedException('Employee not found');
    }

    const payslip = await this.prisma.payslip.findFirst({
      where: {
        id,
        employeeId: employee.id,
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
        payrollPeriod: true,
        payrollRunEmployee: {
          include: {
            earnings: true,
            deductions: true,
          },
        },
      },
    });

    if (!payslip) {
      throw new NotFoundException('Payslip not found');
    }

    return payslip;
  }

    private generateTemporaryPin() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  private maskEmail(email?: string | null) {
    if (!email || !email.includes('@')) return null;

    const [name, domain] = email.split('@');
    const visible = name.slice(0, 2);
    return `${visible}${'*'.repeat(Math.max(name.length - 2, 3))}@${domain}`;
  }

  private async sendForgotPinEmail(input: {
    to: string;
    employeeName: string;
    employeeNumber: string;
    temporaryPin: string;
  }) {
    const emailEnabled = String(process.env.EMAIL_ENABLED || 'false').toLowerCase() === 'true';

    const subject = 'Southin PeoplePay Temporary PIN Reset';

    const text = `
Dear ${input.employeeName},

A temporary PIN has been generated for your Southin PeoplePay employee portal.

Employee Number: ${input.employeeNumber}
Temporary PIN: ${input.temporaryPin}

For security, you must login and change this temporary PIN immediately.

If you did not request this reset, please contact HR or IT immediately.

Regards,
Southin PeoplePay
`;

    if (!emailEnabled) {
      console.log('EMAIL_DISABLED_DEV_MODE');
      console.log({
        to: input.to,
        subject,
        temporaryPin: input.temporaryPin,
      });

      return {
        sent: false,
        devMode: true,
        message: 'Email disabled. Temporary PIN logged in API terminal for development testing.',
      };
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: input.to,
      subject,
      text,
    });

    return {
      sent: true,
      devMode: false,
      message: 'Temporary PIN email sent.',
    };
  }

  async employeeForgotPin(input: {
    employeeNumber?: string;
  }) {
    const employeeNumber = input.employeeNumber?.trim();

    if (!employeeNumber) {
      throw new BadRequestException('Employee number is required');
    }

    const employee = await this.prisma.employee.findUnique({
      where: {
        employeeNumber,
      },
      include: {
        portalAccount: true,
      },
    });

    /**
     * Security note:
     * We return a generic message when employee/account/email is missing.
     * This prevents exposing whether an employee number exists.
     */
    const genericResponse = {
      message:
        'If the employee number is valid and has an email address, a temporary PIN reset email will be sent.',
    };

    if (!employee || !employee.portalAccount || !employee.email) {
      return genericResponse;
    }

    if (!employee.portalAccount.isActive) {
      return genericResponse;
    }

    const temporaryPin = this.generateTemporaryPin();
    const pinHash = await bcrypt.hash(temporaryPin, 10);

    await this.prisma.employeePortalAccount.update({
      where: {
        id: employee.portalAccount.id,
      },
      data: {
        pinHash,
        mustChangePin: true,
      },
    });

    const employeeName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();

    const emailResult = await this.sendForgotPinEmail({
      to: employee.email,
      employeeName: employeeName || employee.employeeNumber,
      employeeNumber: employee.employeeNumber,
      temporaryPin,
    });

    return {
      ...genericResponse,
      email: this.maskEmail(employee.email),
      devMode: emailResult.devMode,
      /**
       * Development only:
       * This allows you to test without SMTP.
       * Remove temporaryPin from response before production.
       */
      temporaryPin:
        String(process.env.EMAIL_ENABLED || 'false').toLowerCase() === 'true'
          ? undefined
          : temporaryPin,
    };
  }
}