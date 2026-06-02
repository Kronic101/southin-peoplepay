import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { EmployeesService } from './employees.service';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  findAll() {
    return this.employeesService.findAll();
  }

  @Post()
  create(@Body() body: unknown) {
    return this.employeesService.create(body as any);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.employeesService.update(id, body as any);
  }

  @Post(':id/portal-account')
  createPortalAccount(@Param('id') id: string) {
    return this.employeesService.createPortalAccount(id);
  }
}