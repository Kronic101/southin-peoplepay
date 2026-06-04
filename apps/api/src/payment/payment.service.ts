import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function toNumber(value: any) {
  return Number(value || 0);
}

@Injectable()
export class PaymentService {
  constructor(private readonly prisma: PrismaService) {}

  async getPaymentBatches() {
    const batches = await this.prisma.paymentBatch.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        payrollRun: {
          include: {
            payrollPeriod: true,
          },
        },
        items: true,
      },
    });

    return {
      generatedAt: new Date().toISOString(),
      totalReturned: batches.length,
      batches,
    };
  }

  async getPaymentBatch(id: string) {
    const batch = await this.prisma.paymentBatch.findUnique({
      where: { id },
      include: {
        payrollRun: {
          include: {
            payrollPeriod: true,
          },
        },
        items: {
          orderBy: { employeeNumber: 'asc' },
        },
      },
    });

    if (!batch) {
      throw new NotFoundException('Payment batch not found');
    }

    return batch;
  }

  async createPaymentBatchFromPayrollRun(payrollRunId: string, input: any) {
    const payrollRun = await this.prisma.payrollRun.findUnique({
      where: { id: payrollRunId },
      include: {
        payrollPeriod: true,
        employees: {
          include: {
            employee: {
              include: {
                department: true,
              },
            },
            payslip: true,
          },
        },
      },
    });

    if (!payrollRun) {
      throw new NotFoundException('Payroll run not found');
    }

    if (payrollRun.status !== 'LOCKED') {
      throw new BadRequestException('Payment batch can only be created from a LOCKED payroll run.');
    }

    if (!payrollRun.employees.length) {
      throw new BadRequestException('Payroll run has no employees.');
    }

    const existingBatch = await this.prisma.paymentBatch.findFirst({
      where: { payrollRunId },
    });

    if (existingBatch) {
      throw new BadRequestException('A payment batch already exists for this payroll run.');
    }

    const payableLines = payrollRun.employees.filter((line: any) => Number(line.netPay || 0) > 0);

    if (!payableLines.length) {
      throw new BadRequestException('No payable payroll employees found.');
    }

    const missingPayslips = payableLines.filter((line: any) => !line.payslip);

    const totalNetPay = payableLines.reduce((sum: number, line: any) => {
      return sum + toNumber(line.netPay);
    }, 0);

    const batchName =
      input?.batchName ||
      `${payrollRun.payrollPeriod?.periodName || 'Payroll'} - ${payrollRun.runName} - Payment Batch`;

    const batch = await this.prisma.paymentBatch.create({
      data: {
        payrollRunId,
        batchName,
        status: missingPayslips.length > 0 ? 'BLOCKED_PAYSLIPS_MISSING' : 'DRAFT',
        totalEmployees: payableLines.length,
        totalNetPay,
        preparedBy: input?.preparedBy || null,
        evidenceNotes:
          missingPayslips.length > 0
            ? 'Payment batch created but blocked because one or more payslips are missing.'
            : 'Payment batch created for Finance preparation.',
        items: {
          create: payableLines.map((line: any) => ({
            payrollRunEmployeeId: line.id,
            employeeId: line.employeeId,
            employeeNumber: line.employee?.employeeNumber || '',
            employeeName: `${line.employee?.firstName || ''} ${line.employee?.lastName || ''}`.trim(),
            department: line.employee?.department?.name || null,
            netPay: line.netPay,
            bankDetailsStatus: 'PENDING_VALIDATION',
            paymentStatus: line.payslip ? 'PENDING' : 'BLOCKED_PAYSLIP_MISSING',
            validationNotes: line.payslip
              ? 'Pending Finance bank detail validation.'
              : 'Payslip must be generated before payment preparation.',
          })),
        },
      },
      include: {
        payrollRun: {
          include: {
            payrollPeriod: true,
          },
        },
        items: true,
      },
    });

    return {
      message: 'Payment batch created.',
      warning:
        missingPayslips.length > 0
          ? 'One or more employees are blocked because payslips are missing.'
          : null,
      batch,
    };
  }

  async validateBankDetails(id: string, input: any) {
    const batch = await this.prisma.paymentBatch.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!batch) {
      throw new NotFoundException('Payment batch not found');
    }

    const itemUpdates = input?.items || [];

    if (!Array.isArray(itemUpdates) || itemUpdates.length === 0) {
      throw new BadRequestException('items array is required.');
    }

    for (const item of itemUpdates) {
      await this.prisma.paymentBatchItem.update({
        where: { id: item.id },
        data: {
          bankName: item.bankName || null,
          bankBranch: item.bankBranch || null,
          bankAccountNumber: item.bankAccountNumber || null,
          bankDetailsStatus: item.bankDetailsStatus || 'VALIDATED',
          validationNotes: item.validationNotes || 'Bank details validated by Finance.',
          paymentStatus:
            item.bankDetailsStatus === 'VALIDATED' || !item.bankDetailsStatus
              ? 'READY_FOR_PAYMENT'
              : 'PENDING',
        },
      });
    }

    const updatedBatch = await this.getPaymentBatch(id);

    return {
      message: 'Bank detail validation updated.',
      batch: updatedBatch,
    };
  }

  async preparePaymentBatch(id: string, input: any) {
    const batch = await this.prisma.paymentBatch.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!batch) {
      throw new NotFoundException('Payment batch not found');
    }

    if (batch.status === 'APPROVED') {
      throw new BadRequestException('Approved payment batch cannot be prepared again.');
    }

    const blockedItems = batch.items.filter((item: any) =>
      ['BLOCKED_PAYSLIP_MISSING', 'PENDING'].includes(item.paymentStatus),
    );

    if (blockedItems.length > 0) {
      throw new BadRequestException(
        'Payment batch cannot be prepared while items are blocked or pending validation.',
      );
    }

    const updated = await this.prisma.paymentBatch.update({
      where: { id },
      data: {
        status: 'PREPARED',
        preparedBy: input?.preparedBy || 'finance-manager-dev',
        preparedAt: new Date(),
        evidenceNotes: input?.evidenceNotes || 'Payment batch prepared by Finance.',
      },
      include: {
        payrollRun: {
          include: {
            payrollPeriod: true,
          },
        },
        items: true,
      },
    });

    return {
      message: 'Payment batch prepared. No real bank file has been generated.',
      batch: updated,
    };
  }

  async approvePaymentBatch(id: string, input: any) {
    const batch = await this.prisma.paymentBatch.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!batch) {
      throw new NotFoundException('Payment batch not found');
    }

    if (batch.status !== 'PREPARED') {
      throw new BadRequestException('Only a PREPARED payment batch can be approved.');
    }

    const updated = await this.prisma.paymentBatch.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: input?.approvedBy || 'director-dev',
        approvedAt: new Date(),
        evidenceNotes:
          input?.evidenceNotes ||
          'Payment batch approved. Manual bank payment evidence must be stored separately.',
      },
      include: {
        payrollRun: {
          include: {
            payrollPeriod: true,
          },
        },
        items: true,
      },
    });

    await this.prisma.paymentBatchItem.updateMany({
      where: { paymentBatchId: id },
      data: {
        paymentStatus: 'APPROVED_FOR_MANUAL_PAYMENT',
      },
    });

    return {
      message: 'Payment batch approved for manual payment processing.',
      batch: await this.getPaymentBatch(id),
    };
  }
}