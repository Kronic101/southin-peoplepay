import { Injectable } from '@nestjs/common';

@Injectable()
export class PayrollService {
  periodsPlaceholder() { return { data: [], message: 'Payroll periods placeholder.' }; }
  runsPlaceholder() { return { data: [], message: 'Payroll runs placeholder.' }; }

  calculatePlaceholder(id: string) {
    return {
      payrollRunId: id,
      message: 'Payroll calculation placeholder. Statutory rules must be loaded from configurable tables before real payroll use.'
    };
  }

  approvalPlaceholder(id: string, stage: string) {
    return { payrollRunId: id, stage, message: 'Approval stage placeholder.' };
  }

  lockPlaceholder(id: string) {
    return { payrollRunId: id, message: 'Payroll lock placeholder. Payslips and SharePoint reports are generated after lock.' };
  }
}
