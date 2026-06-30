import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { ApprovalMatrixController } from './approval-matrix.controller';
import { ApprovalMatrixService } from './approval-matrix.service';
import { ApprovalRoutingController } from './approval-routing.controller';
import { ApprovalRoutingService } from './approval-routing.service';
import { ApprovalWorkflowController } from './approval-workflow.controller';
import { ApprovalWorkflowService } from './approval-workflow.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    ApprovalMatrixController,
    ApprovalRoutingController,
    ApprovalWorkflowController,
  ],
  providers: [
    ApprovalMatrixService,
    ApprovalRoutingService,
    ApprovalWorkflowService,
  ],
  exports: [
    ApprovalMatrixService,
    ApprovalRoutingService,
    ApprovalWorkflowService,
  ],
})
export class ApprovalMatrixModule {}