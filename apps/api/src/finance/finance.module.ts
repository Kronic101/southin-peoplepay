import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ApprovalsModule } from '../approvals/approvals.module';

/**
 * FinanceModule
 * ------------------------------------------------------------
 * Finance workflow module for Southin Operations Hub.
 *
 * This module now connects Finance and Procurement workflows
 * to the shared Approval Matrix engine.
 */
@Module({
  imports: [PrismaModule, ApprovalsModule],
  controllers: [FinanceController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}