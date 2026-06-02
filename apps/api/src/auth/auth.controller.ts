import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Get('me')
  me() {
    return this.service.currentUserPlaceholder();
  }

  @Post('employee/login')
  employeeLogin(@Body() body: { employeeNumber: string; pin: string }) {
    return this.service.employeeLoginPlaceholder(body.employeeNumber);
  }

  @Post('employee/change-pin')
  changePin() {
    return this.service.changePinPlaceholder();
  }

  @Post('microsoft/login')
  microsoftLogin() {
    return this.service.microsoftLoginPlaceholder();
  }
}
