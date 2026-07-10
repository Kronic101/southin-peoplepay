import { Body, Controller, Post } from '@nestjs/common';

import { PeopleOpsService } from './people-ops.service';

@Controller('people-ops')
export class PeopleOpsController {
  constructor(private readonly service: PeopleOpsService) {}

  @Post('attendance')
  createAttendance(@Body() body: any) {
    return this.service.createAttendance(body);
  }

  @Post('timesheets')
  createTimesheet(@Body() body: any) {
    return this.service.createTimesheet(body);
  }

  @Post('leave')
  createLeaveRequest(@Body() body: any) {
    return this.service.createLeaveRequest(body);
  }

  @Post('overtime')
  createOvertimeRequest(@Body() body: any) {
    return this.service.createOvertimeRequest(body);
  }
}