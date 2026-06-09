import { Body, Controller, Get, Header, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ExecutiveService } from './executive.service';
import { RequireRoles } from 'src/auth/roles.decorator';
import { RbacGuard } from 'src/auth/rbac.guard';

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
  @UseGuards(RbacGuard)
  @RequireRoles('ADMIN', 'DIRECTOR')
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

  @Get('sharepoint/setup-guide')
  getSharePointSetupGuide() {
    return this.executiveService.getSharePointSetupGuide();
  }

  @Get('sharepoint/export-logs')
  getSharePointExportLogs() {
    return this.executiveService.getSharePointExportLogs();
  }

  @Get('sharepoint/export-logs/:id')
  getSharePointExportLog(@Param('id') id: string) {
    return this.executiveService.getSharePointExportLog(id);
  }

  @Get('sharepoint/graph-status')
  getSharePointGraphStatus() {
    return this.executiveService.getSharePointGraphStatus();
  }

  @Get('sharepoint/targets')
  getSharePointGraphTargets() {
    return this.executiveService.getSharePointGraphTargets();
  }

  @Post('sharepoint/validate-target')
  validateSharePointTarget(@Body() body: any) {
    return this.executiveService.validateSharePointTarget(body);
  }

  @Post('sharepoint/export-dev-log')
  logSharePointExportRequest(@Body() body: any) {
    return this.executiveService.logSharePointExportRequest(body);
  }

  @Post('sharepoint/publish')
  publishToSharePoint(@Body() body: any) {
    return this.executiveService.logSharePointExportRequest(body);
  }

  @Get('sharepoint/discovery-guide')
  getSharePointDiscoveryGuide() {
    return this.executiveService.getSharePointDiscoveryGuide();
  }

  @Post('sharepoint/discovery-preview')
  getSharePointDiscoveryPreview(@Body() body: any) {
    return this.executiveService.getSharePointDiscoveryPreview(body);
  }
}