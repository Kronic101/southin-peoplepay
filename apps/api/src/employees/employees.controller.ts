import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { EmployeesService } from './employees.service';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get('lookups/setup')
  getSetupLookups() {
    return this.employeesService.getSetupLookups();
  }

  @Get()
  findAll() {
    return this.employeesService.findAll();
  }

  @Post()
  create(@Body() body: unknown) {
    return this.employeesService.create(body as any);
  }

  @Get('payroll-readiness')
  getPayrollReadiness() {
    return this.employeesService.getPayrollReadiness();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.employeesService.update(id, body as any);
  }

  @Patch(':id/statutory-details')
  updateStatutoryDetails(@Param('id') id: string, @Body() body: unknown) {
    return this.employeesService.updateStatutoryDetails(id, body as any);
  }

  @Post(':id/bank-accounts')
  createBankAccount(@Param('id') id: string, @Body() body: unknown) {
    return this.employeesService.createBankAccount(id, body as any);
  }

  @Post(':id/contracts')
  createContract(@Param('id') id: string, @Body() body: unknown) {
    return this.employeesService.createContract(id, body as any);
  }

  @Post(':id/service-conditions/assign')
  assignServiceCondition(@Param('id') id: string, @Body() body: unknown) {
    return this.employeesService.assignServiceCondition(id, body as any);
  }

  @Post(':id/portal-account')
  createPortalAccount(@Param('id') id: string) {
    return this.employeesService.createPortalAccount(id);
  }
}