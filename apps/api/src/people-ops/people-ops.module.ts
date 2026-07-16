import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { PeopleOpsController } from './people-ops.controller';
import { PeopleOpsService } from './people-ops.service';

import { ApprovalMatrixModule } from '../approvals/approval-matrix.module';
import { ApprovalWorkflowService } from '../approvals/approval-workflow.service';
import { ApprovalRoutingService } from '../approvals/approval-routing.service';
import { ApprovalNotificationsService } from '../approvals/approval-notifications.service';
import { GraphMailService } from '../notifications/graph-mail.service';

@Module({
  imports: [
    PrismaModule,
    ApprovalMatrixModule,
  ],
  controllers: [
    PeopleOpsController,
  ],
  providers: [
    PeopleOpsService,
    ApprovalWorkflowService,
    ApprovalRoutingService,
    ApprovalNotificationsService,
    GraphMailService,
  ],
  exports: [
    PeopleOpsService,
  ],
})
export class PeopleOpsModule {}