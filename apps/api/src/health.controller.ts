import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

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

  @Get('health/db')
  async databaseHealth() {
    const result = await this.prisma.$queryRaw<
      {
        now: Date;
        database_name: string;
        db_user: string;
      }[]
    >`
      select 
        now() as now,
        current_database() as database_name,
        current_user as db_user
    `;

    return {
      status: 'ok',
      service: 'Southin PeoplePay API',
      database: result[0],
      timestamp: new Date().toISOString(),
    };
  }
}