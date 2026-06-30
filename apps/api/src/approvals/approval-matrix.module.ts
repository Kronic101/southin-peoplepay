import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { ApprovalMatrixController } from './approval-matrix.controller';
import { ApprovalMatrixService } from './approval-matrix.service';
import { ApprovalRoutingController } from './approval-routing.controller';
import { ApprovalRoutingService } from './approval-routing.service';

@Module({
  imports: [PrismaModule],
  controllers: [ApprovalMatrixController, ApprovalRoutingController],
  providers: [ApprovalMatrixService, ApprovalRoutingService],
  exports: [ApprovalMatrixService, ApprovalRoutingService],
})
export class ApprovalMatrixModule {}