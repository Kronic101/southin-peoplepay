import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('employee/login')
  employeeLogin(@Body() body: any) {
    return this.authService.employeeLogin(body);
  }

  @Post('employee/change-pin')
  employeeChangePin(@Body() body: any) {
    return this.authService.employeeChangePin(body);
  }

  @Post('employee/forgot-pin')
  employeeForgotPin(@Body() body: any) {
    return this.authService.employeeForgotPin(body);
  }

  @Get('employee/me')
  employeeMe(@Req() req: any) {
    return this.authService.employeeMe(req);
  }

  @Get('employee/payslips')
  employeePayslips(@Req() req: any) {
    return this.authService.getEmployeePayslips(req);
  }

  @Get('employee/payslips/:id')
  employeePayslip(@Param('id') id: string, @Req() req: any) {
    return this.authService.getEmployeePayslip(id, req);
  }
}