import { Module } from '@nestjs/common';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { PayrollReadinessGatesService } from './payroll-readiness-gates.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [PayrollController],
  providers: [PayrollService, PayrollReadinessGatesService, PrismaService],
  exports: [PayrollService, PayrollReadinessGatesService],
})
export class PayrollModule {}