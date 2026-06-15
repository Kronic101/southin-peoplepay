import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { EmployeesModule } from './employees/employees.module';
import { PayrollModule } from './payroll/payroll.module';
import { StatutoryModule } from './statutory/statutory.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { ExecutiveModule } from './executive/executive.module';
import { PaymentModule } from './payment/payment.module';
import { LeaveModule } from './leave/leave.module';
import { OrgModule } from './org/org.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { FinanceModule } from './finance/finance.module';
import { AssetsModule } from './assets/assets.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    AuthModule,
    EmployeesModule,
    PayrollModule,
    StatutoryModule,
    DashboardModule,
    IntegrationsModule,
    ExecutiveModule,
    PaymentModule,
    LeaveModule,
    OrgModule,
    ApprovalsModule,
    FinanceModule,
    AssetsModule,
  ]
})
export class AppModule {}
