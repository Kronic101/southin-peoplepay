import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { AssetsImportController } from './dto/assets-import.controller';
import { AssetsImportService } from './dto/assets-import.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ApprovalMatrixModule } from '../approvals/approval-matrix.module';

@Module({
  controllers: [AssetsController, AssetsImportController],
  providers: [AssetsService, AssetsImportService, PrismaService],
  exports: [AssetsService, AssetsImportService],
  imports: [PrismaModule, ApprovalMatrixModule],
})
export class AssetsModule {}