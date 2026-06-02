import { Module } from '@nestjs/common';
import { StatutoryController } from './statutory.controller';
import { StatutoryService } from './statutory.service';

@Module({
  controllers: [StatutoryController],
  providers: [StatutoryService],
  exports: [StatutoryService]
})
export class StatutoryModule {}
