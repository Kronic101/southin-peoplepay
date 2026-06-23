import { Controller, Get } from '@nestjs/common';
import { FleetReportsService } from './reports.service';

@Controller('fleet/reports')
export class FleetReportsController {
  constructor(private readonly service: FleetReportsService) {}

  @Get('summary')
  getSummary() {
    return this.service.getSummary();
  }

  @Get('costs-by-vehicle')
  getCostsByVehicle() {
    return this.service.getCostsByVehicle();
  }
}