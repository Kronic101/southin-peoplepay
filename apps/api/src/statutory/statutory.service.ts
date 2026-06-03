import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type CreateTaxYearInput = {
  name: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
};

type CreatePayeBandInput = {
  taxYearId: string;
  lowerBound: number | string;
  upperBound?: number | string | null;
  rate: number | string;
};

type CreateNapsaRateInput = {
  name: string;
  employeeRate: number | string;
  employerRate: number | string;
  monthlyCeiling?: number | string | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
};

type CreateNhimaRateInput = {
  name: string;
  employeeRate: number | string;
  employerRate: number | string;
  calculationBase?: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
};

type CreateSdlRateInput = {
  name: string;
  employerRate: number | string;
  calculationBase?: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
};

@Injectable()
export class StatutoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    const [taxYears, napsaRates, nhimaRates, sdlRates] = await Promise.all([
      this.prisma.taxYear.findMany({
        orderBy: { startDate: 'desc' },
        include: {
          payeBands: {
            orderBy: {
              lowerBound: 'asc',
            },
          },
        },
      }),
      this.prisma.napsaRate.findMany({
        orderBy: { effectiveFrom: 'desc' },
      }),
      this.prisma.nhimaRate.findMany({
        orderBy: { effectiveFrom: 'desc' },
      }),
      this.prisma.sdlRate.findMany({
        orderBy: { effectiveFrom: 'desc' },
      }),
    ]);

    return {
      taxYears,
      napsaRates,
      nhimaRates,
      sdlRates,
    };
  }

  async createTaxYear(input: CreateTaxYearInput) {
    if (!input.name || !input.startDate || !input.endDate) {
      throw new BadRequestException('Tax year name, start date, and end date are required');
    }

    if (input.isActive) {
      await this.prisma.taxYear.updateMany({
        data: {
          isActive: false,
        },
      });
    }

    return this.prisma.taxYear.create({
      data: {
        name: input.name,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        isActive: Boolean(input.isActive),
      },
      include: {
        payeBands: true,
      },
    });
  }

  async setActiveTaxYear(id: string) {
    const taxYear = await this.prisma.taxYear.findUnique({
      where: { id },
    });

    if (!taxYear) {
      throw new NotFoundException('Tax year not found');
    }

    await this.prisma.taxYear.updateMany({
      data: {
        isActive: false,
      },
    });

    return this.prisma.taxYear.update({
      where: { id },
      data: {
        isActive: true,
      },
      include: {
        payeBands: true,
      },
    });
  }

  async createPayeBand(input: CreatePayeBandInput) {
    if (!input.taxYearId || input.lowerBound === undefined || input.rate === undefined) {
      throw new BadRequestException('Tax year, lower bound, and rate are required');
    }

    const taxYear = await this.prisma.taxYear.findUnique({
      where: { id: input.taxYearId },
    });

    if (!taxYear) {
      throw new NotFoundException('Tax year not found');
    }

    return this.prisma.payeBand.create({
      data: {
        taxYearId: input.taxYearId,
        lowerBound: Number(input.lowerBound),
        upperBound:
          input.upperBound === undefined || input.upperBound === null || input.upperBound === ''
            ? null
            : Number(input.upperBound),
        rate: Number(input.rate),
      },
    });
  }

  async createNapsaRate(input: CreateNapsaRateInput) {
    if (!input.name || !input.effectiveFrom) {
      throw new BadRequestException('NAPSA rate name and effective date are required');
    }

    return this.prisma.napsaRate.create({
      data: {
        name: input.name,
        employeeRate: Number(input.employeeRate || 0),
        employerRate: Number(input.employerRate || 0),
        monthlyCeiling:
          input.monthlyCeiling === undefined || input.monthlyCeiling === null || input.monthlyCeiling === ''
            ? null
            : Number(input.monthlyCeiling),
        effectiveFrom: new Date(input.effectiveFrom),
        effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
        status: 'DRAFT',
      },
    });
  }

  async approveNapsaRate(id: string) {
    const rate = await this.prisma.napsaRate.findUnique({
      where: { id },
    });

    if (!rate) {
      throw new NotFoundException('NAPSA rate not found');
    }

    return this.prisma.napsaRate.update({
      where: { id },
      data: {
        status: 'APPROVED',
      },
    });
  }

  async createNhimaRate(input: CreateNhimaRateInput) {
    if (!input.name || !input.effectiveFrom) {
      throw new BadRequestException('NHIMA rate name and effective date are required');
    }

    return this.prisma.nhimaRate.create({
      data: {
        name: input.name,
        employeeRate: Number(input.employeeRate || 0),
        employerRate: Number(input.employerRate || 0),
        calculationBase: input.calculationBase || 'CONFIGURABLE',
        effectiveFrom: new Date(input.effectiveFrom),
        effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
        status: 'DRAFT',
      },
    });
  }

  async approveNhimaRate(id: string) {
    const rate = await this.prisma.nhimaRate.findUnique({
      where: { id },
    });

    if (!rate) {
      throw new NotFoundException('NHIMA rate not found');
    }

    return this.prisma.nhimaRate.update({
      where: { id },
      data: {
        status: 'APPROVED',
      },
    });
  }

  async createSdlRate(input: CreateSdlRateInput) {
    if (!input.name || !input.effectiveFrom) {
      throw new BadRequestException('SDL rate name and effective date are required');
    }

    return this.prisma.sdlRate.create({
      data: {
        name: input.name,
        employerRate: Number(input.employerRate || 0),
        calculationBase: input.calculationBase || 'GROSS_EMOLUMENTS',
        effectiveFrom: new Date(input.effectiveFrom),
        effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
        status: 'DRAFT',
      },
    });
  }

  async approveSdlRate(id: string) {
    const rate = await this.prisma.sdlRate.findUnique({
      where: { id },
    });

    if (!rate) {
      throw new NotFoundException('SDL rate not found');
    }

    return this.prisma.sdlRate.update({
      where: { id },
      data: {
        status: 'APPROVED',
      },
    });
  }

  async getStatutoryReport(payrollRunId: string) {
    const payrollRun = await this.prisma.payrollRun.findUnique({
      where: {
        id: payrollRunId,
      },
      include: {
        payrollPeriod: true,
        employees: {
          include: {
            employee: true,
            deductions: true,
          },
        },
      },
    });

    if (!payrollRun) {
      throw new NotFoundException('Payroll run not found');
    }

    const totals = payrollRun.employees.reduce(
      (summary, line) => {
        for (const deduction of line.deductions) {
          const amount = Number(deduction.amount || 0);

          if (deduction.deductionType === 'PAYE') {
            summary.paye += amount;
          }

          if (deduction.deductionType === 'NAPSA') {
            summary.napsa += amount;
          }

          if (deduction.deductionType === 'NHIMA') {
            summary.nhima += amount;
          }
        }

        return summary;
      },
      {
        paye: 0,
        napsa: 0,
        nhima: 0,
      },
    );

    return {
      payrollRunId: payrollRun.id,
      runName: payrollRun.runName,
      periodName: payrollRun.payrollPeriod?.periodName || null,
      employeeCount: payrollRun.employees.length,
      totals,
      employees: payrollRun.employees.map((line) => ({
        employeeNumber: line.employee.employeeNumber,
        name: `${line.employee.firstName} ${line.employee.lastName}`,
        deductions: line.deductions,
      })),
    };
  }
}