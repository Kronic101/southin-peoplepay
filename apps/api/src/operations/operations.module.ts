import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OperationsMasterDataController } from './operations-master-data.controller';
import { OperationsMasterDataService } from './operations-master-data.service';

@Module({
  imports: [PrismaModule],
  controllers: [OperationsMasterDataController],
  providers: [OperationsMasterDataService],
  exports: [OperationsMasterDataService],
})
export class OperationsModule {}