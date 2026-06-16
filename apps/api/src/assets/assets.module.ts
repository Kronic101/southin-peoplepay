import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { AssetsImportController } from './dto/assets-import.controller';
import { AssetsImportService } from './dto/assets-import.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [AssetsController, AssetsImportController],
  providers: [AssetsService, AssetsImportService, PrismaService],
  exports: [AssetsService, AssetsImportService],
})
export class AssetsModule {}