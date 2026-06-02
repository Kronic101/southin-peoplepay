import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
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
}