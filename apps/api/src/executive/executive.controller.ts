import { Controller, Get, Header, Query } from '@nestjs/common';
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
}