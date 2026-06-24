import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { FleetDefectsService } from './defects.service';

@Controller('fleet/defects')
export class FleetDefectsController {
  constructor(private readonly service: FleetDefectsService) {}

  @Get()
  getDefects() {
    return this.service.getDefects();
  }

  @Post()
  createDefect(@Body() body: any) {
    return this.service.createDefect(body);
  }

  @Patch(':id/status')
  updateDefectStatus(@Param('id') id: string, @Body() body: any) {
    return this.service.updateDefectStatus(id, body);
  }

  @Patch(':id/close')
  closeDefect(@Param('id') id: string, @Body() body: any) {
    return this.service.closeDefect(id, body);
  }

  @Patch(':id/create-workshop-job')
  createWorkshopJobFromDefect(@Param('id') id: string, @Body() body: any) {
    return this.service.createWorkshopJobFromDefect(id, body);
  }
}