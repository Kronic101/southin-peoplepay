type AnyRecord = Record<string, any>;

function asObject(value: any): AnyRecord {
  if (!value) return {};

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }

  if (typeof value === 'object') return value;

  return {};
}

function scalar(value: any): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') return '';
  return String(value).trim();
}

function money(value: any, currency = 'ZMW') {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount)) return `${currency} 0`;

  if (currency === 'ZMW') {
    return `K ${amount.toLocaleString('en-ZM', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }

  return `${currency} ${amount.toLocaleString('en-ZM', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function locationLabel(location: any) {
  const code = scalar(location?.locationCode);
  const name = scalar(location?.locationName);
  return [code, name].filter(Boolean).join(' - ') || '';
}

function lineItemsSummary(lines: any[]) {
  if (!Array.isArray(lines) || !lines.length) return '';

  return lines
    .slice(0, 8)
    .map((line) => {
      const stockItem = line?.stockItem || line?.item || {};

      const code =
        scalar(line?.itemCode) ||
        scalar(line?.stockItemCode) ||
        scalar(stockItem?.itemCode);

      const name =
        scalar(line?.itemName) ||
        scalar(line?.stockItemName) ||
        scalar(line?.description) ||
        scalar(stockItem?.itemName) ||
        'Item';

      const qty = scalar(line?.quantity) || scalar(line?.requestedQuantity) || '0';

      const unit =
        scalar(line?.unitOfMeasure) ||
        scalar(line?.unit) ||
        scalar(stockItem?.unitOfMeasure);

      return `${[code, name].filter(Boolean).join(' - ')} x ${qty}${unit ? ` ${unit}` : ''}`;
    })
    .join('; ');
}

function extractSource(input: AnyRecord) {
  const payload = asObject(input.payload);

  const sourceInput = asObject(
    payload.sourceInput ||
    input.sourceInput
  );

  const sourcePayload = asObject(
    sourceInput.payload ||
    payload.sourcePayload ||
    input.sourcePayload ||
    payload
  );

  return {
    payload,
    sourceInput,
    sourcePayload,
  };
}

export function buildApprovalDetailRows(input: AnyRecord): Array<[string, string]> {
  const { sourceInput, sourcePayload } = extractSource(input);

  const module = scalar(input.module || sourceInput.module).toUpperCase();
  const workflowType = scalar(input.workflowType || sourceInput.workflowType).toUpperCase();

  if (module === 'ASSET_MANAGEMENT' && workflowType === 'ASSET_MOVEMENT') {
    const lines = Array.isArray(sourcePayload.lines) ? sourcePayload.lines : [];
    const firstLine = lines[0] || {};
    const firstStockItem = firstLine.stockItem || {};

    const rows: Array<[string, string]> = [
      ['Movement Type', scalar(sourcePayload.movementType || sourceInput.movementType)],
      ['Items', lineItemsSummary(lines)],
      ['Quantity', scalar(firstLine.quantity || sourcePayload.quantity)],
      ['From Location', locationLabel(sourcePayload.fromLocation) || scalar(sourcePayload.fromLocationName)],
      ['To Location', locationLabel(sourcePayload.toLocation) || scalar(sourcePayload.toLocationName)],
      ['Site', scalar(sourcePayload.site || sourceInput.site || input.requesterSite)],
      ['Branch', scalar(sourcePayload.branch || sourceInput.branch)],
      ['Unit Cost', money(firstLine.unitCost || sourcePayload.unitCost || 0)],
      ['Total Value', money(firstLine.totalCost || sourceInput.amount || input.amount || 0)],
      ['Reason', scalar(sourcePayload.reason || sourceInput.description || input.requestDescription)],
    ];

    if (!rows.find(([label]) => label === 'Items')?.[1]) {
      const fallbackItem = [firstStockItem.itemCode, firstStockItem.itemName].filter(Boolean).join(' - ');
      rows.push(['Item', fallbackItem]);
    }

    return rows.filter(([, value]) => value);
  }

  if (module === 'PROCUREMENT' && workflowType === 'PROCUREMENT_REQUEST') {
    const lines = Array.isArray(sourcePayload.lines)
      ? sourcePayload.lines
      : Array.isArray(sourceInput.lines)
        ? sourceInput.lines
        : [];

    const rows: Array<[string, string]> = [
      ['Requisition No', scalar(sourcePayload.requisitionNo || sourceInput.requisitionNo || input.requestReference)],
      ['Supplier', scalar(sourcePayload.supplierName || sourceInput.supplierName || sourcePayload.supplier || sourceInput.supplier)],
      ['Description', scalar(sourcePayload.description || sourceInput.description || input.requestDescription)],
      ['Items / Services', lineItemsSummary(lines)],
      ['Department', scalar(sourcePayload.department || sourceInput.department || input.requesterDepartment)],
      ['Site', scalar(sourcePayload.site || sourceInput.site || input.requesterSite)],
      ['Branch', scalar(sourcePayload.branch || sourceInput.branch)],
      ['Invoice Status', scalar(sourcePayload.invoiceStatus || sourceInput.invoiceStatus)],
      ['Payment Status', scalar(sourcePayload.paymentStatus || sourceInput.paymentStatus)],
      ['Amount', money(sourcePayload.amount || sourceInput.amount || input.amount || 0, scalar(sourceInput.currency) || 'ZMW')],
      ['Reason', scalar(sourcePayload.reason || sourceInput.reason || sourceInput.description || input.requestDescription)],
    ];

    return rows.filter(([, value]) => value);
  }

  if (module === 'STORES' && workflowType === 'STORES_REQUISITION') {
    const lines = Array.isArray(sourcePayload.lines)
      ? sourcePayload.lines
      : Array.isArray(sourceInput.lines)
        ? sourceInput.lines
        : [];

    const rows: Array<[string, string]> = [
      ['Requisition No', scalar(sourcePayload.requisitionNo || sourceInput.requisitionNo || input.requestReference)],
      ['Site', scalar(sourcePayload.site || sourceInput.site || input.requesterSite)],
      ['Branch', scalar(sourcePayload.branch || sourceInput.branch)],
      ['Department', scalar(sourcePayload.department || sourceInput.department || input.requesterDepartment)],
      ['Items', lineItemsSummary(lines)],
      ['Reason', scalar(sourcePayload.reason || sourceInput.reason || sourceInput.description || input.requestDescription)],
      ['Amount', money(sourcePayload.amount || sourceInput.amount || input.amount || 0, scalar(sourceInput.currency) || 'ZMW')],
    ];

    return rows.filter(([, value]) => value);
  }

  if (module === 'PEOPLE_OPERATIONS' && workflowType === 'OVERTIME_REQUEST') {
    const rows: Array<[string, string]> = [
        ['Overtime No', scalar(sourcePayload.overtimeNo || sourceInput.requestNo || input.requestReference)],
        ['Employee', scalar(sourcePayload.employeeName || sourceInput.employeeName)],
        ['Employee No', scalar(sourcePayload.employeeNumber || sourceInput.employeeNumber)],
        ['Site', scalar(sourcePayload.siteName || sourceInput.site || input.requesterSite)],
        ['Site Manager', scalar(sourcePayload.siteManagerName || sourceInput.siteManagerName)],
        ['Overtime Date', scalar(sourcePayload.overtimeDate || sourceInput.overtimeDate)],
        ['Requested Hours', scalar(sourcePayload.requestedHours || sourceInput.requestedHours)],
        ['Hourly Rate', money(sourcePayload.hourlyRate || sourceInput.hourlyRate || 0)],
        ['Estimated Cost', money(sourcePayload.estimatedCost || sourceInput.amount || input.amount || 0)],
        ['Reason', scalar(sourcePayload.reason || sourceInput.description || input.requestDescription)],
    ];

    return rows.filter(([, value]) => value);
    }

    if (module === 'PEOPLE_OPERATIONS' && workflowType === 'LEAVE_REQUEST') {
    const rows: Array<[string, string]> = [
        ['Leave Reference', scalar(sourcePayload.leaveNo || sourceInput.requestNo || input.requestReference)],
        ['Employee', scalar(sourcePayload.employeeName || sourceInput.employeeName)],
        ['Employee No', scalar(sourcePayload.employeeNumber || sourceInput.employeeNumber)],
        ['Leave Type', scalar(sourcePayload.leaveType || sourceInput.leaveType)],
        ['Start Date', scalar(sourcePayload.startDate || sourceInput.startDate)],
        ['End Date', scalar(sourcePayload.endDate || sourceInput.endDate)],
        ['Requested Days', scalar(sourcePayload.totalDays || sourceInput.totalDays)],
        ['Site', scalar(sourcePayload.siteName || sourceInput.site || input.requesterSite)],
        ['Site Manager', scalar(sourcePayload.siteManagerName || sourceInput.siteManagerName)],
        ['Reason', scalar(sourcePayload.reason || sourceInput.description || input.requestDescription)],
    ];

    return rows.filter(([, value]) => value);
    }

    if (module === 'PEOPLE_OPERATIONS' && workflowType === 'TIMESHEET_APPROVAL') {
    const rows: Array<[string, string]> = [
        ['Timesheet No', scalar(sourcePayload.timesheetNo || sourceInput.requestNo || input.requestReference)],
        ['Employee', scalar(sourcePayload.employeeName || sourceInput.employeeName)],
        ['Employee No', scalar(sourcePayload.employeeNumber || sourceInput.employeeNumber)],
        ['Site', scalar(sourcePayload.siteName || sourceInput.site || input.requesterSite)],
        ['Site Manager', scalar(sourcePayload.siteManagerName || sourceInput.siteManagerName)],
        ['Period Start', scalar(sourcePayload.periodStart || sourceInput.periodStart)],
        ['Period End', scalar(sourcePayload.periodEnd || sourceInput.periodEnd)],
        ['Normal Hours', scalar(sourcePayload.normalHours || sourceInput.normalHours)],
        ['Overtime Hours', scalar(sourcePayload.overtimeHours || sourceInput.overtimeHours)],
        ['Notes', scalar(sourcePayload.notes || sourceInput.description || input.requestDescription)],
    ];

    return rows.filter(([, value]) => value);
    }

    if (module === 'PEOPLE_OPERATIONS' && workflowType === 'PEOPLE_ATTENDANCE_REVIEW') {
    const rows: Array<[string, string]> = [
        ['Attendance No', scalar(sourcePayload.attendanceNo || sourceInput.requestNo || input.requestReference)],
        ['Employee', scalar(sourcePayload.employeeName || sourceInput.employeeName)],
        ['Employee No', scalar(sourcePayload.employeeNumber || sourceInput.employeeNumber)],
        ['Site', scalar(sourcePayload.siteName || sourceInput.site || input.requesterSite)],
        ['Site Manager', scalar(sourcePayload.siteManagerName || sourceInput.siteManagerName)],
        ['Attendance Date', scalar(sourcePayload.attendanceDate || sourceInput.attendanceDate)],
        ['Shift', scalar(sourcePayload.shift || sourceInput.shift)],
        ['Attendance Status', scalar(sourcePayload.status || sourceInput.attendanceStatus)],
        ['Notes', scalar(sourcePayload.notes || sourceInput.description || input.requestDescription)],
    ];

    return rows.filter(([, value]) => value);
    }

  if (module === 'FINANCE') {
    const rows: Array<[string, string]> = [
      ['Reference', scalar(sourceInput.requestNo || input.requestReference)],
      ['Description', scalar(sourceInput.description || sourcePayload.description || input.requestDescription)],
      ['Department', scalar(sourceInput.department || sourcePayload.department || input.requesterDepartment)],
      ['Site', scalar(sourceInput.site || sourcePayload.site || input.requesterSite)],
      ['Branch', scalar(sourceInput.branch || sourcePayload.branch)],
      ['Amount', money(sourceInput.amount || sourcePayload.amount || input.amount || 0, scalar(sourceInput.currency) || 'ZMW')],
      ['Reason', scalar(sourceInput.reason || sourcePayload.reason || input.requestDescription)],
    ];

    return rows.filter(([, value]) => value);
  }

  const rows: Array<[string, string]> = [
        ['Description', scalar(sourceInput.description || sourcePayload.description || input.requestDescription)],
        ['Department', scalar(sourceInput.department || sourcePayload.department || input.requesterDepartment)],
        ['Site', scalar(sourceInput.site || sourcePayload.site || input.requesterSite)],
        ['Branch', scalar(sourceInput.branch || sourcePayload.branch)],
        ['Amount', money(sourceInput.amount || sourcePayload.amount || input.amount || 0, scalar(sourceInput.currency) || 'ZMW')],
    ];

    return rows.filter(([, value]) => value);
    }

export function buildApprovalNotificationBody(input: AnyRecord) {
  const { sourceInput } = extractSource(input);

  const reference = scalar(input.requestReference || sourceInput.requestNo || sourceInput.requisitionNo) || '-';
  const title = scalar(input.requestTitle || sourceInput.title) || reference;
  const module = scalar(input.module || sourceInput.module) || '-';
  const workflowType = scalar(input.workflowType || sourceInput.workflowType) || '-';
  const requesterName = scalar(input.requesterName || sourceInput.requestedBy) || '-';
  const requesterEmail = scalar(input.requesterEmail || sourceInput.requestedByEmail) || '-';
  const amount = money(input.amount || sourceInput.amount || 0, scalar(sourceInput.currency) || 'ZMW');

  const detailRows = buildApprovalDetailRows(input);

  const lines = [
    'Approval required in Southin Hub.',
    '',
    `Reference: ${reference}`,
    `Title: ${title}`,
    `Module: ${module}`,
    `Workflow: ${workflowType}`,
    `Requester: ${requesterName}`,
    `Requester Email: ${requesterEmail}`,
    `Amount: ${amount}`,
  ];

  if (detailRows.length) {
    lines.push('', 'Request Details:');

    for (const [label, value] of detailRows) {
      lines.push(`${label}: ${value}`);
    }
  }

  return lines.join('\n');
}