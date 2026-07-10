import { Controller, Get, Post, Query } from '@nestjs/common';

import { ApprovalNotificationsService } from './approval-notifications.service';

@Controller('approvals/notifications')
export class ApprovalNotificationsController {
  constructor(
    private readonly approvalNotificationsService: ApprovalNotificationsService,
  ) {}

  @Get('queue')
  getQueue(@Query('status') status?: string) {
    return this.approvalNotificationsService.getQueue(status);
  }

  @Post('process')
  processPending(@Query('limit') limit?: string) {
    return this.approvalNotificationsService.processPending(Number(limit || 10));
  }
}