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
import { FleetModule } from './fleet/fleet.module';
import { HealthController } from './health.controller';
import { ApprovalMatrixModule } from './approvals/approval-matrix.module';
import { StoresModule } from './stores/stores.module';
import { SitesModule } from './sites/sites.module';
import { PeopleOpsModule } from './people-ops/people-ops.module';
import { OperationsModule } from './operations/operations.module';

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
    FleetModule,    
    ApprovalMatrixModule,
    StoresModule,
    SitesModule,
    PeopleOpsModule,
    OperationsModule,
  ],
  controllers: [
    HealthController,
  ]
})
export class AppModule {}
