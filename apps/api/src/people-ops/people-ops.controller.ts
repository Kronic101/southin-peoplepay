import { Controller, Get, Query } from '@nestjs/common';
import { PeopleOpsService } from './people-ops.service';

@Controller('people-ops')
export class PeopleOpsController {
  constructor(private readonly peopleOpsService: PeopleOpsService) {}

  @Get('context')
  getContext(
    @Query('siteId') siteId?: string,
    @Query('managerEmail') managerEmail?: string,
  ) {
    return this.peopleOpsService.getContext({
      siteId,
      managerEmail,
    });
  }
}