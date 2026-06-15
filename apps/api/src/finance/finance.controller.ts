import { Body, Controller, Get, Header, Param, Patch, Post } from '@nestjs/common';
import { FinanceService } from './finance.service';

/**
 * FinanceController
 * ------------------------------------------------------------
 * API controller for Southin Operations Hub Finance workflows.
 */
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('dashboard')
  getDashboard() {
    return this.financeService.getDashboard();
  }

  @Get('expenses')
  getExpenses() {
    return this.financeService.getExpenses();
  }

  @Post('expenses')
  async createExpense(@Body() body: any) {
    const expense = await this.financeService.createExpense(body);

    return {
      message: 'Expense submitted successfully and routed for approval.',
      expense,
    };
  }

  @Patch('expenses/:id/approve')
  async approveExpense(@Param('id') id: string, @Body() body: any) {
    const expense = await this.financeService.approveExpense(id, body);

    return {
      message: 'Expense approval step completed.',
      expense,
    };
  }

  @Patch('expenses/:id/reject')
  async rejectExpense(@Param('id') id: string, @Body() body: any) {
    const expense = await this.financeService.rejectExpense(id, body);

    return {
      message: 'Expense rejected successfully.',
      expense,
    };
  }

  @Patch('expenses/:id/mark-paid')
  async markExpensePaid(@Param('id') id: string, @Body() body: any) {
    const expense = await this.financeService.markExpensePaid(id, body);

    return {
      message: 'Expense marked as paid successfully.',
      expense,
    };
  }

  @Get('procurement-payments')
  getProcurementPayments() {
    return this.financeService.getProcurementPayments();
  }

  @Post('procurement-payments')
  async createProcurementPayment(@Body() body: any) {
    const record = await this.financeService.createProcurementPayment(body);

    return {
      message: 'Procurement payment record created and routed for approval.',
      record,
    };
  }

  @Patch('procurement-payments/:id/approve')
  async approveProcurementPayment(@Param('id') id: string, @Body() body: any) {
    const record = await this.financeService.approveProcurementPayment(id, body);

    return {
      message: 'Procurement approval step completed.',
      record,
    };
  }

  @Patch('procurement-payments/:id/reject')
  async rejectProcurementPayment(@Param('id') id: string, @Body() body: any) {
    const record = await this.financeService.rejectProcurementPayment(id, body);

    return {
      message: 'Procurement payment record rejected.',
      record,
    };
  }

  @Patch('procurement-payments/:id/invoice-received')
  async markProcurementInvoiceReceived(@Param('id') id: string, @Body() body: any) {
    const record = await this.financeService.markProcurementInvoiceReceived(id, body);

    return {
      message: 'Procurement invoice marked as received.',
      record,
    };
  }

  @Patch('procurement-payments/:id/mark-paid')
  async markProcurementPaid(@Param('id') id: string, @Body() body: any) {
    const record = await this.financeService.markProcurementPaid(id, body);

    return {
      message: 'Procurement payment marked as paid.',
      record,
    };
  }

  @Patch('procurement-payments/:id/pop-uploaded')
  async markProcurementPopUploaded(@Param('id') id: string) {
    const record = await this.financeService.markProcurementPopUploaded(id);

    return {
      message: 'Proof of payment marked as uploaded.',
      record,
    };
  }

  @Get('evidence')
  getEvidence() {
    return this.financeService.getEvidence();
  }

  @Post('evidence')
  async createEvidence(@Body() body: any) {
    const evidence = await this.financeService.createEvidence(body);

    return {
      message: 'Finance evidence record created successfully.',
      evidence,
    };
  }

  @Patch('evidence/:id/mark-uploaded')
  async markEvidenceUploaded(@Param('id') id: string, @Body() body: any) {
    const evidence = await this.financeService.updateEvidenceStatus(id, 'UPLOADED', body);

    return {
      message: 'Finance evidence marked as uploaded.',
      evidence,
    };
  }

  @Patch('evidence/:id/approve')
  async approveEvidence(@Param('id') id: string, @Body() body: any) {
    const evidence = await this.financeService.updateEvidenceStatus(id, 'APPROVED', body);

    return {
      message: 'Finance evidence approved.',
      evidence,
    };
  }

  @Patch('evidence/:id/publish-ready')
  async markEvidencePublishReady(@Param('id') id: string, @Body() body: any) {
    const evidence = await this.financeService.updateEvidenceStatus(
      id,
      'READY_FOR_SHAREPOINT',
      body,
    );

    return {
      message: 'Finance evidence marked ready for SharePoint.',
      evidence,
    };
  }

  @Get('sharepoint-package')
  getSharePointPackage() {
    return this.financeService.getSharePointPackage();
  }

  @Post('sharepoint-package/prepare')
  async prepareSharePointPackage(@Body() body: any) {
    const document = await this.financeService.prepareSharePointPackage(body);

    return {
      message: 'Finance SharePoint package prepared.',
      document,
    };
  }

  @Patch('sharepoint-package/:id/mark-ready')
  async markSharePointPackageReady(@Param('id') id: string) {
    const document = await this.financeService.markSharePointPackageReady(id);

    return {
      message: 'Finance SharePoint package marked ready.',
      document,
    };
  }

  @Patch('sharepoint-package/:id/mark-published')
  async markSharePointPackagePublished(@Param('id') id: string, @Body() body: any) {
    const document = await this.financeService.markSharePointPackagePublished(id, body);

    return {
      message: 'Finance SharePoint package marked as published.',
      document,
    };
  }

  @Get('reports/summary')
  getFinanceReportSummary() {
    return this.financeService.getFinanceReportSummary();
  }

  @Get('reports/department-costs')
  getDepartmentCostReport() {
    return this.financeService.getDepartmentCostReport();
  }

  @Get('reports/site-costs')
  getSiteCostReport() {
    return this.financeService.getSiteCostReport();
  }

  @Get('reports/outstanding-payments')
  getOutstandingPaymentsReport() {
    return this.financeService.getOutstandingPaymentsReport();
  }

  @Get('reports/approval-status')
  getApprovalStatusReport() {
    return this.financeService.getApprovalStatusReport();
  }

  @Get('reports/export-logs')
  getFinanceExportLogs() {
    return this.financeService.getFinanceExportLogs();
  }

  @Get('exports/expenses.csv')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="finance-expenses.csv"')
  exportExpensesCsv() {
    return this.financeService.exportExpensesCsv();
  }

  @Get('exports/procurement.csv')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="finance-procurement.csv"')
  exportProcurementCsv() {
    return this.financeService.exportProcurementCsv();
  }

  @Get('exports/evidence.csv')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="finance-evidence.csv"')
  exportEvidenceCsv() {
    return this.financeService.exportEvidenceCsv();
  }

  @Get('exports/payment-batches.csv')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="finance-payment-batches.csv"')
  exportPaymentBatchesCsv() {
    return this.financeService.exportPaymentBatchesCsv();
  }
}