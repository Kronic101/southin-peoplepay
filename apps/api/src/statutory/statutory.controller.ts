import { Controller, Get } from '@nestjs/common';
import { StatutoryService } from './statutory.service';

@Controller('statutory')
export class StatutoryController {
  constructor(private readonly service: StatutoryService) {}

  @Get('settings')
  settings() { return this.service.settingsPlaceholder(); }

  @Get('reports/:payrollRunId')
  reports() { return this.service.reportsPlaceholder(); }
}
