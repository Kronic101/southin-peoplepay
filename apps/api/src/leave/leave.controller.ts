import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { LeaveService } from './leave.service';

@Controller('leave')
export class LeaveController {
  constructor(
    private readonly authService: AuthService,
    private readonly leaveService: LeaveService,
  ) {}

  @Post('employee/request')
  async createEmployeeLeaveRequest(@Req() req: any, @Body() body: any) {
    const employee = await this.authService.employeeMe(req);
    return this.leaveService.createEmployeeLeaveRequest(employee.id, body);
  }

  @Get('employee/requests')
  async getMyLeaveRequests(@Req() req: any) {
    const employee = await this.authService.employeeMe(req);
    return this.leaveService.getEmployeeLeaveRequests(employee.id);
  }

  @Get('supervisor/requests')
  getSupervisorLeaveRequests(@Query('email') email: string) {
    return this.leaveService.getSupervisorLeaveRequests(email);
  }

  @Patch('supervisor/requests/:id/review')
  reviewLeaveRequest(@Param('id') id: string, @Body() body: any) {
    return this.leaveService.reviewLeaveRequest(id, body);
  }
}