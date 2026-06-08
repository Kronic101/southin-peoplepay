import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { PayrollReadinessGatesService } from './payroll-readiness-gates.service';

@Controller('payroll')
export class PayrollController {
  constructor(
    private readonly payrollService: PayrollService,
    private readonly payrollReadinessGatesService: PayrollReadinessGatesService,  
  ) {}

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

  @Post('runs/:runId/employees/:lineId/calculate-statutory')
  calculatePayrollLineStatutory(
    @Param('runId') runId: string,
    @Param('lineId') lineId: string,
  ) {
    return this.payrollService.calculatePayrollLineStatutory(runId, lineId);
  }

  @Post('runs/:id/submit-hr')
  submitPayrollRunToHr(@Param('id') id: string, @Body() body: unknown) {
    return this.payrollService.submitPayrollRunToHr(id, body as any);
  }

  @Post('runs/:id/hr-review')
  hrReviewPayrollRun(@Param('id') id: string, @Body() body: unknown) {
    return this.payrollService.hrReviewPayrollRun(id, body as any);
  }

  @Post('runs/:id/submit-finance')
  submitPayrollRunToFinance(@Param('id') id: string, @Body() body: unknown) {
    return this.payrollService.submitPayrollRunToFinance(id, body as any);
  }

  @Post('runs/:id/finance-review')
  financeReviewPayrollRun(@Param('id') id: string, @Body() body: unknown) {
    return this.payrollService.financeReviewPayrollRun(id, body as any);
  }

  @Post('runs/:id/submit-director')
  submitPayrollRunToDirector(@Param('id') id: string, @Body() body: unknown) {
    return this.payrollService.submitPayrollRunToDirector(id, body as any);
  }

  @Post('runs/:id/director-approve')
  directorApprovePayrollRun(@Param('id') id: string, @Body() body: unknown) {
    return this.payrollService.directorApprovePayrollRun(id, body as any);
  }

  @Post('runs/:id/lock')
  lockPayrollRun(@Param('id') id: string, @Body() body: unknown) {
    return this.payrollService.lockPayrollRun(id, body as any);
  }

  @Post('runs/:id/generate-payslips')
  generatePayslipsForRun(@Param('id') id: string, @Body() body: unknown) {
    return this.payrollService.generatePayslipsForRun(id, body as any);
  }

  @Get('runs/:id')
  getPayrollRun(@Param('id') id: string) {
    return this.payrollService.getPayrollRun(id);
  }

  @Get('readiness-gates')
  getPayrollReadinessGates() {
    return this.payrollReadinessGatesService.getPayrollReadinessGates();
  }

  @Get('run-creation-readiness')
  getPayrollRunCreationReadiness() {
    return this.payrollReadinessGatesService.evaluatePayrollRunCreationReadiness();
  }
}