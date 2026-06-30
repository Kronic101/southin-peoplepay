import { Module } from '@nestjs/common';

import { ApprovalMatrixModule } from '../approvals/approval-matrix.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StoresController } from './stores.controller';
import { StoresService } from './stores.service';

@Module({
  imports: [PrismaModule, ApprovalMatrixModule],
  controllers: [StoresController],
  providers: [StoresService],
  exports: [StoresService],
})
export class StoresModule {}