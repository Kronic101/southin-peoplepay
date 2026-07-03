import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SitesController } from './sites.controller';
import { SitesService } from './sites.service';

@Module({
  controllers: [SitesController],
  providers: [PrismaService, SitesService],
  exports: [SitesService],
})
export class SitesModule {}