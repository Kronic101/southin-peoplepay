import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * FinanceModule
 * ------------------------------------------------------------
 * Finance workflow module for Southin Operations Hub.
 *
 * Scope:
 * - Finance dashboard summaries
 * - Expense capture and approval workflow
 * - Procurement payment tracker
 * - Finance evidence register
 * - SharePoint package preparation records
 */
@Module({
  imports: [PrismaModule],
  controllers: [FinanceController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}