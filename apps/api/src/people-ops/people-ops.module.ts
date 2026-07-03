import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PeopleOpsController } from './people-ops.controller';
import { PeopleOpsService } from './people-ops.service';

@Module({
  controllers: [PeopleOpsController],
  providers: [PrismaService, PeopleOpsService],
  exports: [PeopleOpsService],
})
export class PeopleOpsModule {}