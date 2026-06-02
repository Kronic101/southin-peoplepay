import { Injectable } from '@nestjs/common';

@Injectable()
export class DashboardService {
  executivePlaceholder() {
    return {
      title: 'Southin PeoplePay Executive Dashboard',
      metrics: {
        activeEmployees: 0,
        casualWorkers: 0,
        grossPayroll: 0,
        netPayroll: 0,
        statutoryPayable: 0,
        payrollStatus: 'Not Started'
      }
    };
  }
}
