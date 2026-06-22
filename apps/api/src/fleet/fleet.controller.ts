import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { FleetService } from './fleet.service';

@Controller('fleet')
export class FleetController {
  constructor(private readonly fleetService: FleetService) {}

  @Get('dashboard')
  getDashboard() {
    return this.fleetService.getDashboard();
  }

  @Get('assignments')
  getAssignments() {
    return this.fleetService.getAssignments();
  }

  @Post('assignments')
  createAssignment(@Body() body: any) {
    return this.fleetService.createAssignment(body);
  }

  @Patch('assignments/:id/return')
  returnAssignment(@Param('id') id: string, @Body() body: any) {
    return this.fleetService.returnAssignment(id, body);
  }

  @Get('due-items')
  getDueItems() {
    return this.fleetService.getDueItems();
  }

  @Post('due-items')
  createDueItem(@Body() body: any) {
    return this.fleetService.createDueItem(body);
  }

  @Patch('due-items/:id/complete')
  completeDueItem(@Param('id') id: string, @Body() body: any) {
    return this.fleetService.completeDueItem(id, body);
  }
}