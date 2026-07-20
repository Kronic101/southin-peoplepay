import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { ApprovalsModule } from '../approvals/approvals.module';
import { SafetyController } from './safety.controller';
import { SafetyService } from './safety.service';

@Module({
  imports: [PrismaModule, ApprovalsModule],
  controllers: [SafetyController],
  providers: [SafetyService],
  exports: [SafetyService],
})
export class SafetyModule {}