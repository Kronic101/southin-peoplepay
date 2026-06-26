import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { FleetInspectionsService } from './inspections.service';

@Controller('fleet/inspections')
export class FleetInspectionsController {
  constructor(private readonly service: FleetInspectionsService) {}

  @Get()
  getInspections() {
    return this.service.getInspections();
  }

  @Get(':id')
  getInspection(@Param('id') id: string) {
    return this.service.getInspection(id);
  }

  @Post()
  createInspection(@Body() body: any) {
    return this.service.createInspection(body);
  }

  @Patch(':id/status')
  updateInspectionStatus(@Param('id') id: string, @Body() body: any) {
    return this.service.updateInspectionStatus(id, body);
  }
}