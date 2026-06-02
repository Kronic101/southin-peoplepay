import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { EmployeesService } from './employees.service';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}

  @Get()
  findAll() {
    return this.service.findAllPlaceholder();
  }

  @Post()
  create(@Body() body: unknown) {
    return this.service.createPlaceholder(body);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOnePlaceholder(id);
  }
}
