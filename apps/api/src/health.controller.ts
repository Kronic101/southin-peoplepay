import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get()
  root() {
    return {
      status: 'ok',
      service: 'Southin PeoplePay API',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'Southin PeoplePay API',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('api/health')
  apiHealth() {
    return {
      status: 'ok',
      service: 'Southin PeoplePay API',
      timestamp: new Date().toISOString(),
    };
  }
}