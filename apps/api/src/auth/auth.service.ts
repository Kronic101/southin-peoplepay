import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

type EmployeeLoginInput = {
  employeeNumber?: string;
  pin?: string;
};

type EmployeeChangePinInput = {
  employeeNumber?: string;
  currentPin?: string;
  newPin?: string;
};

type ForgotPinInput = {
  employeeNumber?: string;
  requestedBy?: string;
};

@Injectable()
export class AuthService {
  private readonly jwtSecret = process.env.JWT_SECRET || 'southin-peoplepay-dev-secret';

  constructor(private readonly prisma: PrismaService) {}

  async employeeLogin(input: EmployeeLoginInput) {
    const employeeNumber = String(input?.employeeNumber || '').trim();
    const pin = String(input?.pin || '').trim();

    if (!employeeNumber || !pin) {
      throw new BadRequestException('Employee number and PIN are required.');
    }

    const portalAccount = await this.prisma.employeePortalAccount.findUnique({
      where: {
        employeeNumber,
      },
      include: {
        employee: {
          include: {
            department: true,
            jobTitle: true,
            site: true,
            employmentType: true,
            statutoryDetails: true,
          },
        },
      },
    });

    if (!portalAccount || !portalAccount.employee) {
      throw new UnauthorizedException('Invalid employee number or PIN.');
    }

    if (!portalAccount.isActive) {
      throw new UnauthorizedException('Employee portal account is not active.');
    }

    if (portalAccount.lockedUntil && portalAccount.lockedUntil > new Date()) {
      throw new UnauthorizedException('Employee portal account is temporarily locked.');
    }

    const validPin = await bcrypt.compare(pin, portalAccount.pinHash);

    if (!validPin) {
      const failedAttempts = Number(portalAccount.failedAttempts || 0) + 1;
      const shouldLock = failedAttempts >= 5;

      await this.prisma.employeePortalAccount.update({
        where: {
          id: portalAccount.id,
        },
        data: {
          failedAttempts,
          lockedUntil: shouldLock ? new Date(Date.now() + 10 * 60 * 1000) : null,
        },
      });

      throw new UnauthorizedException('Invalid employee number or PIN.');
    }

    await this.prisma.employeePortalAccount.update({
      where: {
        id: portalAccount.id,
      },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    const token = this.signEmployeeToken({
      type: 'EMPLOYEE',
      role: portalAccount.accessProfile || 'EMPLOYEE',
      accessProfile: portalAccount.accessProfile || 'EMPLOYEE',
      allowedModules: Array.isArray(portalAccount.allowedModules)
        ? portalAccount.allowedModules
        : [],
      sub: portalAccount.employeeId,
      employeeId: portalAccount.employeeId,
      employeeNumber: portalAccount.employeeNumber,
    });

    return {
      message: 'Login successful',
      token,
      mustChangePin: portalAccount.mustChangePin,
      accessProfile: portalAccount.accessProfile || 'EMPLOYEE',
      allowedModules: Array.isArray(portalAccount.allowedModules)
        ? portalAccount.allowedModules
        : [],
      employee: this.formatEmployeeSummary(portalAccount.employee),
    };
  }

  async employeeChangePin(input: EmployeeChangePinInput) {
    const employeeNumber = String(input?.employeeNumber || '').trim();
    const currentPin = String(input?.currentPin || '').trim();
    const newPin = String(input?.newPin || '').trim();

    if (!employeeNumber || !currentPin || !newPin) {
      throw new BadRequestException('Employee number, current PIN, and new PIN are required.');
    }

    if (newPin.length < 4) {
      throw new BadRequestException('New PIN must be at least 4 characters.');
    }

    const portalAccount = await this.prisma.employeePortalAccount.findUnique({
      where: {
        employeeNumber,
      },
      include: {
        employee: {
          include: {
            department: true,
            jobTitle: true,
            site: true,
            employmentType: true,
            statutoryDetails: true,
          },
        },
      },
    });

    if (!portalAccount || !portalAccount.employee) {
      throw new NotFoundException('Employee portal account not found.');
    }

    if (!portalAccount.isActive) {
      throw new UnauthorizedException('Employee portal account is not active.');
    }

    const validPin = await bcrypt.compare(currentPin, portalAccount.pinHash);

    if (!validPin) {
      throw new UnauthorizedException('Current PIN is incorrect.');
    }

    const pinHash = await bcrypt.hash(newPin, 10);

    await this.prisma.employeePortalAccount.update({
      where: {
        id: portalAccount.id,
      },
      data: {
        pinHash,
        mustChangePin: false,
        failedAttempts: 0,
        lockedUntil: null,
      },
    });

    const token = this.signEmployeeToken({
      type: 'EMPLOYEE',
      role: portalAccount.accessProfile || 'EMPLOYEE',
      accessProfile: portalAccount.accessProfile || 'EMPLOYEE',
      allowedModules: Array.isArray(portalAccount.allowedModules)
        ? portalAccount.allowedModules
        : [],
      sub: portalAccount.employeeId,
      employeeId: portalAccount.employeeId,
      employeeNumber: portalAccount.employeeNumber,
    });

    return {
      message: 'Employee PIN changed successfully.',
      token,
      mustChangePin: false,
      employee: this.formatEmployeeSummary(portalAccount.employee),
    };
  }

  async employeeMe(req: any) {
    const token = this.getBearerToken(req);

    if (!token) {
      throw new UnauthorizedException('Missing employee token.');
    }

    const payload = this.verifyEmployeeToken(token);

    return this.getEmployeeMe(payload.employeeId);
  }

  async getEmployeeMe(employeeId: string) {
    if (!employeeId) {
      throw new UnauthorizedException('Invalid employee session.');
    }

    const employee = await this.prisma.employee.findUnique({
      where: {
        id: employeeId,
      },
      include: {
        statutoryDetails: true,
        portalAccount: {
          select: {
            employeeNumber: true,
            mustChangePin: true,
            isActive: true,
            accessProfile: true,
            allowedModules: true,
            lastLoginAt: true,
          },
        },
        department: true,
        jobTitle: true,
        site: true,
        employmentType: true,
        bankAccounts: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
        },
        payslips: {
          orderBy: {
            generatedAt: 'desc',
          },
          take: 5,
          include: {
            payrollPeriod: true,
          },
        },
      },
    });

    if (!employee) {
      throw new UnauthorizedException('Employee profile not found.');
    }

    if (!employee.portalAccount?.isActive) {
      throw new UnauthorizedException('Employee portal account is not active.');
    }

    return {
      id: employee.id,
      employeeNumber: employee.employeeNumber,
      firstName: employee.firstName,
      middleName: employee.middleName,
      lastName: employee.lastName,
      gender: employee.gender,
      status: employee.status,
      phone: employee.phone,
      email: employee.email,

      department: employee.department,
      jobTitle: employee.jobTitle,
      site: employee.site,
      employmentType: employee.employmentType,
      statutoryDetails: employee.statutoryDetails,

      bankDetailsStatus: employee.bankDetailsStatus,
      bankName: employee.bankName,
      bankBranch: employee.bankBranch,
      bankAccountName: employee.bankAccountName,
      bankAccountNumberMasked: this.maskAccountNumber(employee.bankAccountNumber),

      bankAccounts: employee.bankAccounts.map((account) => ({
        id: account.id,
        bankName: account.bankName,
        branchName: account.branchName,
        accountName: account.accountName,
        accountNumberMasked: this.maskAccountNumber(account.accountNumber),
        isPrimary: account.isPrimary,
        approvalStatus: account.approvalStatus,
        effectiveFrom: account.effectiveFrom,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      })),

      portalAccount: employee.portalAccount,
      payslipCount: employee.payslips.length,
      latestPayslip: employee.payslips[0] || null,

      leaveSummary: {
        monthlyLeaveDays: 2,
        mothersDayDays: this.isFemale(employee.gender) ? 1 : 0,
        totalAvailableThisMonth: 2 + (this.isFemale(employee.gender) ? 1 : 0),
      },
    };
  }

  async getEmployeePayslips(req: any) {
    const token = this.getBearerToken(req);

    if (!token) {
      throw new UnauthorizedException('Missing employee token.');
    }

    const payload = this.verifyEmployeeToken(token);

    const payslips = await this.prisma.payslip.findMany({
      where: {
        employeeId: payload.employeeId,
      },
      orderBy: {
        generatedAt: 'desc',
      },
      include: {
        payrollPeriod: true,
        employee: {
          include: {
            department: true,
            jobTitle: true,
            site: true,
            employmentType: true,
          },
        },
      },
    });

    return {
      generatedAt: new Date().toISOString(),
      totalReturned: payslips.length,
      payslips: payslips.map((payslip) => this.formatPayslipForEmployee(payslip)),
    };
  }

  async getEmployeePayslip(id: string, req: any) {
    const token = this.getBearerToken(req);

    if (!token) {
      throw new UnauthorizedException('Missing employee token.');
    }

    const payload = this.verifyEmployeeToken(token);

    const payslip = await this.prisma.payslip.findFirst({
      where: {
        id,
        employeeId: payload.employeeId,
      },
      include: {
        payrollPeriod: true,
        employee: {
          include: {
            department: true,
            jobTitle: true,
            site: true,
            employmentType: true,
          },
        },
      },
    });

    if (!payslip) {
      throw new NotFoundException('Payslip not found.');
    }

    return this.formatPayslipForEmployee(payslip);
  }

  async forgotEmployeePin(input: ForgotPinInput) {
    const employeeNumber = String(input?.employeeNumber || '').trim();

    if (!employeeNumber) {
      throw new BadRequestException('Employee number is required.');
    }

    const portalAccount = await this.prisma.employeePortalAccount.findUnique({
      where: {
        employeeNumber,
      },
      include: {
        employee: true,
      },
    });

    if (!portalAccount || !portalAccount.employee) {
      throw new NotFoundException('Employee portal account not found.');
    }

    const temporaryPin = this.generateTemporaryPin();
    const pinHash = await bcrypt.hash(temporaryPin, 10);

    await this.prisma.employeePortalAccount.update({
      where: {
        id: portalAccount.id,
      },
      data: {
        pinHash,
        mustChangePin: true,
        failedAttempts: 0,
        lockedUntil: null,
      },
    });

    if (process.env.EMAIL_ENABLED !== 'true') {
      return {
        message: 'Temporary PIN generated. Email is disabled in dev mode.',
        devModeTemporaryPin: temporaryPin,
        employeeNumber,
        mustChangePin: true,
      };
    }

    return {
      message: 'Temporary PIN generated and queued for email delivery.',
      employeeNumber,
      mustChangePin: true,
    };
  }

  async employeeForgotPin(input: ForgotPinInput) {
    return this.forgotEmployeePin(input);
  }

  private formatEmployeeSummary(employee: any) {
    return {
      id: employee.id,
      employeeNumber: employee.employeeNumber,
      firstName: employee.firstName,
      middleName: employee.middleName,
      lastName: employee.lastName,
      gender: employee.gender,
      status: employee.status,
      phone: employee.phone,
      email: employee.email,
      department: employee.department,
      jobTitle: employee.jobTitle,
      site: employee.site,
      employmentType: employee.employmentType,
      statutoryDetails: employee.statutoryDetails,
    };
  }

  private formatPayslipForEmployee(payslip: any) {
    const grossPay = Number(payslip.grossPay || 0);
    const totalDeductions = Number(payslip.totalDeductions || 0);
    const netPay = Number(payslip.netPay || 0);

    return {
      ...payslip,

      payrollPeriod: payslip.payrollPeriod,
      employee: payslip.employee,

      earnings: [
        {
          type: 'BASIC_PAY',
          description: 'Basic salary / gross pay',
          amount: grossPay,
        },
      ],

      deductions: [
        {
          type: 'TOTAL_DEDUCTIONS',
          description: 'Total statutory and other deductions',
          amount: totalDeductions,
        },
      ],

      grossPay,
      totalDeductions,
      netPay,
      employerCost: Number(payslip.employerCost || 0),
      status: payslip.status || 'GENERATED',
    };
  }

  private getBearerToken(req: any) {
    const authorization =
      req?.headers?.authorization ||
      req?.headers?.Authorization ||
      req?.authorization ||
      '';

    if (!authorization || typeof authorization !== 'string') {
      return null;
    }

    if (!authorization.toLowerCase().startsWith('bearer ')) {
      return null;
    }

    return authorization.slice(7).trim();
  }

  private signEmployeeToken(payload: Record<string, any>) {
    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };

    const now = Math.floor(Date.now() / 1000);

    const body = {
      ...payload,
      iat: now,
      exp: now + 60 * 60 * 12,
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedBody = this.base64UrlEncode(JSON.stringify(body));
    const unsignedToken = `${encodedHeader}.${encodedBody}`;

    const signature = createHmac('sha256', this.jwtSecret)
      .update(unsignedToken)
      .digest('base64url');

    return `${unsignedToken}.${signature}`;
  }

  private verifyEmployeeToken(token: string) {
    const parts = String(token || '').split('.');

    if (parts.length !== 3) {
      throw new UnauthorizedException('Invalid token.');
    }

    const [encodedHeader, encodedBody, signature] = parts;
    const unsignedToken = `${encodedHeader}.${encodedBody}`;

    const expectedSignature = createHmac('sha256', this.jwtSecret)
      .update(unsignedToken)
      .digest('base64url');

    if (signature !== expectedSignature) {
      throw new UnauthorizedException('Invalid token.');
    }

    let payload: any;

    try {
      payload = JSON.parse(Buffer.from(encodedBody, 'base64url').toString('utf8'));
    } catch {
      throw new UnauthorizedException('Invalid token.');
    }

    if (payload?.type !== 'EMPLOYEE' || !payload?.employeeId) {
      throw new UnauthorizedException('Invalid employee session.');
    }

    if (payload?.exp && Number(payload.exp) < Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('Employee session expired.');
    }

    return payload;
  }

  private base64UrlEncode(value: string) {
    return Buffer.from(value).toString('base64url');
  }

  private generateTemporaryPin() {
    return String(randomBytes(3).readUIntBE(0, 3)).slice(0, 6).padStart(6, '0');
  }

  private maskAccountNumber(value?: string | null) {
    if (!value) return null;

    const raw = String(value);

    if (raw.length <= 4) {
      return '****';
    }

    return `${'*'.repeat(Math.max(raw.length - 4, 0))}${raw.slice(-4)}`;
  }

  private isFemale(value?: string | null) {
    return String(value || '').toLowerCase().startsWith('f');
  }

  private assertPortalModuleAccess(account: any, moduleCode: string) {
    if (!account?.isActive) {
      throw new ForbiddenException('Portal account is inactive.');
    }

    const allowedModules = Array.isArray(account.allowedModules)
      ? account.allowedModules
      : [];

    if (!allowedModules.includes(moduleCode)) {
      throw new ForbiddenException(`Your portal account does not have access to ${moduleCode}.`);
    }
  }
}