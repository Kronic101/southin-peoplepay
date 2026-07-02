import { Module } from '@nestjs/common';

import { ApprovalMatrixModule } from './approval-matrix.module';

import { ApprovalsController } from './approvals.controller';
import { ApprovalsService } from './approvals.service';
import { ApprovalNotificationsService } from './approval-notifications.service';
import { GraphMailService } from '../notifications/graph-mail.service';

@Module({
  imports: [
    ApprovalMatrixModule,
  ],
  controllers: [
    ApprovalsController,
  ],
  providers: [
    ApprovalsService,
    GraphMailService,
    ApprovalNotificationsService,
  ],
  exports: [
    ApprovalsService,
    ApprovalNotificationsService,
  ],
})
export class ApprovalsModule {}