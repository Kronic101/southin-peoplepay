import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { SafetyService } from './safety.service';

@Controller('safety')
export class SafetyController {
  constructor(private readonly safetyService: SafetyService) {}

  @Get('dashboard')
  getDashboard(@Query('siteId') siteId?: string) {
    return this.safetyService.getDashboard({ siteId });
  }

  @Get('observations')
  getObservations(@Query('siteId') siteId?: string) {
    return this.safetyService.getObservations({ siteId });
  }

  @Post('observations')
  createObservation(@Body() body: any) {
    return this.safetyService.createObservation(body);
  }

  @Get('incidents')
  getIncidents(@Query('siteId') siteId?: string) {
    return this.safetyService.getIncidents({ siteId });
  }

  @Post('incidents')
  createIncident(@Body() body: any) {
    return this.safetyService.createIncident(body);
  }

  @Get('corrective-actions')
  getCorrectiveActions(@Query('siteId') siteId?: string) {
    return this.safetyService.getCorrectiveActions(siteId);
  }
  
  @Post('corrective-actions')
  createCorrectiveAction(@Body() body: any) {
    return this.safetyService.createCorrectiveAction(body);
  }

    @Get('corrective-actions/:id')
  getCorrectiveAction(@Param('id') id: string) {
    return this.safetyService.getCorrectiveAction(id);
  }

  @Patch('corrective-actions/:id/status')
  updateCorrectiveActionStatus(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.safetyService.updateCorrectiveActionStatus(id, body);
  }

  @Patch('corrective-actions/:id/complete')
  completeCorrectiveAction(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.safetyService.completeCorrectiveAction(id, body);
  }

  @Patch('corrective-actions/:id/verify')
  verifyCorrectiveAction(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.safetyService.verifyCorrectiveAction(id, body);
  }

  @Patch('corrective-actions/:id/close')
  closeCorrectiveAction(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.safetyService.closeCorrectiveAction(id, body);
  }
}