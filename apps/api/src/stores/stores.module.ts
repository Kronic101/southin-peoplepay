import { Module } from '@nestjs/common';

import { ApprovalMatrixModule } from '../approvals/approval-matrix.module';
import { AssetsModule } from '../assets/assets.module';
import { DocumentsModule } from '../documents/documents.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StoresController } from './stores.controller';
import { StoresService } from './stores.service';

@Module({
  imports: [
    PrismaModule,
    ApprovalMatrixModule,
    AssetsModule,
    DocumentsModule,
  ],
  controllers: [
    StoresController,
  ],
  providers: [
    StoresService,
  ],
  exports: [
    StoresService,
  ],
})
export class StoresModule {}
