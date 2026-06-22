import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { FleetDriversService } from './drivers.service';

@Controller('fleet/drivers')
export class FleetDriversController {
  constructor(private readonly driversService: FleetDriversService) {}

  @Get()
  getDrivers() {
    return this.driversService.getDrivers();
  }

  @Get(':id')
  getDriver(@Param('id') id: string) {
    return this.driversService.getDriver(id);
  }

  @Post()
  createDriver(@Body() body: any) {
    return this.driversService.createDriver(body);
  }

  @Patch(':id')
  updateDriver(@Param('id') id: string, @Body() body: any) {
    return this.driversService.updateDriver(id, body);
  }
}