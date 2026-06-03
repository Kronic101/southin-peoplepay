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

type UpdateTaxYearInput = Partial<CreateTaxYearInput>;

type UpdatePayeBandInput = {
  lowerBound?: number | string;
  upperBound?: number | string | null;
  rate?: number | string;
};

type UpdateNapsaRateInput = Partial<CreateNapsaRateInput>;

type UpdateNhimaRateInput = Partial<CreateNhimaRateInput>;

type UpdateSdlRateInput = Partial<CreateSdlRateInput>;

@Injectable()
export class StatutoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    const [taxYears, napsaRates, nhimaRates, sdlRates] = await Promise.all([
      this.prisma.taxYear.findMany({
        orderBy: {
          startDate: 'desc',
        },
        include: {
          payeBands: {
            orderBy: {
              lowerBound: 'asc',
            },
          },
        },
      }),

      this.prisma.napsaRate.findMany({
        orderBy: {
          effectiveFrom: 'desc',
        },
      }),

      this.prisma.nhimaRate.findMany({
        orderBy: {
          effectiveFrom: 'desc',
        },
      }),

      this.prisma.sdlRate.findMany({
        orderBy: {
          effectiveFrom: 'desc',
        },
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

  async updateTaxYear(id: string, input: UpdateTaxYearInput) {
    const existing = await this.prisma.taxYear.findUnique({
      where: {
        id,
      },
    });

    if (!existing) {
      throw new NotFoundException('Tax year not found');
    }

    if (input.isActive) {
      await this.prisma.taxYear.updateMany({
        data: {
          isActive: false,
        },
      });
    }

    return this.prisma.taxYear.update({
      where: {
        id,
      },
      data: {
        name: input.name ?? existing.name,
        startDate: input.startDate ? new Date(input.startDate) : existing.startDate,
        endDate: input.endDate ? new Date(input.endDate) : existing.endDate,
        isActive: input.isActive ?? existing.isActive,
      },
      include: {
        payeBands: true,
      },
    });
  }

  async setActiveTaxYear(id: string) {
    const taxYear = await this.prisma.taxYear.findUnique({
      where: {
        id,
      },
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
      where: {
        id,
      },
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
      where: {
        id: input.taxYearId,
      },
    });

    if (!taxYear) {
      throw new NotFoundException('Tax year not found');
    }

    const lowerBound = this.normalizeMoney(input.lowerBound, 'Lower bound') ?? 0;
    const upperBound = this.normalizeMoney(input.upperBound, 'Upper bound');
    const rate = this.normalizeRate(input.rate, 'PAYE rate');

    if (upperBound !== null && upperBound <= lowerBound) {
      throw new BadRequestException('Upper bound must be greater than lower bound');
    }

    return this.prisma.payeBand.create({
      data: {
        taxYearId: input.taxYearId,
        lowerBound,
        upperBound,
        rate,
      },
    });
  }

  async updatePayeBand(id: string, input: UpdatePayeBandInput) {
    const existing = await this.prisma.payeBand.findUnique({
      where: {
        id,
      },
    });

    if (!existing) {
      throw new NotFoundException('PAYE band not found');
    }

    const lowerBound =
      input.lowerBound === undefined
        ? Number(existing.lowerBound)
        : this.normalizeMoney(input.lowerBound, 'Lower bound') ?? 0;

    const upperBound =
      input.upperBound === undefined
        ? existing.upperBound === null
          ? null
          : Number(existing.upperBound)
        : this.normalizeMoney(input.upperBound, 'Upper bound');

    const rate =
      input.rate === undefined ? Number(existing.rate) : this.normalizeRate(input.rate, 'PAYE rate');

    if (upperBound !== null && upperBound <= lowerBound) {
      throw new BadRequestException('Upper bound must be greater than lower bound');
    }

    return this.prisma.payeBand.update({
      where: {
        id,
      },
      data: {
        lowerBound,
        upperBound,
        rate,
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
        employeeRate: this.normalizeRate(input.employeeRate, 'NAPSA employee rate'),
        employerRate: this.normalizeRate(input.employerRate, 'NAPSA employer rate'),
        monthlyCeiling: this.normalizeMoney(input.monthlyCeiling, 'NAPSA monthly ceiling'),
        effectiveFrom: new Date(input.effectiveFrom),
        effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
        status: 'DRAFT',
      },
    });
  }

  async updateNapsaRate(id: string, input: UpdateNapsaRateInput) {
    const existing = await this.prisma.napsaRate.findUnique({
      where: {
        id,
      },
    });

    if (!existing) {
      throw new NotFoundException('NAPSA rate not found');
    }

    return this.prisma.napsaRate.update({
      where: {
        id,
      },
      data: {
        name: input.name ?? existing.name,
        employeeRate:
          input.employeeRate === undefined
            ? Number(existing.employeeRate)
            : this.normalizeRate(input.employeeRate, 'NAPSA employee rate'),
        employerRate:
          input.employerRate === undefined
            ? Number(existing.employerRate)
            : this.normalizeRate(input.employerRate, 'NAPSA employer rate'),
        monthlyCeiling:
          input.monthlyCeiling === undefined
            ? existing.monthlyCeiling === null
              ? null
              : Number(existing.monthlyCeiling)
            : this.normalizeMoney(input.monthlyCeiling, 'NAPSA monthly ceiling'),
        effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : existing.effectiveFrom,
        effectiveTo:
          input.effectiveTo === undefined
            ? existing.effectiveTo
            : input.effectiveTo
              ? new Date(input.effectiveTo)
              : null,
        status: 'DRAFT',
      },
    });
  }

  async approveNapsaRate(id: string) {
    const rate = await this.prisma.napsaRate.findUnique({
      where: {
        id,
      },
    });

    if (!rate) {
      throw new NotFoundException('NAPSA rate not found');
    }

    return this.prisma.napsaRate.update({
      where: {
        id,
      },
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
        employeeRate: this.normalizeRate(input.employeeRate, 'NHIMA employee rate'),
        employerRate: this.normalizeRate(input.employerRate, 'NHIMA employer rate'),
        calculationBase: input.calculationBase || 'CONFIGURABLE',
        effectiveFrom: new Date(input.effectiveFrom),
        effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
        status: 'DRAFT',
      },
    });
  }

  async updateNhimaRate(id: string, input: UpdateNhimaRateInput) {
    const existing = await this.prisma.nhimaRate.findUnique({
      where: {
        id,
      },
    });

    if (!existing) {
      throw new NotFoundException('NHIMA rate not found');
    }

    return this.prisma.nhimaRate.update({
      where: {
        id,
      },
      data: {
        name: input.name ?? existing.name,
        employeeRate:
          input.employeeRate === undefined
            ? Number(existing.employeeRate)
            : this.normalizeRate(input.employeeRate, 'NHIMA employee rate'),
        employerRate:
          input.employerRate === undefined
            ? Number(existing.employerRate)
            : this.normalizeRate(input.employerRate, 'NHIMA employer rate'),
        calculationBase: input.calculationBase ?? existing.calculationBase,
        effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : existing.effectiveFrom,
        effectiveTo:
          input.effectiveTo === undefined
            ? existing.effectiveTo
            : input.effectiveTo
              ? new Date(input.effectiveTo)
              : null,
        status: 'DRAFT',
      },
    });
  }

  async approveNhimaRate(id: string) {
    const rate = await this.prisma.nhimaRate.findUnique({
      where: {
        id,
      },
    });

    if (!rate) {
      throw new NotFoundException('NHIMA rate not found');
    }

    return this.prisma.nhimaRate.update({
      where: {
        id,
      },
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
        employerRate: this.normalizeRate(input.employerRate, 'SDL employer rate'),
        calculationBase: input.calculationBase || 'GROSS_EMOLUMENTS',
        effectiveFrom: new Date(input.effectiveFrom),
        effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
        status: 'DRAFT',
      },
    });
  }

  async updateSdlRate(id: string, input: UpdateSdlRateInput) {
    const existing = await this.prisma.sdlRate.findUnique({
      where: {
        id,
      },
    });

    if (!existing) {
      throw new NotFoundException('SDL rate not found');
    }

    return this.prisma.sdlRate.update({
      where: {
        id,
      },
      data: {
        name: input.name ?? existing.name,
        employerRate:
          input.employerRate === undefined
            ? Number(existing.employerRate)
            : this.normalizeRate(input.employerRate, 'SDL employer rate'),
        calculationBase: input.calculationBase ?? existing.calculationBase,
        effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : existing.effectiveFrom,
        effectiveTo:
          input.effectiveTo === undefined
            ? existing.effectiveTo
            : input.effectiveTo
              ? new Date(input.effectiveTo)
              : null,
        status: 'DRAFT',
      },
    });
  }

  async approveSdlRate(id: string) {
    const rate = await this.prisma.sdlRate.findUnique({
      where: {
        id,
      },
    });

    if (!rate) {
      throw new NotFoundException('SDL rate not found');
    }

    return this.prisma.sdlRate.update({
      where: {
        id,
      },
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

  private normalizeRate(value: number | string | undefined | null, fieldName: string) {
    const rate = Number(value || 0);

    if (Number.isNaN(rate) || rate < 0) {
      throw new BadRequestException(`${fieldName} must be a valid positive decimal rate`);
    }

    if (rate > 1) {
      throw new BadRequestException(
        `${fieldName} must be entered as a decimal. Example: 5% = 0.05, 10% = 0.10, 37.5% = 0.375`,
      );
    }

    return rate;
  }

  private normalizeMoney(value: number | string | undefined | null, fieldName: string) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    const amount = Number(value);

    if (Number.isNaN(amount) || amount < 0) {
      throw new BadRequestException(`${fieldName} must be a valid positive amount`);
    }

    return amount;
  }
}