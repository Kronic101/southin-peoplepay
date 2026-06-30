import { Module } from '@nestjs/common';
import { ApprovalMatrixModule } from '../approvals/approval-matrix.module';
import { ApprovalsModule } from '../approvals/approvals.module';
import { PrismaModule } from '../prisma/prisma.module';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';

/**
 * FinanceModule
 * ------------------------------------------------------------
 * Finance workflow module for Southin Operations Hub.
 *
 * This module now connects Finance and Procurement workflows
 * to the shared Approval Matrix engine.
 */
@Module({
  imports: [PrismaModule, ApprovalsModule, ApprovalMatrixModule],
  controllers: [FinanceController],
  providers: [FinanceService],
  exports: [FinanceService], 
})
export class FinanceModule {}