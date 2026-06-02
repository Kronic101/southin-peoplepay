import { Controller, Get, Post } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';

@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly service: IntegrationsService) {}

  @Get('sharepoint/status')
  sharePointStatus() { return this.service.sharePointStatusPlaceholder(); }

  @Post('sharepoint/publish-executive-dashboard')
  publishExecutiveDashboard() { return this.service.publishExecutiveDashboardPlaceholder(); }
}
