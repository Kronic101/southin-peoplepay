import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
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
  constructor(private readonly prisma: PrismaService) {}

  async employeeLogin(input: EmployeeLoginInput) {
    const employeeNumber = input.employeeNumber?.trim();
    const pin = input.pin?.trim();

    if (!employeeNumber || !pin) {
      throw new BadRequestException('Employee number and PIN are required');
    }

    const account = await this.prisma.employeePortalAccount.findUnique({
      where: { employeeNumber },
      include: {
        employee: true,
      },
    });

    if (!account || !account.isActive) {
      throw new UnauthorizedException('Invalid employee number or PIN');
    }

    if (account.lockedUntil && account.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account is temporarily locked');
    }

    const pinHash = this.hashPin(pin);

    if (pinHash !== account.pinHash) {
      await this.registerFailedAttempt(account.id, account.failedAttempts);
      throw new UnauthorizedException('Invalid employee number or PIN');
    }

    await this.prisma.employeePortalAccount.update({
      where: { id: account.id },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    return {
      message: account.mustChangePin ? 'PIN change required' : 'Login successful',
      mustChangePin: account.mustChangePin,
      employee: {
        id: account.employee.id,
        employeeNumber: account.employee.employeeNumber,
        firstName: account.employee.firstName,
        lastName: account.employee.lastName,
        status: account.employee.status,
      },
      token: this.createDevToken(account.employee.id, account.employee.employeeNumber),
    };
  }

  async employeeChangePin(input: EmployeeChangePinInput) {
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
      throw new BadRequestException('New PIN must be different from the temporary/current PIN');
    }

    const account = await this.prisma.employeePortalAccount.findUnique({
      where: { employeeNumber },
      include: {
        employee: true,
      },
    });

    if (!account || !account.isActive) {
      throw new UnauthorizedException('Invalid employee account');
    }

    const currentPinHash = this.hashPin(currentPin);

    if (currentPinHash !== account.pinHash) {
      await this.registerFailedAttempt(account.id, account.failedAttempts);
      throw new UnauthorizedException('Current PIN is incorrect');
    }

    await this.prisma.employeePortalAccount.update({
      where: { id: account.id },
      data: {
        pinHash: this.hashPin(newPin),
        mustChangePin: false,
        failedAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    return {
      message: 'PIN changed successfully',
      employee: {
        id: account.employee.id,
        employeeNumber: account.employee.employeeNumber,
        firstName: account.employee.firstName,
        lastName: account.employee.lastName,
      },
      token: this.createDevToken(account.employee.id, account.employee.employeeNumber),
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
}