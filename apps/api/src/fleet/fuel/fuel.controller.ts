import { Body, Controller, Get, Post } from '@nestjs/common';
import { FleetFuelService } from './fuel.service';

@Controller('fleet/fuel')
export class FleetFuelController {
  constructor(private readonly service: FleetFuelService) {}

  @Get()
  getFuelLogs() {
    return this.service.getFuelLogs();
  }

  @Post()
  createFuelLog(@Body() body: any) {
    return this.service.createFuelLog(body);
  }
}