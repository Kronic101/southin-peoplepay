import { Module } from '@nestjs/common';
import { ExecutiveController } from './executive.controller';
import { ExecutiveService } from './executive.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SharePointGraphService } from './sharepoint-graph.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [PrismaModule],
  controllers: [ExecutiveController],
  providers: [ExecutiveService, PrismaService, SharePointGraphService],
})
export class ExecutiveModule {}