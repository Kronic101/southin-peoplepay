import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  FinanceEvidenceStatus,
  FinanceExpenseStatus,
  HubDocumentConfidentiality,
  HubDocumentStatus,
  OperationsModule,
  Prisma,
  ProcurementRequestStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * FinanceService
 * ------------------------------------------------------------
 * Production foundation for the Finance module in Southin Operations Hub.
 *
 * This service is intentionally database-backed. It replaces the earlier
 * browser/local-state Finance demo pages.
 *
 * Current scope:
 * - Finance expenses
 * - Procurement payment tracker
 * - Finance evidence register
 * - SharePoint package preparation records
 *
 * Future integration points:
 * - Shared approval matrix engine
 * - Microsoft Graph SharePoint publishing
 * - Asset Management procurement linkage
 * - Stores/stock movement cost linkage
 * - Fleet workshop cost linkage
 * - Director Finance approval thresholds
 */
@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  private async nextExpenseNo() {
    const count = await this.prisma.financeExpense.count();

    return `EXP-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }

  private async nextRequisitionNo() {
    const count = await this.prisma.procurementRequest.count();

    return `REQ-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }

  private money(value: unknown) {
    return Number(value || 0);
  }

  async getDashboard() {
    const [expenses, procurementRequests, evidenceRecords, financeDocuments, paymentBatches] =
      await Promise.all([
        this.prisma.financeExpense.findMany(),
        this.prisma.procurementRequest.findMany(),
        this.prisma.financePaymentEvidence.findMany(),
        this.prisma.hubDocument.findMany({
          where: {
            module: OperationsModule.FINANCE,
          },
        }),
        this.prisma.paymentBatch.findMany(),
      ]);

    const totalExpenses = expenses.reduce((sum, item) => sum + this.money(item.amount), 0);
    const approvedExpenses = expenses.filter((item) => item.status === FinanceExpenseStatus.APPROVED);
    const paidExpenses = expenses.filter((item) => item.status === FinanceExpenseStatus.PAID);
    const submittedExpenses = expenses.filter(
      (item) => item.status === FinanceExpenseStatus.SUBMITTED,
    );

    const procurementValue = procurementRequests.reduce(
      (sum, item) => sum + this.money(item.amount),
      0,
    );

    const paymentBatchValue = paymentBatches.reduce(
      (sum, item) => sum + this.money(item.totalNetPay),
      0,
    );

    return {
      summary: {
        expenses: {
          totalRecords: expenses.length,
          submitted: submittedExpenses.length,
          approved: approvedExpenses.length,
          paid: paidExpenses.length,
          totalValue: totalExpenses,
          paidValue: paidExpenses.reduce((sum, item) => sum + this.money(item.amount), 0),
        },
        procurement: {
          totalRecords: procurementRequests.length,
          totalValue: procurementValue,
          paid: procurementRequests.filter((item) => item.status === ProcurementRequestStatus.PAID)
            .length,
          invoiceReceived: procurementRequests.filter(
            (item) => item.invoiceStatus === 'RECEIVED',
          ).length,
        },
        evidence: {
          totalRecords: evidenceRecords.length,
          required: evidenceRecords.filter((item) => item.status === 'REQUIRED').length,
          approved: evidenceRecords.filter((item) => item.status === 'APPROVED').length,
          published: evidenceRecords.filter((item) => item.status === 'PUBLISHED').length,
        },
        paymentBatches: {
          totalRecords: paymentBatches.length,
          totalNetPay: paymentBatchValue,
          approved: paymentBatches.filter((item) => item.status === 'APPROVED').length,
        },
        sharePointPackages: {
          totalRecords: financeDocuments.length,
          ready: financeDocuments.filter(
            (item) => item.status === HubDocumentStatus.APPROVED,
          ).length,
          published: financeDocuments.filter(
            (item) => item.status === HubDocumentStatus.PUBLISHED_TO_SHAREPOINT,
          ).length,
        },
      },
      recent: {
        expenses: expenses
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 5),
        procurementRequests: procurementRequests
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 5),
      },
    };
  }

  async getExpenses() {
    const expenses = await this.prisma.financeExpense.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    const totalValue = expenses.reduce((sum, item) => sum + this.money(item.amount), 0);

    return {
      summary: {
        totalRecords: expenses.length,
        totalValue,
        submitted: expenses.filter((item) => item.status === FinanceExpenseStatus.SUBMITTED).length,
        approved: expenses.filter((item) => item.status === FinanceExpenseStatus.APPROVED).length,
        rejected: expenses.filter((item) => item.status === FinanceExpenseStatus.REJECTED).length,
        paid: expenses.filter((item) => item.status === FinanceExpenseStatus.PAID).length,
      },
      expenses,
    };
  }

  async createExpense(body: any) {
    if (!body?.category) {
      throw new BadRequestException('Expense category is required.');
    }

    if (!body?.description) {
      throw new BadRequestException('Expense description is required.');
    }

    const amount = Number(body?.amount || 0);

    if (!amount || amount <= 0) {
      throw new BadRequestException('Expense amount must be greater than zero.');
    }

    const expense = await this.prisma.financeExpense.create({
      data: {
        expenseNo: body.expenseNo || (await this.nextExpenseNo()),
        category: String(body.category),
        description: String(body.description),
        amount: new Prisma.Decimal(amount),
        department: body.department || null,
        site: body.site || null,
        payee: body.payee || null,
        requestedBy: body.requestedBy || 'finance-demo-user',
        requestedByEmail: body.requestedByEmail || null,
        status: FinanceExpenseStatus.SUBMITTED,
        evidenceStatus: FinanceEvidenceStatus.REQUIRED,
        payload: body.payload || Prisma.JsonNull,
      },
    });

    await this.createEvidence({
      evidenceType: 'EXPENSE_REQUEST',
      title: `Expense evidence required - ${expense.expenseNo}`,
      expenseId: expense.id,
      status: 'REQUIRED',
      notes: 'Expense submitted. Supporting invoice, receipt, or approval evidence is required.',
      createdBy: body.requestedBy || 'finance-demo-user',
    });

    return expense;
  }

  async approveExpense(id: string, body: any) {
    const expense = await this.findExpense(id);

    if (expense.status !== FinanceExpenseStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted expenses can be approved.');
    }

    return this.prisma.financeExpense.update({
      where: { id },
      data: {
        status: FinanceExpenseStatus.APPROVED,
        evidenceStatus: FinanceEvidenceStatus.READY_FOR_SHAREPOINT,
        financeComment: body?.financeComment || 'Approved by Finance for payment preparation.',
        payload: body?.payload || expense.payload || Prisma.JsonNull,
      },
    });
  }

  async rejectExpense(id: string, body: any) {
    const expense = await this.findExpense(id);

    if (expense.status !== FinanceExpenseStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted expenses can be rejected.');
    }

    return this.prisma.financeExpense.update({
      where: { id },
      data: {
        status: FinanceExpenseStatus.REJECTED,
        evidenceStatus: FinanceEvidenceStatus.REQUIRED,
        financeComment: body?.financeComment || 'Rejected by Finance.',
      },
    });
  }

  async markExpensePaid(id: string, body: any) {
    const expense = await this.findExpense(id);

    if (expense.status !== FinanceExpenseStatus.APPROVED) {
      throw new BadRequestException('Only approved expenses can be marked as paid.');
    }

    const updated = await this.prisma.financeExpense.update({
      where: { id },
      data: {
        status: FinanceExpenseStatus.PAID,
        evidenceStatus: FinanceEvidenceStatus.READY_FOR_SHAREPOINT,
        paidBy: body?.paidBy || 'finance-manager-dev',
        paidAt: new Date(),
        paymentReference: body?.paymentReference || null,
        financeComment:
          body?.financeComment ||
          expense.financeComment ||
          'Payment completed. Evidence ready for Finance records.',
      },
    });

    await this.createEvidence({
      evidenceType: 'EXPENSE_PAYMENT',
      title: `Payment evidence required - ${expense.expenseNo}`,
      expenseId: expense.id,
      status: 'REQUIRED',
      notes: 'Expense marked as paid. Proof of payment should be attached or published.',
      createdBy: body?.paidBy || 'finance-manager-dev',
    });

    return updated;
  }

  private async findExpense(id: string) {
    const expense = await this.prisma.financeExpense.findUnique({
      where: { id },
    });

    if (!expense) {
      throw new NotFoundException('Finance expense not found.');
    }

    return expense;
  }

  async getProcurementPayments() {
    const records = await this.prisma.procurementRequest.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      summary: {
        totalRecords: records.length,
        totalValue: records.reduce((sum, item) => sum + this.money(item.amount), 0),
        invoicePending: records.filter((item) => item.invoiceStatus !== 'RECEIVED').length,
        paymentPending: records.filter((item) => item.paymentStatus !== 'PAID').length,
        paid: records.filter((item) => item.status === ProcurementRequestStatus.PAID).length,
      },
      records,
    };
  }

  async createProcurementPayment(body: any) {
    if (!body?.department) {
      throw new BadRequestException('Department is required.');
    }

    if (!body?.description) {
      throw new BadRequestException('Description is required.');
    }

    const amount = Number(body?.amount || 0);

    if (!amount || amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero.');
    }

    return this.prisma.procurementRequest.create({
      data: {
        requisitionNo: body.requisitionNo || (await this.nextRequisitionNo()),
        department: body.department,
        site: body.site || null,
        requestedBy: body.requestedBy || 'procurement-demo-user',
        supplierName: body.supplierName || body.supplier || null,
        description: body.description,
        amount: new Prisma.Decimal(amount),
        procurementStage: body.procurementStage || 'REQUISITION_SUBMITTED',
        financeStage: body.financeStage || 'NOT_REVIEWED',
        status: ProcurementRequestStatus.SUBMITTED,
        invoiceStatus: body.invoiceStatus || 'PENDING',
        paymentStatus: body.paymentStatus || 'NOT_PAID',
        proofOfPaymentStatus: body.proofOfPaymentStatus || 'NOT_UPLOADED',
        purchaseOrderNo: body.purchaseOrderNo || null,
        invoiceNo: body.invoiceNo || null,
        goodsReceivedNote: body.goodsReceivedNote || null,
        payload: body.payload || Prisma.JsonNull,
      },
    });
  }

  async markProcurementInvoiceReceived(id: string, body: any) {
    const record = await this.findProcurementRequest(id);

    return this.prisma.procurementRequest.update({
      where: { id },
      data: {
        invoiceStatus: 'RECEIVED',
        invoiceNo: body?.invoiceNo || record.invoiceNo,
        financeStage: 'INVOICE_RECEIVED',
        status: ProcurementRequestStatus.INVOICE_RECEIVED,
      },
    });
  }

  async markProcurementPaid(id: string, body: any) {
    const record = await this.findProcurementRequest(id);

    const updated = await this.prisma.procurementRequest.update({
      where: { id },
      data: {
        paymentStatus: 'PAID',
        proofOfPaymentStatus: body?.proofOfPaymentStatus || 'UPLOADED',
        financeStage: 'PAYMENT_COMPLETED',
        status: ProcurementRequestStatus.PAID,
      },
    });

    await this.createEvidence({
      evidenceType: 'PROCUREMENT_PAYMENT',
      title: `Procurement payment evidence - ${record.requisitionNo}`,
      procurementId: record.id,
      status: 'REQUIRED',
      notes: 'Procurement payment completed. Proof of payment and invoice pack required.',
      createdBy: body?.paidBy || 'finance-manager-dev',
    });

    return updated;
  }

  async markProcurementPopUploaded(id: string) {
    await this.findProcurementRequest(id);

    return this.prisma.procurementRequest.update({
      where: { id },
      data: {
        proofOfPaymentStatus: 'UPLOADED',
      },
    });
  }

  private async findProcurementRequest(id: string) {
    const record = await this.prisma.procurementRequest.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException('Procurement payment record not found.');
    }

    return record;
  }

  async getEvidence() {
    const evidence = await this.prisma.financePaymentEvidence.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      summary: {
        totalRecords: evidence.length,
        required: evidence.filter((item) => item.status === 'REQUIRED').length,
        uploaded: evidence.filter((item) => item.status === 'UPLOADED').length,
        approved: evidence.filter((item) => item.status === 'APPROVED').length,
        published: evidence.filter((item) => item.status === 'PUBLISHED').length,
      },
      evidence,
    };
  }

  async createEvidence(body: any) {
    return this.prisma.financePaymentEvidence.create({
      data: {
        expenseId: body.expenseId || null,
        paymentBatchId: body.paymentBatchId || null,
        procurementId: body.procurementId || null,
        evidenceType: body.evidenceType || 'GENERAL_FINANCE_EVIDENCE',
        title: body.title || 'Finance evidence record',
        status: body.status || 'REQUIRED',
        documentId: body.documentId || null,
        notes: body.notes || null,
        createdBy: body.createdBy || 'finance-demo-user',
      },
    });
  }

  async updateEvidenceStatus(id: string, status: string, body: any = {}) {
    const record = await this.prisma.financePaymentEvidence.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException('Finance evidence record not found.');
    }

    return this.prisma.financePaymentEvidence.update({
      where: { id },
      data: {
        status,
        documentId: body.documentId || record.documentId,
        notes: body.notes || record.notes,
      },
    });
  }

  async getSharePointPackage() {
    const documents = await this.prisma.hubDocument.findMany({
      where: {
        module: OperationsModule.FINANCE,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      summary: {
        totalRecords: documents.length,
        draft: documents.filter((item) => item.status === HubDocumentStatus.DRAFT).length,
        uploaded: documents.filter((item) => item.status === HubDocumentStatus.UPLOADED).length,
        approved: documents.filter((item) => item.status === HubDocumentStatus.APPROVED).length,
        published: documents.filter(
          (item) => item.status === HubDocumentStatus.PUBLISHED_TO_SHAREPOINT,
        ).length,
      },
      documents,
    };
  }

  async prepareSharePointPackage(body: any) {
    const title = body?.title || 'Finance SharePoint publishing package';
    const documentType = body?.documentType || 'FINANCE_PACKAGE';

    return this.prisma.hubDocument.create({
      data: {
        module: OperationsModule.FINANCE,
        sourceEntityType: body?.sourceEntityType || 'FINANCE_PACKAGE',
        sourceEntityId: body?.sourceEntityId || null,
        title,
        documentType,
        fileName: body?.fileName || null,
        mimeType: body?.mimeType || null,
        fileSizeBytes: body?.fileSizeBytes || null,
        storageProvider: body?.storageProvider || 'LOCAL_DEV',
        storagePath: body?.storagePath || null,
        sharePointUrl: body?.sharePointUrl || null,
        status: HubDocumentStatus.DRAFT,
        confidentiality:
          body?.confidentiality || HubDocumentConfidentiality.CONFIDENTIAL_FINANCE,
        uploadedBy: body?.uploadedBy || 'finance-demo-user',
        metadata: body?.metadata || Prisma.JsonNull,
      },
    });
  }

  async markSharePointPackageReady(id: string) {
    await this.findFinanceDocument(id);

    return this.prisma.hubDocument.update({
      where: { id },
      data: {
        status: HubDocumentStatus.APPROVED,
        approvedBy: 'finance-manager-dev',
        approvedAt: new Date(),
      },
    });
  }

  async markSharePointPackagePublished(id: string, body: any) {
    await this.findFinanceDocument(id);

    return this.prisma.hubDocument.update({
      where: { id },
      data: {
        status: HubDocumentStatus.PUBLISHED_TO_SHAREPOINT,
        sharePointUrl: body?.sharePointUrl || null,
      },
    });
  }

  private async findFinanceDocument(id: string) {
    const document = await this.prisma.hubDocument.findFirst({
      where: {
        id,
        module: OperationsModule.FINANCE,
      },
    });

    if (!document) {
      throw new NotFoundException('Finance SharePoint package record not found.');
    }

    return document;
  }
}