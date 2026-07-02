import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ApprovalRequestStatus,
  ApprovalWorkflowType,
  FinanceEvidenceStatus,
  FinanceExpenseStatus,
  HubDocumentConfidentiality,
  HubDocumentStatus,
  OperationsModule,
  FinanceExportFormat,
  FinanceReportExportStatus,
  FinanceReportType,
  Prisma,
  ProcurementRequestStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ApprovalsService } from '../approvals/approvals.service';
import { ApprovalWorkflowService } from '../approvals/approval-workflow.service';

/**
 * FinanceService
 * ------------------------------------------------------------
 * Production finance workflow service for Southin Operations Hub.
 *
 * Connected workflows:
 * - Finance expenses now create ApprovalRequest records.
 * - Procurement payment records now create ApprovalRequest records.
 * - Approval/rejection actions flow through the shared approval matrix.
 */
@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approvalWorkflowService: ApprovalWorkflowService,
    private readonly approvalsService: ApprovalsService,
  ) {}

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
          where: { module: OperationsModule.FINANCE },
        }),
        this.prisma.paymentBatch.findMany(),
      ]);

    const totalExpenses = expenses.reduce((sum, item) => sum + this.money(item.amount), 0);
    const paidExpenses = expenses.filter((item) => item.status === FinanceExpenseStatus.PAID);

    const fleetExpenses = expenses.filter((item) =>
      String(item.category || '').toUpperCase().startsWith('FLEET_'),
    );

    const fleetExpenseValue = fleetExpenses.reduce(
      (sum, item) => sum + this.money(item.amount),
      0,
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
          submitted: expenses.filter((item) => item.status === FinanceExpenseStatus.SUBMITTED).length,
          inReview: expenses.filter((item) => item.status === FinanceExpenseStatus.IN_REVIEW).length,
          approved: expenses.filter((item) => item.status === FinanceExpenseStatus.APPROVED).length,
          paid: paidExpenses.length,
          totalValue: totalExpenses,
          paidValue: paidExpenses.reduce((sum, item) => sum + this.money(item.amount), 0),
        },

        fleetExpenses: {
          totalRecords: fleetExpenses.length,
          totalValue: fleetExpenseValue,
        },

        procurement: {
          totalRecords: procurementRequests.length,
          totalValue: procurementValue,
          submitted: procurementRequests.filter(
            (item) => item.status === ProcurementRequestStatus.SUBMITTED,
          ).length,
          approved: procurementRequests.filter(
            (item) => item.status === ProcurementRequestStatus.APPROVED,
          ).length,
          paid: procurementRequests.filter((item) => item.status === ProcurementRequestStatus.PAID)
            .length,
          invoiceReceived: procurementRequests.filter((item) => item.invoiceStatus === 'RECEIVED')
            .length,
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
          ready: financeDocuments.filter((item) => item.status === HubDocumentStatus.APPROVED)
            .length,
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
      orderBy: { createdAt: 'desc' },
    });

    return {
      summary: {
        totalRecords: expenses.length,
        totalValue: expenses.reduce((sum, item) => sum + this.money(item.amount), 0),
        submitted: expenses.filter((item) => item.status === FinanceExpenseStatus.SUBMITTED).length,
        inReview: expenses.filter((item) => item.status === FinanceExpenseStatus.IN_REVIEW).length,
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
        status: FinanceExpenseStatus.IN_REVIEW,
        evidenceStatus: FinanceEvidenceStatus.REQUIRED,
        payload: body.payload || Prisma.JsonNull,
      },
    });

    const approvalRequest = await this.approvalsService.createApprovalRequest({
      module: OperationsModule.FINANCE,
      workflowType: ApprovalWorkflowType.EXPENSE_REQUEST,
      requestTitle: `Finance expense approval - ${expense.expenseNo}`,
      requestReference: expense.expenseNo,
      requestDescription: expense.description,
      requesterName: expense.requestedBy || undefined,
      requesterRole: 'FINANCE_REQUESTER',
      requesterDepartment: expense.department || undefined,
      requesterSite: expense.site || undefined,
      amount,
      sourceEntityType: 'FinanceExpense',
      sourceEntityId: expense.id,
      payload: {
        expenseNo: expense.expenseNo,
        category: expense.category,
        payee: expense.payee,
        evidenceRequired: true,
      },
    });

    const updatedExpense = await this.prisma.financeExpense.update({
      where: { id: expense.id },
      data: {
        approvalRequestId: approvalRequest?.id || null,
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

    return updatedExpense;
  }

  async approveExpense(id: string, body: any) {
    const expense = await this.findExpense(id);

    if (!expense.approvalRequestId) {
      throw new BadRequestException('This expense is not connected to an approval request.');
    }

    if (expense.status === FinanceExpenseStatus.REJECTED || expense.status === FinanceExpenseStatus.PAID) {
      throw new BadRequestException('This expense can no longer be approved.');
    }

    const approvalRequest = await this.approvalsService.getApprovalRequest(expense.approvalRequestId);

    if (approvalRequest.status === ApprovalRequestStatus.APPROVED) {
      return this.prisma.financeExpense.update({
        where: { id },
        data: {
          status: FinanceExpenseStatus.APPROVED,
          evidenceStatus: FinanceEvidenceStatus.READY_FOR_SHAREPOINT,
          financeComment: body?.financeComment || 'Approval workflow already complete.',
        },
      });
    }

    const nextStep = approvalRequest.decisions.find((item: any) => item.status === 'PENDING');

    if (!nextStep) {
      throw new BadRequestException('No pending approval step found.');
    }

    const updatedApproval = await this.approvalsService.recordDecision(expense.approvalRequestId, {
      sequence: nextStep.sequence,
      decision: 'APPROVED',
      approverName: body?.approverName || this.friendlyApproverName(nextStep.role),
      approverEmail: body?.approverEmail || 'finance@southincon.com',
      comments: body?.financeComment || `Approved at step ${nextStep.sequence}.`,
    });

    const isFullyApproved = updatedApproval?.status === ApprovalRequestStatus.APPROVED;

    return this.prisma.financeExpense.update({
      where: { id },
      data: {
        status: isFullyApproved ? FinanceExpenseStatus.APPROVED : FinanceExpenseStatus.IN_REVIEW,
        evidenceStatus: isFullyApproved
          ? FinanceEvidenceStatus.READY_FOR_SHAREPOINT
          : FinanceEvidenceStatus.REQUIRED,
        financeComment: isFullyApproved
          ? 'Expense approval workflow completed.'
          : `Approval step ${nextStep.sequence} completed. Awaiting next approver.`,
      },
    });
  }

  async rejectExpense(id: string, body: any) {
    const expense = await this.findExpense(id);

    if (!expense.approvalRequestId) {
      throw new BadRequestException('This expense is not connected to an approval request.');
    }

    const approvalRequest = await this.approvalsService.getApprovalRequest(expense.approvalRequestId);
    const nextStep = approvalRequest.decisions.find((item: any) => item.status === 'PENDING');

    if (!nextStep) {
      throw new BadRequestException('No pending approval step found.');
    }

    await this.approvalsService.recordDecision(expense.approvalRequestId, {
      sequence: nextStep.sequence,
      decision: 'REJECTED',
      approverName: body?.approverName || this.friendlyApproverName(nextStep.role),
      approverEmail: body?.approverEmail || 'finance@southincon.com',
      comments: body?.financeComment || 'Rejected through finance approval workflow.',
    });

    return this.prisma.financeExpense.update({
      where: { id },
      data: {
        status: FinanceExpenseStatus.REJECTED,
        evidenceStatus: FinanceEvidenceStatus.REQUIRED,
        financeComment: body?.financeComment || 'Rejected through approval workflow.',
      },
    });
  }

  async markExpensePaid(id: string, body: any) {
    const expense = await this.findExpense(id);

    if (expense.status !== FinanceExpenseStatus.APPROVED) {
      throw new BadRequestException('Only fully approved expenses can be marked as paid.');
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
      orderBy: { createdAt: 'desc' },
    });

    return {
      summary: {
        totalRecords: records.length,
        totalValue: records.reduce((sum, item) => sum + this.money(item.amount), 0),
        submitted: records.filter((item) => item.status === ProcurementRequestStatus.SUBMITTED)
          .length,
        approved: records.filter((item) => item.status === ProcurementRequestStatus.APPROVED)
          .length,
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

    const record = await this.prisma.procurementRequest.create({
      data: {
        requisitionNo: body.requisitionNo || (await this.nextRequisitionNo()),
        department: body.department,
        site: body.site || null,
        requestedBy: body.requestedBy || 'procurement-demo-user',
        requestedByEmail: body.requestedByEmail || null,
        requestedByEntraId: body.requestedByEntraId || null,
        requestedByRole: body.requestedByRole || null,
        supplierName: body.supplierName || body.supplier || null,
        description: body.description,
        amount: new Prisma.Decimal(amount),
        procurementStage: 'REQUISITION_SUBMITTED',
        financeStage: 'AWAITING_APPROVAL',
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

    const approvalRequest = await this.approvalsService.createApprovalRequest({
      module: OperationsModule.PROCUREMENT,
      workflowType: ApprovalWorkflowType.PROCUREMENT_REQUEST,
      requestTitle: `Procurement payment approval - ${record.requisitionNo}`,
      requestReference: record.requisitionNo,
      requestDescription: record.description,
      requesterName: record.requestedBy || undefined,
      requesterEmail: record.requestedByEmail || undefined,
      requesterEntraId: record.requestedByEntraId || undefined,
      requesterRole: record.requestedByRole || 'PROCUREMENT_REQUESTER',
      requesterDepartment: record.department,
      requesterSite: record.site || undefined,
      amount,
      sourceEntityType: 'ProcurementRequest',
      sourceEntityId: record.id,
      payload: {
        requisitionNo: record.requisitionNo,
        supplierName: record.supplierName,
        invoiceStatus: record.invoiceStatus,
        paymentStatus: record.paymentStatus,
        requesterAudit: {
          requestedBy: record.requestedBy,
          requestedByEmail: record.requestedByEmail,
          requestedByEntraId: record.requestedByEntraId,
          requestedByRole: record.requestedByRole,
        },
      },
    });

    return this.prisma.procurementRequest.update({
      where: { id: record.id },
      data: {
        approvalRequestId: approvalRequest?.id || null,
      },
    });
  }

  async approveProcurementPayment(id: string, body: any) {
    const record = await this.findProcurementRequest(id);

    if (!record.approvalRequestId) {
      throw new BadRequestException('This procurement record is not connected to approval workflow.');
    }

    if (
      record.status === ProcurementRequestStatus.REJECTED ||
      record.status === ProcurementRequestStatus.PAID
    ) {
      throw new BadRequestException('This procurement record can no longer be approved.');
    }

    const approvalRequest = await this.approvalsService.getApprovalRequest(record.approvalRequestId);
    const nextStep = approvalRequest.decisions.find((item: any) => item.status === 'PENDING');

    if (!nextStep) {
      throw new BadRequestException('No pending approval step found.');
    }

    const updatedApproval = await this.approvalsService.recordDecision(record.approvalRequestId, {
      sequence: nextStep.sequence,
      decision: 'APPROVED',
      approverName: body?.approverName || this.friendlyApproverName(nextStep.role),
      approverEmail: body?.approverEmail || 'procurement@southincon.com',
      comments: body?.comments || `Approved at step ${nextStep.sequence}.`,
    });

    const isFullyApproved = updatedApproval?.status === ApprovalRequestStatus.APPROVED;

    return this.prisma.procurementRequest.update({
      where: { id },
      data: {
        status: isFullyApproved
          ? ProcurementRequestStatus.APPROVED
          : ProcurementRequestStatus.SUBMITTED,
        procurementStage: isFullyApproved ? 'APPROVED' : 'APPROVAL_IN_PROGRESS',
        financeStage: isFullyApproved ? 'APPROVED_FOR_FINANCE_REVIEW' : 'AWAITING_APPROVAL',
      },
    });
  }

  async rejectProcurementPayment(id: string, body: any) {
    const record = await this.findProcurementRequest(id);

    if (!record.approvalRequestId) {
      throw new BadRequestException('This procurement record is not connected to approval workflow.');
    }

    const approvalRequest = await this.approvalsService.getApprovalRequest(record.approvalRequestId);
    const nextStep = approvalRequest.decisions.find((item: any) => item.status === 'PENDING');

    if (!nextStep) {
      throw new BadRequestException('No pending approval step found.');
    }

    await this.approvalsService.recordDecision(record.approvalRequestId, {
      sequence: nextStep.sequence,
      decision: 'REJECTED',
      approverName: body?.approverName || this.friendlyApproverName(nextStep.role),
      approverEmail: body?.approverEmail || 'procurement@southincon.com',
      comments: body?.comments || 'Rejected through procurement approval workflow.',
    });

    return this.prisma.procurementRequest.update({
      where: { id },
      data: {
        status: ProcurementRequestStatus.REJECTED,
        procurementStage: 'REJECTED',
        financeStage: 'REJECTED',
      },
    });
  }

  async markProcurementInvoiceReceived(id: string, body: any) {
    const record = await this.findProcurementRequest(id);

    if (record.status !== ProcurementRequestStatus.APPROVED) {
      throw new BadRequestException('Procurement must be fully approved before invoice processing.');
    }

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

    if (
      record.status !== ProcurementRequestStatus.APPROVED &&
      record.status !== ProcurementRequestStatus.INVOICE_RECEIVED
    ) {
      throw new BadRequestException('Procurement must be approved before payment can be marked.');
    }

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
      orderBy: { createdAt: 'desc' },
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
      where: { module: OperationsModule.FINANCE },
      orderBy: { createdAt: 'desc' },
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
    return this.prisma.hubDocument.create({
      data: {
        module: OperationsModule.FINANCE,
        sourceEntityType: body?.sourceEntityType || 'FINANCE_PACKAGE',
        sourceEntityId: body?.sourceEntityId || null,
        title: body?.title || 'Finance SharePoint publishing package',
        documentType: body?.documentType || 'FINANCE_PACKAGE',
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

  private friendlyApproverName(role: string) {
    return String(role)
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

    private csvEscape(value: unknown) {
    if (value === null || value === undefined) {
      return '';
    }

    const text = String(value).replace(/"/g, '""');

    if (text.includes(',') || text.includes('\n') || text.includes('"')) {
      return `"${text}"`;
    }

    return text;
  }

  private toCsv(headers: string[], rows: unknown[][]) {
    const headerLine = headers.map((item) => this.csvEscape(item)).join(',');
    const rowLines = rows.map((row) => row.map((item) => this.csvEscape(item)).join(','));

    return [headerLine, ...rowLines].join('\n');
  }

  private async logFinanceExport(payload: {
    reportType: FinanceReportType;
    exportFormat: FinanceExportFormat;
    requestedBy?: string;
    requestedByEmail?: string;
    filterPayload?: unknown;
    resultSummary?: unknown;
    fileName?: string;
    errorMessage?: string;
  }) {
    return this.prisma.financeReportExportLog.create({
      data: {
        reportType: payload.reportType,
        exportFormat: payload.exportFormat,
        status: payload.errorMessage
          ? FinanceReportExportStatus.FAILED
          : FinanceReportExportStatus.GENERATED,
        requestedBy: payload.requestedBy || 'finance-demo-user',
        requestedByEmail: payload.requestedByEmail || null,
        filterPayload: payload.filterPayload as Prisma.InputJsonValue,
        resultSummary: payload.resultSummary as Prisma.InputJsonValue,
        fileName: payload.fileName || null,
        errorMessage: payload.errorMessage || null,
      },
    });
  }

    async getCombinedFinanceReports() {
    const summary = await this.getFinanceReportSummary();
    const departmentCosts = await this.getDepartmentCostReport();
    const siteCosts = await this.getSiteCostReport();
    const outstandingPayments = await this.getOutstandingPaymentsReport();
    const approvalStatus = await this.getApprovalStatusReport();
    const exportLogs = await this.getFinanceExportLogs();

    return {
      generatedAt: new Date().toISOString(),
      summary,
      departmentCosts,
      siteCosts,
      outstandingPayments,
      approvalStatus,
      exportLogs,
    };
  }

  async getFinanceReportSummary() {
    const expenses = await this.prisma.financeExpense.findMany();

    const procurementRequests = await this.prisma.procurementRequest.findMany();

    const evidence = await this.prisma.financePaymentEvidence.findMany();

    const paymentBatches = await this.prisma.paymentBatch.findMany();

    const sharePointPackages = await this.prisma.hubDocument.findMany({
      where: {
        module: OperationsModule.FINANCE,
      },
    });

    const approvalRequests = await this.prisma.approvalRequest.findMany({
      where: {
        OR: [
          { sourceEntityType: 'FinanceExpense' },
          { sourceEntityType: 'ProcurementRequest' },
          { module: OperationsModule.FINANCE },
          { module: OperationsModule.PROCUREMENT },
        ],
      },
    });

    const approvedUnpaidExpenses = expenses.filter(
      (item) => item.status === FinanceExpenseStatus.APPROVED,
    );

    const procurementPaymentPending = procurementRequests.filter(
      (item) => item.paymentStatus !== 'PAID',
    );

    const summary = {
      expenses: {
        totalRecords: expenses.length,
        totalValue: expenses.reduce((sum, item) => sum + this.money(item.amount), 0),
        submitted: expenses.filter((item) => item.status === FinanceExpenseStatus.SUBMITTED).length,
        inReview: expenses.filter((item) => item.status === FinanceExpenseStatus.IN_REVIEW).length,
        approved: expenses.filter((item) => item.status === FinanceExpenseStatus.APPROVED).length,
        rejected: expenses.filter((item) => item.status === FinanceExpenseStatus.REJECTED).length,
        paid: expenses.filter((item) => item.status === FinanceExpenseStatus.PAID).length,
        outstandingApprovedValue: approvedUnpaidExpenses.reduce(
          (sum, item) => sum + this.money(item.amount),
          0,
        ),
      },
      procurement: {
        totalRecords: procurementRequests.length,
        totalValue: procurementRequests.reduce((sum, item) => sum + this.money(item.amount), 0),
        submitted: procurementRequests.filter(
          (item) => item.status === ProcurementRequestStatus.SUBMITTED,
        ).length,
        approved: procurementRequests.filter(
          (item) => item.status === ProcurementRequestStatus.APPROVED,
        ).length,
        paid: procurementRequests.filter((item) => item.status === ProcurementRequestStatus.PAID)
          .length,
        pendingPayment: procurementPaymentPending.length,
        pendingPaymentValue: procurementPaymentPending.reduce(
          (sum, item) => sum + this.money(item.amount),
          0,
        ),
      },
      evidence: {
        totalRecords: evidence.length,
        required: evidence.filter((item) => item.status === 'REQUIRED').length,
        uploaded: evidence.filter((item) => item.status === 'UPLOADED').length,
        approved: evidence.filter((item) => item.status === 'APPROVED').length,
        readyForSharePoint: evidence.filter((item) => item.status === 'READY_FOR_SHAREPOINT').length,
        published: evidence.filter((item) => item.status === 'PUBLISHED').length,
      },
      payrollPayments: {
        paymentBatchRecords: paymentBatches.length,
        totalNetPay: paymentBatches.reduce((sum, item) => sum + this.money(item.totalNetPay), 0),
        approvedBatches: paymentBatches.filter((item) => item.status === 'APPROVED').length,
      },
      sharePointPackages: {
        totalRecords: sharePointPackages.length,
        draft: sharePointPackages.filter((item) => item.status === HubDocumentStatus.DRAFT).length,
        approved: sharePointPackages.filter((item) => item.status === HubDocumentStatus.APPROVED)
          .length,
        published: sharePointPackages.filter(
          (item) => item.status === HubDocumentStatus.PUBLISHED_TO_SHAREPOINT,
        ).length,
      },
      approvals: {
        totalRecords: approvalRequests.length,
        submitted: approvalRequests.filter((item) => item.status === ApprovalRequestStatus.SUBMITTED)
          .length,
        inReview: approvalRequests.filter((item) => item.status === ApprovalRequestStatus.IN_REVIEW)
          .length,
        approved: approvalRequests.filter((item) => item.status === ApprovalRequestStatus.APPROVED)
          .length,
        rejected: approvalRequests.filter((item) => item.status === ApprovalRequestStatus.REJECTED)
          .length,
      },
    };

    await this.logFinanceExport({
      reportType: FinanceReportType.SUMMARY,
      exportFormat: FinanceExportFormat.JSON,
      resultSummary: summary,
    });

    return {
      generatedAt: new Date().toISOString(),
      currency: 'ZMW',
      summary,
    };
  }

  async getDepartmentCostReport() {
    const expenses = await this.prisma.financeExpense.findMany();

    const procurementRequests = await this.prisma.procurementRequest.findMany();

    const paymentBatchItems = await this.prisma.paymentBatchItem.findMany();

    const map = new Map<
      string,
      {
        department: string;
        expenseValue: number;
        procurementValue: number;
        payrollNetValue: number;
        totalValue: number;
      }
    >();

    function ensureDepartment(department?: string | null) {
      const key = department || 'Unassigned';

      if (!map.has(key)) {
        map.set(key, {
          department: key,
          expenseValue: 0,
          procurementValue: 0,
          payrollNetValue: 0,
          totalValue: 0,
        });
      }

      return map.get(key)!;
    }

    for (const expense of expenses) {
      const row = ensureDepartment(expense.department);
      row.expenseValue += this.money(expense.amount);
      row.totalValue += this.money(expense.amount);
    }

    for (const procurement of procurementRequests) {
      const row = ensureDepartment(procurement.department);
      row.procurementValue += this.money(procurement.amount);
      row.totalValue += this.money(procurement.amount);
    }

    for (const item of paymentBatchItems) {
      const row = ensureDepartment(item.department);
      row.payrollNetValue += this.money(item.netPay);
      row.totalValue += this.money(item.netPay);
    }

    const rows = Array.from(map.values()).sort((a, b) => b.totalValue - a.totalValue);

    await this.logFinanceExport({
      reportType: FinanceReportType.DEPARTMENT_COSTS,
      exportFormat: FinanceExportFormat.JSON,
      resultSummary: {
        totalDepartments: rows.length,
        totalValue: rows.reduce((sum, item) => sum + item.totalValue, 0),
      },
    });

    return {
      generatedAt: new Date().toISOString(),
      currency: 'ZMW',
      rows,
    };
  }

  async getSiteCostReport() {
    const expenses = await this.prisma.financeExpense.findMany();

    const procurementRequests = await this.prisma.procurementRequest.findMany();

    const map = new Map<
      string,
      {
        site: string;
        expenseValue: number;
        procurementValue: number;
        totalValue: number;
      }
    >();

    function ensureSite(site?: string | null) {
      const key = site || 'Unassigned';

      if (!map.has(key)) {
        map.set(key, {
          site: key,
          expenseValue: 0,
          procurementValue: 0,
          totalValue: 0,
        });
      }

      return map.get(key)!;
    }

    for (const expense of expenses) {
      const row = ensureSite(expense.site);
      row.expenseValue += this.money(expense.amount);
      row.totalValue += this.money(expense.amount);
    }

    for (const procurement of procurementRequests) {
      const row = ensureSite(procurement.site);
      row.procurementValue += this.money(procurement.amount);
      row.totalValue += this.money(procurement.amount);
    }

    const rows = Array.from(map.values()).sort((a, b) => b.totalValue - a.totalValue);

    await this.logFinanceExport({
      reportType: FinanceReportType.SITE_COSTS,
      exportFormat: FinanceExportFormat.JSON,
      resultSummary: {
        totalSites: rows.length,
        totalValue: rows.reduce((sum, item) => sum + item.totalValue, 0),
      },
    });

    return {
      generatedAt: new Date().toISOString(),
      currency: 'ZMW',
      rows,
    };
  }

  async getOutstandingPaymentsReport() {
    const expenses = await this.prisma.financeExpense.findMany({
      where: {
        status: FinanceExpenseStatus.APPROVED,
      },
    });

    const procurementRequests = await this.prisma.procurementRequest.findMany({
      where: {
        paymentStatus: {
          not: 'PAID',
        },
      },
    });

    const paymentBatches = await this.prisma.paymentBatch.findMany({
      where: {
        status: {
          notIn: ['PAID', 'CLOSED'],
        },
      },
    });

    const rows = [
      ...expenses.map((item) => ({
        source: 'FinanceExpense',
        reference: item.expenseNo,
        department: item.department || null,
        site: item.site || null,
        payee: item.payee || null,
        description: item.description,
        amount: this.money(item.amount),
        status: item.status,
        paymentStatus: item.paymentReference ? 'REFERENCED' : 'PENDING_PAYMENT',
        createdAt: item.createdAt,
      })),
      ...procurementRequests.map((item) => ({
        source: 'ProcurementRequest',
        reference: item.requisitionNo,
        department: item.department,
        site: item.site || null,
        payee: item.supplierName || null,
        description: item.description,
        amount: this.money(item.amount),
        status: item.status,
        paymentStatus: item.paymentStatus,
        createdAt: item.createdAt,
      })),
      ...paymentBatches.map((item) => ({
        source: 'PaymentBatch',
        reference: item.batchName,
        department: 'Payroll',
        site: null,
        payee: 'Employees',
        description: `Payroll payment batch ${item.batchName}`,
        amount: this.money(item.totalNetPay),
        status: item.status,
        paymentStatus: item.status,
        createdAt: item.createdAt,
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    await this.logFinanceExport({
      reportType: FinanceReportType.OUTSTANDING_PAYMENTS,
      exportFormat: FinanceExportFormat.JSON,
      resultSummary: {
        totalRecords: rows.length,
        totalValue: rows.reduce((sum, item) => sum + item.amount, 0),
      },
    });

    return {
      generatedAt: new Date().toISOString(),
      currency: 'ZMW',
      summary: {
        totalRecords: rows.length,
        totalValue: rows.reduce((sum, item) => sum + item.amount, 0),
      },
      rows,
    };
  }

  async getApprovalStatusReport() {
    const approvalRequests = await this.prisma.approvalRequest.findMany({
      where: {
        OR: [
          { sourceEntityType: 'FinanceExpense' },
          { sourceEntityType: 'ProcurementRequest' },
          { module: OperationsModule.FINANCE },
          { module: OperationsModule.PROCUREMENT },
        ],
      },
      orderBy: {
        submittedAt: 'desc',
      },
      include: {
        decisions: {
          orderBy: {
            sequence: 'asc',
          },
        },
      },
    });

    const rows = approvalRequests.map((request) => {
      const pendingDecision = request.decisions.find((item) => item.status === 'PENDING');

      return {
        id: request.id,
        module: request.module,
        workflowType: request.workflowType,
        requestReference: request.requestReference,
        requestTitle: request.requestTitle,
        sourceEntityType: request.sourceEntityType,
        sourceEntityId: request.sourceEntityId,
        amount: this.money(request.amount),
        status: request.status,
        currentStep: request.currentStep,
        pendingRole: pendingDecision?.role || null,
        totalSteps: request.decisions.length,
        approvedSteps: request.decisions.filter((item) => item.status === 'APPROVED').length,
        rejectedSteps: request.decisions.filter((item) => item.status === 'REJECTED').length,
        submittedAt: request.submittedAt,
        closedAt: request.closedAt,
      };
    });

    await this.logFinanceExport({
      reportType: FinanceReportType.APPROVAL_STATUS,
      exportFormat: FinanceExportFormat.JSON,
      resultSummary: {
        totalRecords: rows.length,
        pending: rows.filter((item) => item.status === ApprovalRequestStatus.SUBMITTED || item.status === ApprovalRequestStatus.IN_REVIEW).length,
        approved: rows.filter((item) => item.status === ApprovalRequestStatus.APPROVED).length,
        rejected: rows.filter((item) => item.status === ApprovalRequestStatus.REJECTED).length,
      },
    });

    return {
      generatedAt: new Date().toISOString(),
      rows,
    };
  }

  async exportExpensesCsv() {
    const expenses = await this.prisma.financeExpense.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    const csv = this.toCsv(
      [
        'Expense No',
        'Category',
        'Description',
        'Amount',
        'Department',
        'Site',
        'Payee',
        'Requested By',
        'Status',
        'Evidence Status',
        'Approval Request ID',
        'Paid By',
        'Paid At',
        'Payment Reference',
        'Finance Comment',
        'Created At',
      ],
      expenses.map((item) => [
        item.expenseNo,
        item.category,
        item.description,
        item.amount,
        item.department,
        item.site,
        item.payee,
        item.requestedBy,
        item.status,
        item.evidenceStatus,
        item.approvalRequestId,
        item.paidBy,
        item.paidAt?.toISOString(),
        item.paymentReference,
        item.financeComment,
        item.createdAt.toISOString(),
      ]),
    );

    await this.logFinanceExport({
      reportType: FinanceReportType.EXPENSE_EXPORT,
      exportFormat: FinanceExportFormat.CSV,
      fileName: 'finance-expenses.csv',
      resultSummary: {
        totalRecords: expenses.length,
      },
    });

    return csv;
  }

  async exportProcurementCsv() {
    const records = await this.prisma.procurementRequest.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    const csv = this.toCsv(
      [
        'Requisition No',
        'Department',
        'Site',
        'Requested By',
        'Supplier',
        'Description',
        'Amount',
        'Procurement Stage',
        'Finance Stage',
        'Status',
        'Invoice Status',
        'Payment Status',
        'Proof Of Payment Status',
        'PO No',
        'Invoice No',
        'GRN',
        'Approval Request ID',
        'Created At',
      ],
      records.map((item) => [
        item.requisitionNo,
        item.department,
        item.site,
        item.requestedBy,
        item.supplierName,
        item.description,
        item.amount,
        item.procurementStage,
        item.financeStage,
        item.status,
        item.invoiceStatus,
        item.paymentStatus,
        item.proofOfPaymentStatus,
        item.purchaseOrderNo,
        item.invoiceNo,
        item.goodsReceivedNote,
        item.approvalRequestId,
        item.createdAt.toISOString(),
      ]),
    );

    await this.logFinanceExport({
      reportType: FinanceReportType.PROCUREMENT_EXPORT,
      exportFormat: FinanceExportFormat.CSV,
      fileName: 'finance-procurement.csv',
      resultSummary: {
        totalRecords: records.length,
      },
    });

    return csv;
  }

  async exportEvidenceCsv() {
    const evidence = await this.prisma.financePaymentEvidence.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    const csv = this.toCsv(
      [
        'Evidence Type',
        'Title',
        'Status',
        'Expense ID',
        'Procurement ID',
        'Payment Batch ID',
        'Document ID',
        'Notes',
        'Created By',
        'Created At',
      ],
      evidence.map((item) => [
        item.evidenceType,
        item.title,
        item.status,
        item.expenseId,
        item.procurementId,
        item.paymentBatchId,
        item.documentId,
        item.notes,
        item.createdBy,
        item.createdAt.toISOString(),
      ]),
    );

    await this.logFinanceExport({
      reportType: FinanceReportType.EVIDENCE_EXPORT,
      exportFormat: FinanceExportFormat.CSV,
      fileName: 'finance-evidence.csv',
      resultSummary: {
        totalRecords: evidence.length,
      },
    });

    return csv;
  }

  async exportPaymentBatchesCsv() {
    const batches = await this.prisma.paymentBatch.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        payrollRun: {
          include: {
            payrollPeriod: true,
          },
        },
      },
    });

    const csv = this.toCsv(
      [
        'Batch Name',
        'Payroll Run',
        'Payroll Period',
        'Status',
        'Total Employees',
        'Total Net Pay',
        'Prepared By',
        'Prepared At',
        'Reviewed By',
        'Reviewed At',
        'Approved By',
        'Approved At',
        'Evidence Notes',
        'Created At',
      ],
      batches.map((item) => [
        item.batchName,
        item.payrollRun?.runName,
        item.payrollRun?.payrollPeriod?.periodName,
        item.status,
        item.totalEmployees,
        item.totalNetPay,
        item.preparedBy,
        item.preparedAt?.toISOString(),
        item.reviewedBy,
        item.reviewedAt?.toISOString(),
        item.approvedBy,
        item.approvedAt?.toISOString(),
        item.evidenceNotes,
        item.createdAt.toISOString(),
      ]),
    );

    await this.logFinanceExport({
      reportType: FinanceReportType.PAYMENT_BATCH_EXPORT,
      exportFormat: FinanceExportFormat.CSV,
      fileName: 'finance-payment-batches.csv',
      resultSummary: {
        totalRecords: batches.length,
      },
    });

    return csv;
  }

  async getFinanceExportLogs() {
    return this.prisma.financeReportExportLog.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });
  }
}