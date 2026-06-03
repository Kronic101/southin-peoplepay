import { Body, Controller, Get, Headers, Post, Param, Req, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

function decodeDevToken(authHeader?: string) {
  if (!authHeader) {
    throw new UnauthorizedException('Missing authorization header');
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    return JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
  } catch {
    throw new UnauthorizedException('Invalid token');
  }
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('employee/login')
  employeeLogin(@Body() body: unknown) {
    return this.authService.employeeLogin(body as any);
  }

  @Post('employee/change-pin')
  employeeChangePin(@Body() body: unknown) {
    return this.authService.employeeChangePin(body as any);
  }

  @Get('employee/me')
  employeeMe(@Headers('authorization') authorization?: string) {
    const token = decodeDevToken(authorization);

    if (token.type !== 'EMPLOYEE' || !token.employeeId) {
      throw new UnauthorizedException('Invalid employee session');
    }

    return this.authService.getEmployeeMe(token.employeeId);
  }

  @Get('dev/admin-token')
  devAdminToken() {
    return {
      message: 'Development admin token placeholder. Microsoft 365 authentication will replace this.',
      token: 'DEV_ADMIN_TOKEN',
    };
  }

  @Get('employee/payslips')
  getEmployeePayslips(@Req() req: any) {
    return this.authService.getEmployeePayslips(req);
  }

  @Get('employee/payslips/:id')
  getEmployeePayslip(@Param('id') id: string, @Req() req: any) {
    return this.authService.getEmployeePayslip(id, req);
  }

  @Post('employee/forgot-pin')
  employeeForgotPin(@Body() body: unknown) {
    return this.authService.employeeForgotPin(body as any);
  }
}