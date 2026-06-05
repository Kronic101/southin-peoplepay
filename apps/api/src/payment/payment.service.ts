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
          include: {
            employee: {
              include: {
                bankAccounts: {
                  orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
                },
              },
            },
            payrollRunEmployee: {
              include: {
                payslip: true,
              },
            },
          },
        },
      },
    });

    if (!batch) {
      throw new NotFoundException('Payment batch not found');
    }

    return batch;
  }

  async getPaymentBatchEvidence(id: string) {
    const batch = await this.getPaymentBatch(id);

    const readyItems = batch.items.filter((item: any) =>
      ['READY_FOR_PAYMENT', 'APPROVED_FOR_MANUAL_PAYMENT'].includes(item.paymentStatus),
    );

    const blockedItems = batch.items.filter((item: any) =>
      ['BLOCKED_PAYSLIP_MISSING', 'PENDING_BANK_VALIDATION', 'PENDING_VALIDATION'].includes(
        item.paymentStatus,
      ),
    );

    return {
      generatedAt: new Date().toISOString(),
      evidenceType: 'PAYMENT_BATCH_EVIDENCE',
      confidentiality: 'CONFIDENTIAL_FINANCE',
      targetSharePoint: {
        siteName: 'Finance',
        libraryName: 'Payroll Audit Reports',
        recommendedFolder: `${batch.payrollRun?.payrollPeriod?.periodName || 'Payroll'} / Payment Evidence`,
      },
      batch: {
        id: batch.id,
        batchName: batch.batchName,
        status: batch.status,
        payrollRunName: batch.payrollRun?.runName,
        periodName: batch.payrollRun?.payrollPeriod?.periodName,
        totalEmployees: batch.totalEmployees,
        totalNetPay: batch.totalNetPay,
        preparedBy: batch.preparedBy,
        preparedAt: batch.preparedAt,
        reviewedBy: batch.reviewedBy,
        reviewedAt: batch.reviewedAt,
        approvedBy: batch.approvedBy,
        approvedAt: batch.approvedAt,
        evidenceNotes: batch.evidenceNotes,
      },
      readiness: {
        readyItems: readyItems.length,
        blockedItems: blockedItems.length,
        canExportForManualPayment: blockedItems.length === 0 && batch.status === 'APPROVED',
        warning:
          batch.status !== 'APPROVED'
            ? 'Payment batch has not been approved yet.'
            : blockedItems.length > 0
              ? 'Payment batch still contains blocked or pending items.'
              : null,
      },
      items: batch.items.map((item: any) => ({
        employeeNumber: item.employeeNumber,
        employeeName: item.employeeName,
        department: item.department,
        netPay: item.netPay,
        bankName: item.bankName,
        bankBranch: item.bankBranch,
        bankAccountName: item.bankAccountName,
        bankAccountNumberMasked: this.maskAccountNumber(item.bankAccountNumber),
        bankDetailsStatus: item.bankDetailsStatus,
        paymentStatus: item.paymentStatus,
        validationNotes: item.validationNotes,
      })),
      controls: [
        'This evidence file is for Finance-controlled payment preparation only.',
        'This file does not trigger a bank transfer.',
        'Bank account numbers are masked in the evidence JSON.',
        'Full payment banking evidence must remain restricted to Finance.',
        'Payment batch must be approved before live bank integration is enabled.',
      ],
    };
  }

  async exportPaymentBatchEvidenceCsv(id: string) {
    const batch = await this.getPaymentBatch(id);

    const headers = [
      'Batch Name',
      'Payroll Run',
      'Period',
      'Batch Status',
      'Employee No.',
      'Employee Name',
      'Department',
      'Net Pay',
      'Bank Name',
      'Branch',
      'Account Name',
      'Account Number Masked',
      'Bank Status',
      'Payment Status',
      'Validation Notes',
    ];

    const rows = batch.items.map((item: any) => [
      batch.batchName,
      batch.payrollRun?.runName || '',
      batch.payrollRun?.payrollPeriod?.periodName || '',
      batch.status,
      item.employeeNumber,
      item.employeeName,
      item.department || '',
      Number(item.netPay || 0).toFixed(2),
      item.bankName || '',
      item.bankBranch || '',
      item.bankAccountName || '',
      this.maskAccountNumber(item.bankAccountNumber),
      item.bankDetailsStatus || '',
      item.paymentStatus || '',
      item.validationNotes || '',
    ]);

    return [headers, ...rows]
      .map((row) =>
        row
          .map((value) => {
            const escaped = String(value ?? '').replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(','),
      )
      .join('\n');
  }

  private maskAccountNumber(accountNumber?: string | null) {
    if (!accountNumber) {
      return '';
    }

    const value = String(accountNumber);

    if (value.length <= 4) {
      return '****';
    }

    return `${'*'.repeat(Math.max(value.length - 4, 4))}${value.slice(-4)}`;
  }

  async createPaymentBatchFromPayrollRun(payrollRunId: string, input: any) {
    const payrollRun = await this.prisma.payrollRun.findUnique({
      where: { id: payrollRunId },
      include: {
        payrollPeriod: true,
        employees: {
          include: {
            payslip: true,
            employee: {
              include: {
                department: true,
                bankAccounts: {
                  orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
                },
              },
            },
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

    const existingBatch = await this.prisma.paymentBatch.findFirst({
      where: { payrollRunId },
    });

    if (existingBatch) {
      throw new BadRequestException('A payment batch already exists for this payroll run.');
    }

    const payableLines = payrollRun.employees.filter((line: any) => toNumber(line.netPay) > 0);

    if (!payableLines.length) {
      throw new BadRequestException('No payable payroll employees found.');
    }

    const totalNetPay = payableLines.reduce((sum: number, line: any) => {
      return sum + toNumber(line.netPay);
    }, 0);

    const blockedPayslipCount = payableLines.filter((line: any) => !line.payslip).length;

    const pendingBankValidationCount = payableLines.filter((line: any) => {
      const bank = this.resolvePrimaryBank(line.employee);

      return (
        Boolean(line.payslip) &&
        !(
          bank &&
          bank.approvalStatus === 'APPROVED' &&
          bank.bankName &&
          bank.accountNumber &&
          bank.accountName
        ) &&
        !(
          line.employee.bankDetailsStatus === 'VALIDATED' &&
          line.employee.bankName &&
          line.employee.bankAccountNumber &&
          line.employee.bankAccountName
        )
      );
    }).length;

    const batchStatus =
      blockedPayslipCount > 0
        ? 'BLOCKED_PAYSLIPS_MISSING'
        : pendingBankValidationCount > 0
          ? 'PENDING_BANK_VALIDATION'
          : 'DRAFT';

    const batchName =
      input?.batchName ||
      `${payrollRun.payrollPeriod?.periodName || 'Payroll'} - ${payrollRun.runName} - Payment Batch`;

    const batch = await this.prisma.paymentBatch.create({
      data: {
        payrollRunId,
        batchName,
        status: batchStatus,
        totalEmployees: payableLines.length,
        totalNetPay,
        preparedBy: input?.preparedBy || 'finance-manager-dev',
        evidenceNotes:
          blockedPayslipCount > 0
            ? `Payment batch created but blocked because ${blockedPayslipCount} payslip(s) are missing.`
            : pendingBankValidationCount > 0
              ? `Payment batch created. ${pendingBankValidationCount} employee bank detail record(s) require Finance validation.`
              : 'Payment batch created. Payslips and bank details are ready for Finance preparation.',
      },
    });

    for (const line of payableLines) {
      const employee = line.employee;
      const primaryBank = this.resolvePrimaryBank(employee);

      const bankName = primaryBank?.bankName || employee.bankName || null;
      const bankBranch = primaryBank?.branchName || employee.bankBranch || null;
      const bankAccountNumber = primaryBank?.accountNumber || employee.bankAccountNumber || null;
      const bankAccountName = primaryBank?.accountName || employee.bankAccountName || null;

      const hasPayslip = Boolean(line.payslip);

      const hasValidatedBankDetails =
        Boolean(primaryBank && primaryBank.approvalStatus === 'APPROVED') ||
        Boolean(
          employee.bankDetailsStatus === 'VALIDATED' &&
            bankName &&
            bankAccountNumber &&
            bankAccountName,
        );

      const paymentStatus = !hasPayslip
        ? 'BLOCKED_PAYSLIP_MISSING'
        : hasValidatedBankDetails
          ? 'READY_FOR_PAYMENT'
          : 'PENDING_BANK_VALIDATION';

      const bankDetailsStatus = hasValidatedBankDetails
        ? 'VALIDATED'
        : employee.bankDetailsStatus || 'PENDING_VALIDATION';

      const validationNotes = !hasPayslip
        ? 'Payslip missing. Generate payslip before payment preparation.'
        : hasValidatedBankDetails
          ? 'Payslip generated and employee bank details validated.'
          : 'Payslip generated. Employee bank details require Finance validation.';

      await this.prisma.paymentBatchItem.create({
        data: {
          paymentBatchId: batch.id,
          payrollRunEmployeeId: line.id,
          employeeId: employee.id,
          employeeNumber: employee.employeeNumber,
          employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
          department: employee.department?.name || null,
          netPay: line.netPay,
          bankName,
          bankBranch,
          bankAccountNumber,
          bankAccountName,
          bankDetailsStatus,
          paymentStatus,
          validationNotes,
        },
      });
    }

    return {
      message: 'Payment batch created.',
      warning:
        blockedPayslipCount > 0
          ? 'One or more employees are blocked because payslips are missing.'
          : pendingBankValidationCount > 0
            ? 'One or more employees require Finance bank detail validation.'
            : null,
      batch: await this.getPaymentBatch(batch.id),
    };
  }

  async recheckPayslips(id: string, input: any) {
    const batch = await this.prisma.paymentBatch.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            employee: {
              include: {
                bankAccounts: {
                  orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
                },
              },
            },
            payrollRunEmployee: {
              include: {
                payslip: true,
              },
            },
          },
        },
      },
    });

    if (!batch) {
      throw new NotFoundException('Payment batch not found');
    }

    if (batch.status === 'APPROVED') {
      throw new BadRequestException('Approved payment batch cannot be refreshed.');
    }

    let refreshedCount = 0;
    let stillBlockedCount = 0;
    let pendingBankValidationCount = 0;

    for (const item of batch.items) {
      const hasPayslip = Boolean(item.payrollRunEmployee?.payslip);
      const employee = item.employee;
      const primaryBank = this.resolvePrimaryBank(employee);

      const bankName = primaryBank?.bankName || employee.bankName || null;
      const bankBranch = primaryBank?.branchName || employee.bankBranch || null;
      const bankAccountNumber = primaryBank?.accountNumber || employee.bankAccountNumber || null;
      const bankAccountName = primaryBank?.accountName || employee.bankAccountName || null;

      const hasValidatedBankDetails =
        Boolean(primaryBank && primaryBank.approvalStatus === 'APPROVED') ||
        Boolean(
          employee.bankDetailsStatus === 'VALIDATED' &&
            bankName &&
            bankAccountNumber &&
            bankAccountName,
        );

      if (!hasPayslip) {
        await this.prisma.paymentBatchItem.update({
          where: { id: item.id },
          data: {
            bankName,
            bankBranch,
            bankAccountNumber,
            bankAccountName,
            bankDetailsStatus: employee.bankDetailsStatus || 'PENDING_VALIDATION',
            paymentStatus: 'BLOCKED_PAYSLIP_MISSING',
            validationNotes: 'Payslip still missing. Generate payslip before payment preparation.',
          },
        });

        stillBlockedCount += 1;
        continue;
      }

      await this.prisma.paymentBatchItem.update({
        where: { id: item.id },
        data: {
          bankName,
          bankBranch,
          bankAccountNumber,
          bankAccountName,
          bankDetailsStatus: hasValidatedBankDetails
            ? 'VALIDATED'
            : employee.bankDetailsStatus || 'PENDING_VALIDATION',
          paymentStatus: hasValidatedBankDetails ? 'READY_FOR_PAYMENT' : 'PENDING_BANK_VALIDATION',
          validationNotes: hasValidatedBankDetails
            ? 'Payslip found and employee bank details validated. Ready for Finance preparation.'
            : 'Payslip found. Employee bank details require Finance validation.',
        },
      });

      if (hasValidatedBankDetails) {
        refreshedCount += 1;
      } else {
        pendingBankValidationCount += 1;
      }
    }

    const newStatus =
      stillBlockedCount > 0
        ? 'BLOCKED_PAYSLIPS_MISSING'
        : pendingBankValidationCount > 0
          ? 'PENDING_BANK_VALIDATION'
          : 'DRAFT';

    await this.prisma.paymentBatch.update({
      where: { id },
      data: {
        status: newStatus,
        evidenceNotes:
          stillBlockedCount > 0
            ? `Payslip recheck completed by ${
                input?.checkedBy || 'finance-manager-dev'
              }. ${stillBlockedCount} item(s) still blocked.`
            : pendingBankValidationCount > 0
              ? `Payslip recheck completed by ${
                  input?.checkedBy || 'finance-manager-dev'
                }. ${pendingBankValidationCount} employee bank record(s) need validation.`
              : `Payslip recheck completed by ${
                  input?.checkedBy || 'finance-manager-dev'
                }. All items are ready for Finance preparation.`,
      },
    });

    return {
      message:
        stillBlockedCount > 0
          ? 'Payslip recheck completed. Some items are still blocked.'
          : pendingBankValidationCount > 0
            ? 'Payslip recheck completed. Bank validation is still required.'
            : 'Payslip recheck completed. Payment batch is ready for Finance preparation.',
      refreshedCount,
      stillBlockedCount,
      pendingBankValidationCount,
      batch: await this.getPaymentBatch(id),
    };
  }

  async validateBankDetails(id: string, input: any) {
    const batch = await this.getPaymentBatch(id);

    if (batch.status === 'APPROVED') {
      throw new BadRequestException('Approved batch cannot be changed.');
    }

    let validatedCount = 0;
    let blockedCount = 0;

    for (const item of batch.items) {
      if (item.paymentStatus === 'BLOCKED_PAYSLIP_MISSING') {
        blockedCount += 1;
        continue;
      }

      if (!item.bankName || !item.bankAccountNumber || !item.bankAccountName) {
        await this.prisma.paymentBatchItem.update({
          where: { id: item.id },
          data: {
            bankDetailsStatus: 'PENDING_VALIDATION',
            paymentStatus: 'PENDING_BANK_VALIDATION',
            validationNotes: 'Bank details are incomplete. Finance must update employee bank details.',
          },
        });

        blockedCount += 1;
        continue;
      }

      await this.prisma.paymentBatchItem.update({
        where: { id: item.id },
        data: {
          bankDetailsStatus: 'VALIDATED',
          paymentStatus: 'READY_FOR_PAYMENT',
          validationNotes:
            input?.notes || 'Bank details validated by Finance for payment preparation.',
        },
      });

      validatedCount += 1;
    }

    const refreshedBatch = await this.getPaymentBatch(id);
    const notReady = refreshedBatch.items.filter(
      (item: any) => item.paymentStatus !== 'READY_FOR_PAYMENT',
    ).length;

    await this.prisma.paymentBatch.update({
      where: { id },
      data: {
        status: notReady > 0 ? 'PENDING_BANK_VALIDATION' : 'DRAFT',
        reviewedBy: input?.reviewedBy || 'finance-manager-dev',
        reviewedAt: new Date(),
        evidenceNotes:
          notReady > 0
            ? 'Bank validation completed with pending items.'
            : 'All bank details validated. Batch is ready for preparation.',
      },
    });

    return {
      message:
        notReady > 0
          ? 'Bank validation completed with pending items.'
          : 'Bank validation completed. Batch is ready for preparation.',
      validatedCount,
      blockedCount,
      batch: await this.getPaymentBatch(id),
    };
  }

  async preparePaymentBatch(id: string, input: any) {
    const batch = await this.getPaymentBatch(id);

    const notReady = batch.items.filter((item: any) => item.paymentStatus !== 'READY_FOR_PAYMENT');

    if (notReady.length > 0) {
      throw new BadRequestException(
        'Payment batch cannot be prepared until all items are ready for payment.',
      );
    }

    await this.prisma.paymentBatch.update({
      where: { id },
      data: {
        status: 'PREPARED',
        preparedAt: new Date(),
        preparedBy: input?.preparedBy || batch.preparedBy || 'finance-manager-dev',
        evidenceNotes:
          input?.notes || 'Payment batch prepared for manual Finance payment approval.',
      },
    });

    await this.prisma.paymentBatchItem.updateMany({
      where: { paymentBatchId: id },
      data: {
        paymentStatus: 'READY_FOR_PAYMENT',
      },
    });

    return {
      message: 'Payment batch prepared.',
      batch: await this.getPaymentBatch(id),
    };
  }

  async approvePaymentBatch(id: string, input: any) {
    const batch = await this.getPaymentBatch(id);

    if (batch.status !== 'PREPARED') {
      throw new BadRequestException('Only PREPARED payment batches can be approved.');
    }

    await this.prisma.paymentBatch.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: input?.approvedBy || 'finance-manager-dev',
        approvedAt: new Date(),
        evidenceNotes:
          input?.notes || 'Payment batch approved for manual payment processing.',
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

  private resolvePrimaryBank(employee: any) {
    if (!employee?.bankAccounts?.length) {
      return null;
    }

    return (
      employee.bankAccounts.find((account: any) => account.isPrimary) || employee.bankAccounts[0]
    );
  }
}