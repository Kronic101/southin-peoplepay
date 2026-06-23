import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { FleetWorkshopService } from './workshop.service';

@Controller('fleet/workshop')
export class FleetWorkshopController {
  constructor(private readonly service: FleetWorkshopService) {}

  @Get()
  getWorkshopJobs() {
    return this.service.getWorkshopJobs();
  }

  @Post()
  createWorkshopJob(@Body() body: any) {
    return this.service.createWorkshopJob(body);
  }

  @Patch(':id/close')
  closeWorkshopJob(@Param('id') id: string, @Body() body: any) {
    return this.service.closeWorkshopJob(id, body);
  }
}