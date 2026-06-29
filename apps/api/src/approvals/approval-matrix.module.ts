import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { ApprovalMatrixController } from './approval-matrix.controller';
import { ApprovalMatrixService } from './approval-matrix.service';

@Module({
  imports: [PrismaModule],
  controllers: [ApprovalMatrixController],
  providers: [ApprovalMatrixService],
  exports: [ApprovalMatrixService],
})
export class ApprovalMatrixModule {}