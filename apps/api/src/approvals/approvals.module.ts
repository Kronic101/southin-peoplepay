import { Module } from '@nestjs/common';

import { ApprovalMatrixModule } from './approval-matrix.module';

import { ApprovalsController } from './approvals.controller';
import { ApprovalsService } from './approvals.service';

import { ApprovalWorkflowController } from './approval-workflow.controller';
import { ApprovalWorkflowService } from './approval-workflow.service';

import { ApprovalRoutingController } from './approval-routing.controller';
import { ApprovalRoutingService } from './approval-routing.service';

import { ApprovalNotificationsService } from './approval-notifications.service';
import { ApprovalNotificationsController } from './approval-notifications.controller';
import { GraphMailService } from '../notifications/graph-mail.service';

@Module({
  imports: [ApprovalMatrixModule],
  controllers: [
    ApprovalsController,
    ApprovalWorkflowController,
    ApprovalRoutingController,
  ],
  providers: [
    ApprovalsService,
    ApprovalWorkflowService,
    ApprovalRoutingService,
    ApprovalNotificationsService,
    GraphMailService,
  ],
  exports: [
    ApprovalsService,
    ApprovalWorkflowService,
    ApprovalRoutingService,
    ApprovalNotificationsService,
  ],
})
export class ApprovalsModule {}