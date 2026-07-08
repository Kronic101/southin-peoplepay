import { Controller, Get } from '@nestjs/common';
import { OperationsMasterDataService } from './operations-master-data.service';

@Controller('operations')
export class OperationsMasterDataController {
  constructor(private readonly masterDataService: OperationsMasterDataService) {}

  @Get('master-data')
  getMasterData() {
    return this.masterDataService.getMasterData();
  }
}