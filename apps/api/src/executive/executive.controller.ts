import { Body, Controller, Get, Header, Post, Query, Res } from '@nestjs/common';
import { ExecutiveService } from './executive.service';

@Controller('executive')
export class ExecutiveController {
  constructor(private readonly executiveService: ExecutiveService) {}

  @Get('dashboard')
  getDashboard() {
    return this.executiveService.getDashboardSummary();
  }

  @Get('sharepoint-feed')
  getSharePointFeed() {
    return this.executiveService.getSharePointFeed();
  }

  @Get('payroll-audit')
  getPayrollAudit(@Query('runId') runId?: string) {
    return this.executiveService.getPayrollAudit(runId);
  }

  @Get('payroll-audit.csv')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="southin-payroll-audit.csv"')
  exportPayrollAuditCsv(@Query('runId') runId?: string) {
    return this.executiveService.exportPayrollAuditCsv(runId);
  }

  @Get('sharepoint/export-package')
  getSharePointExportPackage() {
    return this.executiveService.getSharePointExportPackage();
  }

  @Get('sharepoint/executive-page-payload')
  getExecutivePagePayload() {
    return this.executiveService.getExecutivePagePayload();
  }

  @Get('sharepoint/public-dashboard-payload')
  getPublicDashboardPayload() {
    return this.executiveService.getPublicDashboardPayload();
  }

  @Get('sharepoint/finance-audit-payload')
  getFinanceAuditPayload(@Query('runId') runId?: string) {
    return this.executiveService.getFinanceAuditPayload(runId);
  }

  @Post('sharepoint/export-dev-log')
  logSharePointExportRequest(@Body() body: any) {
    return this.executiveService.logSharePointExportRequest(body);
  }

  @Get('sharepoint/export-logs')
    getSharePointExportLogs() {
      return this.executiveService.getSharePointExportLogs();
    }

    @Get('sharepoint/graph-status')
    getSharePointGraphStatus() {
      return this.executiveService.getSharePointGraphStatus();
    }

    @Post('sharepoint/publish')
    publishToSharePoint(@Body() body: any) {
      return this.executiveService.logSharePointExportRequest(body);
    }
}