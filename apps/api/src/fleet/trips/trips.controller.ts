import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { FleetTripsService } from './trips.service';

@Controller('fleet/trips')
export class FleetTripsController {
  constructor(private readonly service: FleetTripsService) {}

  @Get()
  getTrips() {
    return this.service.getTrips();
  }

  @Post()
  createTrip(@Body() body: any) {
    return this.service.createTrip(body);
  }

  @Patch(':id/close')
  closeTrip(@Param('id') id: string, @Body() body: any) {
    return this.service.closeTrip(id, body);
  }
}