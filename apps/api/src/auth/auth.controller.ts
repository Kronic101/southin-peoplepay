import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
} from '@nestjs/common';

import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  /**
   * Canonical employee login endpoint.
   *
   * POST /api/auth/employee/login
   */
  @Post('employee/login')
  employeeLogin(@Body() body: any) {
    return this.authService.employeeLogin(body);
  }

  /**
   * Compatibility endpoint for the current
   * mobile APK.
   *
   * POST /api/auth/mobile-login
   */
  @Post('mobile-login')
  mobileLogin(@Body() body: any) {
    return this.authService.employeeLogin(body);
  }

  /**
   * Temporary compatibility endpoint for
   * clients/tests that used employee-login.
   *
   * POST /api/auth/employee-login
   */
  @Post('employee-login')
  legacyEmployeeLogin(@Body() body: any) {
    return this.authService.employeeLogin(body);
  }

  /**
   * Change employee PIN.
   *
   * POST /api/auth/employee/change-pin
   */
  @Post('employee/change-pin')
  employeeChangePin(@Body() body: any) {
    return this.authService.employeeChangePin(body);
  }

  /**
   * Forgot employee PIN.
   *
   * POST /api/auth/employee/forgot-pin
   */
  @Post('employee/forgot-pin')
  employeeForgotPin(@Body() body: any) {
    return this.authService.employeeForgotPin(body);
  }

  /**
   * Current employee profile.
   *
   * GET /api/auth/employee/me
   */
  @Get('employee/me')
  employeeMe(@Req() req: any) {
    return this.authService.employeeMe(req);
  }

  /**
   * Employee payslips.
   *
   * GET /api/auth/employee/payslips
   */
  @Get('employee/payslips')
  employeePayslips(@Req() req: any) {
    return this.authService.getEmployeePayslips(req);
  }

  /**
   * Single employee payslip.
   *
   * GET /api/auth/employee/payslips/:id
   */
  @Get('employee/payslips/:id')
  employeePayslip(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.authService.getEmployeePayslip(
      id,
      req,
    );
  }

  /**
   * Employee time summary.
   *
   * GET /api/auth/employee/time-summary
   */
  @Get('employee/time-summary')
  employeeTimeSummary(@Req() req: any) {
    return this.authService.employeeTimeSummary(req);
  }
}