import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { StatutoryService } from './statutory.service';

@Controller('statutory')
export class StatutoryController {
  constructor(private readonly statutoryService: StatutoryService) {}

  @Get('settings')
  getSettings() {
    return this.statutoryService.getSettings();
  }

  @Post('tax-years')
  createTaxYear(@Body() body: unknown) {
    return this.statutoryService.createTaxYear(body as any);
  }

  @Post('tax-years/:id/activate')
  setActiveTaxYear(@Param('id') id: string) {
    return this.statutoryService.setActiveTaxYear(id);
  }

  @Post('paye-bands')
  createPayeBand(@Body() body: unknown) {
    return this.statutoryService.createPayeBand(body as any);
  }

  @Post('napsa-rates')
  createNapsaRate(@Body() body: unknown) {
    return this.statutoryService.createNapsaRate(body as any);
  }

  @Post('napsa-rates/:id/approve')
  approveNapsaRate(@Param('id') id: string) {
    return this.statutoryService.approveNapsaRate(id);
  }

  @Post('nhima-rates')
  createNhimaRate(@Body() body: unknown) {
    return this.statutoryService.createNhimaRate(body as any);
  }

  @Post('nhima-rates/:id/approve')
  approveNhimaRate(@Param('id') id: string) {
    return this.statutoryService.approveNhimaRate(id);
  }

  @Post('sdl-rates')
  createSdlRate(@Body() body: unknown) {
    return this.statutoryService.createSdlRate(body as any);
  }

  @Post('sdl-rates/:id/approve')
  approveSdlRate(@Param('id') id: string) {
    return this.statutoryService.approveSdlRate(id);
  }

  @Get('reports/:payrollRunId')
  getStatutoryReport(@Param('payrollRunId') payrollRunId: string) {
    return this.statutoryService.getStatutoryReport(payrollRunId);
  }
}