type StatusPillProps = {
  status?: string | null;
  label?: string;
};

function getClassName(status?: string | null) {
  const value = String(status || '').toUpperCase();

  if (
    [
      'ACTIVE',
      'APPROVED',
      'APPROVED_FOR_MANUAL_PAYMENT',
      'COMPLETED',
      'GENERATED',
      'LOCKED',
      'READY',
      'READY_FOR_PAYMENT',
      'VALIDATED',
    ].includes(value)
  ) {
    return 'status-pill locked';
  }

  if (
    value.includes('PENDING') ||
    value.includes('DRAFT') ||
    value.includes('OPEN') ||
    value.includes('BLOCKED')
  ) {
    return 'status-pill warning';
  }

  if (value.includes('REJECTED') || value.includes('FAILED') || value.includes('ERROR')) {
    return 'status-pill danger';
  }

  return 'status-pill';
}

export function StatusPill({ status, label }: StatusPillProps) {
  return <span className={getClassName(status)}>{label || status || '-'}</span>;
}