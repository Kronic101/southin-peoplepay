import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { StoresService } from './stores.service';

@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get('requisitions')
  getRequisitions() {
    return this.storesService.getRequisitions();
  }

  @Get('requisitions/:id')
  getRequisition(@Param('id') id: string) {
    return this.storesService.getRequisition(id);
  }

  @Post('requisitions')
  createRequisition(@Body() body: any) {
    return this.storesService.createRequisition(body);
  }

  @Patch('requisitions/:id/status')
  updateRequisitionStatus(@Param('id') id: string, @Body() body: any) {
    return this.storesService.updateRequisitionStatus(id, body);
  }
}