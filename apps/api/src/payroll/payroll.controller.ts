import { Controller, Get, Param, Post } from '@nestjs/common';
import { PayrollService } from './payroll.service';

@Controller('payroll')
export class PayrollController {
  constructor(private readonly service: PayrollService) {}

  @Get('periods')
  periods() { return this.service.periodsPlaceholder(); }

  @Get('runs')
  runs() { return this.service.runsPlaceholder(); }

  @Post('runs/:id/calculate')
  calculate(@Param('id') id: string) { return this.service.calculatePlaceholder(id); }

  @Post('runs/:id/hr-review')
  hrReview(@Param('id') id: string) { return this.service.approvalPlaceholder(id, 'HR_REVIEW'); }

  @Post('runs/:id/finance-review')
  financeReview(@Param('id') id: string) { return this.service.approvalPlaceholder(id, 'FINANCE_REVIEW'); }

  @Post('runs/:id/director-approve')
  directorApprove(@Param('id') id: string) { return this.service.approvalPlaceholder(id, 'DIRECTOR_APPROVAL'); }

  @Post('runs/:id/lock')
  lock(@Param('id') id: string) { return this.service.lockPlaceholder(id); }
}
