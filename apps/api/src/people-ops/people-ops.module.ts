import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { PeopleOpsController } from './people-ops.controller';
import { PeopleOpsService } from './people-ops.service';

@Module({
  imports: [PrismaModule],
  controllers: [PeopleOpsController],
  providers: [PeopleOpsService],
  exports: [PeopleOpsService],
})
export class PeopleOpsModule {}