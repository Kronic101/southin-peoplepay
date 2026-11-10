import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { StoresService } from './stores.service';

@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get('dashboard')
  getDashboard() {
    return this.storesService.getDashboard();
  }

  @Get('requisitions')
  getRequisitions() {
    return this.storesService.getRequisitions();
  }

  @Get('requisitions/:id')
  getRequisition(@Param('id') id: string) {
    return this.storesService.getRequisition(id);
  }

  @Get('requisitions/:id/operations')
  getRequisitionOperations(
    @Param('id') id: string,
  ) {
    return this.storesService.getRequisitionOperations(id);
  }

  @Post('requisitions/:id/issue')
  issueRequisition(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.storesService.issueRequisition(id, body);
  }

  @Post('requisitions')
  createRequisition(@Body() body: any) {
    return this.storesService.createRequisition(body);
  }

  @Patch('requisitions/:id/status')
  updateRequisitionStatus(@Param('id') id: string, @Body() body: any) {
    return this.storesService.updateRequisitionStatus(id, body);
  }

  @Post('requisitions/:id/create-shortfall-pr')
  createShortfallProcurementRequest(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.storesService.createShortfallProcurementRequest(
      id,
      body,
    );
  }

  @Get('sites')
  getActiveSites() {
    return this.storesService.getActiveSites();
  }

}