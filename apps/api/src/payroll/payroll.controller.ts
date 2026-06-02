import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PayrollService } from './payroll.service';

@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get('periods')
  getPayrollPeriods() {
    return this.payrollService.getPayrollPeriods();
  }

  @Post('periods')
  createPayrollPeriod(@Body() body: unknown) {
    return this.payrollService.createPayrollPeriod(body as any);
  }

  @Get('ready-employees')
  getPayrollReadyEmployees() {
    return this.payrollService.getPayrollReadyEmployees();
  }

  @Get('runs')
  getPayrollRuns() {
    return this.payrollService.getPayrollRuns();
  }

  @Post('runs')
  createPayrollRun(@Body() body: unknown) {
    return this.payrollService.createPayrollRun(body as any);
  }

  @Post('runs/:runId/employees/:lineId/gross-pay')
  updatePayrollLineGrossPay(
    @Param('runId') runId: string,
    @Param('lineId') lineId: string,
    @Body() body: unknown,
  ) {
    return this.payrollService.updatePayrollLineGrossPay(runId, lineId, body as any);
  }

  @Get('runs/:id')
  getPayrollRun(@Param('id') id: string) {
    return this.payrollService.getPayrollRun(id);
  }
}