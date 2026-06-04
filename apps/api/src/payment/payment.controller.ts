import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PaymentService } from './payment.service';

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
  preparePaymentBatch(@Param('id') id: string, @Body() body: any) {
    return this.paymentService.preparePaymentBatch(id, body);
  }

  @Post(':id/validate-bank-details')
  validateBankDetails(@Param('id') id: string, @Body() body: any) {
    return this.paymentService.validateBankDetails(id, body);
  }

  @Post(':id/approve')
  approvePaymentBatch(@Param('id') id: string, @Body() body: any) {
    return this.paymentService.approvePaymentBatch(id, body);
  }
}