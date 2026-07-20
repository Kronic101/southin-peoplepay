export function approvalLabel(record: any) {
  if (record?.approval?.fullyApproved) return 'FULLY APPROVED';
  if (record?.approval?.status) return record.approval.status;
  return record?.status || 'OPEN';
}

export function approvalProgress(record: any) {
  const approved = record?.approval?.approvedSteps ?? 0;
  const total = record?.approval?.totalSteps ?? 0;

  if (!total) return '-';

  return `${approved}/${total}`;
}

export function payrollReady(record: any) {
  return record?.approval?.payrollReady ? 'YES' : 'NO';
}

export function currentApprover(record: any) {
  return (
    record?.approval?.currentApproverEmail ||
    record?.managerEmail ||
    record?.approverEmail ||
    '-'
  );
}