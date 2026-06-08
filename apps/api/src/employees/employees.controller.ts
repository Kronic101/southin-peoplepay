import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { EmployeesService } from './employees.service';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  findAll() {
    return this.employeesService.findAll();
  }

  @Get('payroll-readiness')
  getPayrollReadiness() {
    return this.employeesService.getPayrollReadiness();
  }

  @Post()
  create(@Body() body: any) {
    return this.employeesService.create(body);
  }

  @Get(':id/bank-audit-history')
  getEmployeeBankAuditHistory(@Param('id') id: string) {
    return this.employeesService.getEmployeeBankAuditHistory(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.employeesService.update(id, body);
  }

  @Post(':id/portal-account')
  createPortalAccount(@Param('id') id: string, @Body() body: any) {
    return this.employeesService.createPortalAccount(id, body);
  }

  @Post(':id/bank-accounts')
  createBankAccount(@Param('id') id: string, @Body() body: any) {
    return this.employeesService.createBankAccount(id, body);
  }

  @Post(':id/bank-accounts/:bankAccountId/approve')
  approveBankAccount(
    @Param('id') id: string,
    @Param('bankAccountId') bankAccountId: string,
    @Body() body: any,
  ) {
    return this.employeesService.approveBankAccount(id, bankAccountId, body);
  }

  @Post(':id/validate-bank-details')
  validateBankDetails(@Param('id') id: string, @Body() body: any) {
    return this.employeesService.validateBankDetails(id, body);
  }
}