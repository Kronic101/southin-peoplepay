import { Controller, Get, Req } from '@nestjs/common';

import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('summary')
  summary(@Req() req: any) {
    const role =
      req.headers['x-user-role'] ||
      req.headers['X-User-Role'] ||
      'ADMIN';

    const email =
      req.headers['x-user-email'] ||
      req.headers['X-User-Email'] ||
      null;

    return this.service.summary(String(role), email ? String(email) : null);
  }

  @Get('executive')
  executive() {
    return this.service.executivePlaceholder();
  }
}