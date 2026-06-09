import { Body, Controller, Get, Header, Param, Post, UseGuards } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { RequireRoles } from 'src/auth/roles.decorator';
import { RbacGuard } from 'src/auth/rbac.guard';

@Controller('payment-batches')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  getPaymentBatches() {
    return this.paymentService.getPaymentBatches();
  }

  @Get(':id')
  getPaymentBatch(@Param('id') id: string) {
    return this.paymentService.getPaymentBatch(id);
  }

  @Post('from-payroll-run/:payrollRunId')
  createFromPayrollRun(@Param('payrollRunId') payrollRunId: string, @Body() body: any) {
    return this.paymentService.createPaymentBatchFromPayrollRun(payrollRunId, body);
  }

  @Post(':id/prepare')
  @UseGuards(RbacGuard)
  @RequireRoles('FINANCE_MANAGER', 'ADMIN')
  preparePaymentBatch(@Param('id') id: string, @Body() body: any) {
    return this.paymentService.preparePaymentBatch(id, body);
  }

  @Post(':id/validate-bank-details')
  @UseGuards(RbacGuard)
  @RequireRoles('FINANCE_MANAGER', 'ADMIN')
  validateBankDetails(@Param('id') id: string, @Body() body: any) {
    return this.paymentService.validateBankDetails(id, body);
  }

  @Post(':id/recheck-payslips')
  @UseGuards(RbacGuard)
  @RequireRoles('FINANCE_MANAGER', 'ADMIN')
  recheckPayslips(@Param('id') id: string, @Body() body: any) {
    return this.paymentService.recheckPayslips(id, body);
  }

  @Post(':id/approve')
  @UseGuards(RbacGuard)
  @RequireRoles('DIRECTOR', 'ADMIN')
  approvePaymentBatch(@Param('id') id: string, @Body() body: any) {
    return this.paymentService.approvePaymentBatch(id, body);
  }

  @Get(':id/evidence')
  getPaymentBatchEvidence(@Param('id') id: string) {
    return this.paymentService.getPaymentBatchEvidence(id);
  }

  @Get(':id/evidence.csv')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="payment-batch-evidence.csv"')
  exportPaymentBatchEvidenceCsv(@Param('id') id: string) {
    return this.paymentService.exportPaymentBatchEvidenceCsv(id);
  }
}