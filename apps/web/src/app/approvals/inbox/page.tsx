'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';

import AppShell from '@/components/AppShell';
import { RequireStaffRole } from '@/components/RequireStaffRole';
import {
  ApprovalWorkflowRecord,
  approveApprovalWorkflow,
  getApprovalInbox,
  rejectApprovalWorkflow,
} from '@/lib/approvals-api';

type StaffRole =
  | 'ADMIN'
  | 'DIRECTOR'
  | 'FINANCE_MANAGER'
  | 'FINANCE_OFFICER'
  | 'HR_MANAGER'
  | 'HR_OFFICER'
  | 'LINE_MANAGER'
  | 'SUPERVISOR'
  | 'ASSET_MANAGER'
  | 'ASSET_OFFICER'
  | 'FLEET_MANAGER'
  | 'FLEET_DISPATCH_OFFICER'
  | 'PAYROLL_OFFICER'
  | 'PROCUREMENT_OFFICER'
  | 'STORES_OFFICER'
  | 'AUDITOR';

const ALLOWED_APPROVAL_ROLES: StaffRole[] = [
  'ADMIN',
  'DIRECTOR',
  'FINANCE_MANAGER',
  'FINANCE_OFFICER',
  'HR_MANAGER',
  'HR_OFFICER',
  'LINE_MANAGER',
  'SUPERVISOR',
  'ASSET_MANAGER',
  'ASSET_OFFICER',
  'FLEET_MANAGER',
  'FLEET_DISPATCH_OFFICER',
  'PAYROLL_OFFICER',
  'PROCUREMENT_OFFICER',
  'STORES_OFFICER',
  'AUDITOR',
];

type AnyRecord = Record<string, any>;
type DetailRow = [string, string];

function compactDetailRows(rows: Array<[string, any]>): DetailRow[] {
  return rows
    .map(([label, value]) => [String(label), scalar(value)] as DetailRow)
    .filter(([, value]) => value.length > 0);
}

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

function formatDate(value: any): string {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return scalar(value);

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function money(value: any, currency = 'ZMW'): string {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return currency === 'ZMW' ? 'K 0' : `${currency} 0`;
  }

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

function extractApprovalPayload(request: AnyRecord) {
  const payload = asObject(request?.payload);
  const sourceInput = asObject(payload.sourceInput || request?.sourceInput);
  const sourcePayload = asObject(
    sourceInput.payload ||
      payload.sourcePayload ||
      payload.payload ||
      request?.sourcePayload,
  );

  return {
    payload,
    sourceInput,
    sourcePayload,
  };
}

function buildApprovalRequestDetailRows(request: AnyRecord): DetailRow[] {
  const { sourceInput, sourcePayload } = extractApprovalPayload(request);

  const module = scalar(request?.module || sourceInput.module).toUpperCase();
  const workflowType = scalar(request?.workflowType || sourceInput.workflowType).toUpperCase();

  if (module === 'PEOPLE_OPERATIONS' && workflowType === 'LEAVE_REQUEST') {
    return compactDetailRows([
      ['Employee', sourcePayload.employeeName || sourceInput.employeeName],
      ['Employee No', sourcePayload.employeeNumber || sourceInput.employeeNumber],
      ['Leave Type', sourcePayload.leaveType || sourceInput.leaveType],
      ['Start Date', formatDate(sourcePayload.startDate || sourceInput.startDate)],
      ['End Date', formatDate(sourcePayload.endDate || sourceInput.endDate)],
      ['Total Days', sourcePayload.totalDays || sourceInput.totalDays],
      ['Site', sourcePayload.siteName || sourcePayload.site || sourceInput.site],
      ['Responsible Manager', sourcePayload.siteManagerName || sourceInput.siteManagerName],
      ['Manager Email', sourcePayload.siteManagerEmail || sourceInput.siteManagerEmail],
      ['Reason', sourcePayload.reason || sourceInput.reason || request?.requestDescription],
    ]);
  }

  if (module === 'PEOPLE_OPERATIONS' && workflowType === 'OVERTIME_REQUEST') {
    return compactDetailRows([
      ['Employee', sourcePayload.employeeName || sourceInput.employeeName],
      ['Employee No', sourcePayload.employeeNumber || sourceInput.employeeNumber],
      ['Overtime Date', formatDate(sourcePayload.overtimeDate || sourceInput.overtimeDate)],
      ['Requested Hours', sourcePayload.requestedHours || sourceInput.requestedHours],
      ['Hourly Rate', money(sourcePayload.hourlyRate || sourceInput.hourlyRate || 0)],
      ['Estimated Cost', money(sourcePayload.estimatedCost || sourceInput.amount || request?.amount || 0)],
      ['Site', sourcePayload.siteName || sourcePayload.site || sourceInput.site],
      ['Responsible Manager', sourcePayload.siteManagerName || sourceInput.siteManagerName],
      ['Manager Email', sourcePayload.siteManagerEmail || sourceInput.siteManagerEmail],
      ['Reason', sourcePayload.reason || sourceInput.reason || request?.requestDescription],
    ]);
  }

  if (module === 'PEOPLE_OPERATIONS' && workflowType === 'TIMESHEET_APPROVAL') {
    return compactDetailRows([
      ['Employee', sourcePayload.employeeName || sourceInput.employeeName],
      ['Employee No', sourcePayload.employeeNumber || sourceInput.employeeNumber],
      ['Period Start', formatDate(sourcePayload.periodStart || sourceInput.periodStart)],
      ['Period End', formatDate(sourcePayload.periodEnd || sourceInput.periodEnd)],
      ['Normal Hours', sourcePayload.normalHours || sourceInput.normalHours],
      ['Overtime Hours', sourcePayload.overtimeHours || sourceInput.overtimeHours],
      ['Site', sourcePayload.siteName || sourcePayload.site || sourceInput.site],
      ['Responsible Manager', sourcePayload.siteManagerName || sourceInput.siteManagerName],
      ['Manager Email', sourcePayload.siteManagerEmail || sourceInput.siteManagerEmail],
      ['Notes', sourcePayload.notes || sourceInput.notes || request?.requestDescription],
    ]);
  }

  if (module === 'PEOPLE_OPERATIONS' && workflowType === 'PEOPLE_ATTENDANCE_REVIEW') {
    return compactDetailRows([
      ['Review Reference', sourceInput.requestNo || request?.requestReference],
      ['Period', sourcePayload.period || sourceInput.period],
      ['Site', sourcePayload.siteName || sourcePayload.site || sourceInput.site],
      ['Department', sourcePayload.department || sourceInput.department || request?.requesterDepartment],
      ['Captured Records', sourcePayload.recordCount || sourceInput.recordCount],
      ['Prepared By', sourcePayload.submittedBy || sourceInput.requestedBy || request?.requesterName],
      ['Notes', sourcePayload.notes || sourceInput.description || request?.requestDescription],
    ]);
  }

  return compactDetailRows([
    ['Description', sourceInput.description || sourcePayload.description || request?.requestDescription],
    ['Department', sourceInput.department || sourcePayload.department || request?.requesterDepartment],
    ['Site', sourceInput.site || sourcePayload.site || request?.requesterSite],
    ['Amount', request?.amount ? money(request.amount) : ''],
  ]);
}


function formatAmount(value?: string | number | null) {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount) || amount === 0) return '-';

  return `K ${amount.toLocaleString('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function normalise(value: unknown) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replaceAll(' ', '_')
    .replaceAll('-', '_');
}

function cleanStatus(value?: string | null) {
  return normalise(value || 'UNKNOWN').replaceAll('_', ' ');
}

function statusClass(value?: string | null) {
  const status = normalise(value);

  if (status === 'APPROVED' || status === 'COMPLETED' || status === 'PAID') {
    return 'status-pill success';
  }

  if (status === 'REJECTED' || status === 'CANCELLED' || status === 'FAILED') {
    return 'status-pill danger';
  }

  return 'status-pill warning';
}

function getPayload(record: ApprovalWorkflowRecord): Record<string, any> {
  const payload = (record as any).payload;

  if (!payload) return {};

  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload);
    } catch {
      return {};
    }
  }

  if (typeof payload === 'object') return payload;

  return {};
}

function getWorkflowStatus(record: ApprovalWorkflowRecord) {
  const payload = getPayload(record);
  return payload.workflowStatus || record.status;
}

function getCurrentStepLabel(record: ApprovalWorkflowRecord) {
  const payload = getPayload(record);
  const nextStep = payload.nextStep;
  const firstStep = payload.firstStep;

  if (nextStep?.label) return nextStep.label;

  if (firstStep?.label && Number((record as any).currentStep || 1) === Number(firstStep.sequence || 1)) {
    return firstStep.label;
  }

  const pendingDecision = Array.isArray((record as any).decisions)
    ? (record as any).decisions.find((item: any) => normalise(item.status) === 'PENDING')
    : null;

  if (pendingDecision?.role) {
    return `Step ${pendingDecision.sequence || (record as any).currentStep || 1}`;
  }

  return (record as any).currentStepRole || `Step ${(record as any).currentStep || 1}`;
}

function getCurrentRole(record: ApprovalWorkflowRecord) {
  const payload = getPayload(record);

  const pendingDecision = Array.isArray((record as any).decisions)
    ? (record as any).decisions.find((item: any) => normalise(item.status) === 'PENDING')
    : null;

  return (
    (record as any).currentStepRole ||
    (record as any).currentApprovalRole ||
    pendingDecision?.role ||
    payload?.nextStep?.role ||
    payload?.firstStep?.role ||
    '-'
  );
}

function getCurrentApprover(record: ApprovalWorkflowRecord) {
  const payload = getPayload(record);
  const resolved = payload.resolvedApprover;

  const pendingDecision = Array.isArray((record as any).decisions)
    ? (record as any).decisions.find((item: any) => normalise(item.status) === 'PENDING')
    : null;

  return (
    (record as any).currentApproverEmail ||
    (record as any).assignedToEmail ||
    (record as any).approverEmail ||
    pendingDecision?.approverEmail ||
    resolved?.approver?.email ||
    resolved?.originalApprover?.email ||
    '-'
  );
}

function getHistory(record: ApprovalWorkflowRecord) {
  const payload = getPayload(record);

  if (Array.isArray(payload.history) && payload.history.length) {
    return payload.history;
  }

  if (Array.isArray((record as any).decisions)) {
    return (record as any).decisions
      .filter((item: any) => normalise(item.status) !== 'PENDING')
      .map((item: any) => ({
        stepSequence: item.sequence,
        action: item.status,
        actionedBy: item.approverName,
        actionedByEmail: item.approverEmail,
        comments: item.comments,
        actionedAt: item.decidedAt || item.updatedAt,
      }));
  }

  return [];
}

function roleMatchesApprovalStep(userRole: string, approvalRole: string) {
  const role = normalise(userRole);
  const stepRole = normalise(approvalRole);

  if (!role || !stepRole) return false;
  if (role === 'ADMIN') return true;
  if (role === stepRole) return true;

  const aliases: Record<string, string[]> = {
    DIRECTOR: ['DIRECTOR', 'DIRECTOR_FINANCE', 'DIRECTOR_OPERATIONS'],
    FINANCE_MANAGER: ['FINANCE_MANAGER', 'DIRECTOR_FINANCE'],
    HR_MANAGER: ['HR_MANAGER'],
    PROCUREMENT_OFFICER: ['PROCUREMENT_OFFICER'],
    STORES_OFFICER: ['STORES_OFFICER'],
    ASSET_MANAGER: ['ASSET_MANAGER'],
    FLEET_MANAGER: ['FLEET_MANAGER', 'WORKSHOP_MANAGER'],
    FLEET_DISPATCH_OFFICER: ['FLEET_DISPATCH_OFFICER'],
    LINE_MANAGER: ['LINE_MANAGER', 'SUPERVISOR', 'HOD', 'SITE_MANAGER', 'FOREMAN', 'BRANCH_MANAGER'],
    SUPERVISOR: ['SUPERVISOR', 'LINE_MANAGER', 'FOREMAN'],
    PAYROLL_OFFICER: ['PAYROLL_OFFICER'],
    AUDITOR: ['AUDITOR'],
  };

  return aliases[role]?.includes(stepRole) ?? false;
}

function isTerminalStatus(record: ApprovalWorkflowRecord) {
  const status = normalise(record.status);
  return ['APPROVED', 'REJECTED', 'CANCELLED', 'CLOSED'].includes(status);
}

function normaliseRecords(data: any): ApprovalWorkflowRecord[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.workflows)) return data.workflows;
  if (Array.isArray(data?.requests)) return data.requests;
  return [];
}

function getApprovalContextRows(request: any) {
  const payload = getPayload(request);
  const sourceInput = payload?.sourceInput || {};
  const sourcePayload = sourceInput?.payload || {};
  const details = sourcePayload?.details || sourcePayload?.movement || sourcePayload || {};

  const module = String(request?.module || sourceInput?.module || '').toUpperCase();
  const workflowType = String(request?.workflowType || sourceInput?.workflowType || '').toUpperCase();

  const scalar = (value: any) => {
    if (value === undefined || value === null) return '';
    if (typeof value === 'object') return '';
    return String(value).trim();
  };

  if (module === 'ASSET_MANAGEMENT' && workflowType === 'ASSET_MOVEMENT') {
    const lines = Array.isArray(details?.lines) ? details.lines : [];
    const firstLine = lines[0] || {};
    const firstStockItem = firstLine?.stockItem || {};

    const itemCode =
      scalar(details.stockItemCode) ||
      scalar(details.itemCode) ||
      scalar(firstLine.stockItemCode) ||
      scalar(firstLine.itemCode) ||
      scalar(firstStockItem.itemCode);

    const itemName =
      scalar(details.stockItemName) ||
      scalar(details.itemName) ||
      scalar(firstLine.stockItemName) ||
      scalar(firstLine.itemName) ||
      scalar(firstStockItem.itemName);

    const singleItem =
      [itemCode, itemName].filter(Boolean).join(' - ') ||
      scalar(details.stockItemId) ||
      scalar(firstLine.stockItemId);

    const itemSummary = lines.length
      ? lines
          .slice(0, 5)
          .map((line: any) => {
            const stockItem = line?.stockItem || {};
            const code =
              scalar(line.stockItemCode) ||
              scalar(line.itemCode) ||
              scalar(stockItem.itemCode);

            const name =
              scalar(line.stockItemName) ||
              scalar(line.itemName) ||
              scalar(stockItem.itemName) ||
              scalar(line.description) ||
              'Item';

            const qty = scalar(line.quantity) || '0';
            const unit = scalar(line.unitOfMeasure) || scalar(stockItem.unitOfMeasure);

            return `${[code, name].filter(Boolean).join(' - ')} x ${qty}${unit ? ` ${unit}` : ''}`;
          })
          .join('; ')
      : '';

    const fromLocation =
      scalar(details.fromLocationName) ||
      scalar(details.fromLocationCode) ||
      scalar(details.fromLocation?.locationName) ||
      scalar(details.fromLocation?.locationCode) ||
      'None';

    const toLocation =
      scalar(details.toLocationName) ||
      scalar(details.toLocationCode) ||
      scalar(details.toLocation?.locationName) ||
      scalar(details.toLocation?.locationCode) ||
      'None';

    return [
      ['Movement Type', scalar(details.movementType) || scalar(sourceInput.movementType)],
      ['Item / Items', itemSummary || singleItem],
      ['Quantity', scalar(details.quantity) || scalar(firstLine.quantity) || scalar(sourceInput.quantity)],
      ['From Location', fromLocation],
      ['To Location', toLocation],
      ['Site', scalar(details.site) || scalar(sourceInput.site) || scalar(request.requesterSite)],
      ['Branch', scalar(details.branch) || scalar(sourceInput.branch) || scalar(request.branch)],
      ['Unit Cost', scalar(details.unitCost) || scalar(firstLine.unitCost)],
      ['Total Value', scalar(details.totalValue) || scalar(firstLine.totalCost) || scalar(sourceInput.amount) || scalar(request.amount)],
      ['Reason', scalar(details.reason) || scalar(sourceInput.description) || scalar(request.requestDescription)],
    ].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '');
  }

  if (module === 'STORES' && workflowType === 'STORES_REQUISITION') {
    const lines = Array.isArray(details?.lines) ? details.lines : [];

    const itemSummary = lines.length
      ? lines
          .slice(0, 5)
          .map((line: any) => {
            const item = scalar(line.itemName) || scalar(line.description) || 'Item';
            const qty = scalar(line.quantity) || '0';
            const unit = scalar(line.unitOfMeasure) || scalar(line.unit);
            return `${item} x ${qty}${unit ? ` ${unit}` : ''}`;
          })
          .join('; ')
      : '';

    return [
      ['Site', scalar(sourceInput.site) || scalar(request.requesterSite)],
      ['Branch', scalar(sourceInput.branch) || scalar(request.branch)],
      ['Department', scalar(sourceInput.department) || scalar(request.requesterDepartment)],
      ['Items', itemSummary],
      ['Reason', scalar(details.reason) || scalar(sourceInput.description) || scalar(request.requestDescription)],
    ].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '');
  }

  if (module === 'PROCUREMENT' && workflowType === 'PROCUREMENT_REQUEST') {
    const lines = Array.isArray(details?.lines)
      ? details.lines
      : Array.isArray(sourceInput?.lines)
        ? sourceInput.lines
        : [];

    const itemSummary = lines.length
      ? lines
          .slice(0, 5)
          .map((line: any) => {
            const item =
              scalar(line.itemName) ||
              scalar(line.description) ||
              scalar(line.serviceDescription) ||
              'Item / Service';

            const qty = scalar(line.quantity) || scalar(line.requestedQuantity) || '1';
            const unit = scalar(line.unitOfMeasure) || scalar(line.unit);

            return `${item} x ${qty}${unit ? ` ${unit}` : ''}`;
          })
          .join('; ')
      : '';

    return [
      ['Requisition No', scalar(details.requisitionNo) || scalar(sourceInput.requisitionNo) || scalar(request.requestReference)],
      ['Supplier', scalar(details.supplierName) || scalar(sourceInput.supplierName) || scalar(details.supplier) || scalar(sourceInput.supplier)],
      ['Description', scalar(details.description) || scalar(sourceInput.description) || scalar(request.requestDescription)],
      ['Items / Services', itemSummary],
      ['Department', scalar(details.department) || scalar(sourceInput.department) || scalar(request.requesterDepartment)],
      ['Site', scalar(details.site) || scalar(sourceInput.site) || scalar(request.requesterSite)],
      ['Branch', scalar(details.branch) || scalar(sourceInput.branch)],
      ['Invoice Status', scalar(details.invoiceStatus) || scalar(sourceInput.invoiceStatus)],
      ['Payment Status', scalar(details.paymentStatus) || scalar(sourceInput.paymentStatus)],
      ['Amount', scalar(details.amount) || scalar(sourceInput.amount) || scalar(request.amount)],
      ['Reason', scalar(details.reason) || scalar(sourceInput.reason) || scalar(sourceInput.description) || scalar(request.requestDescription)],
    ].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '');
  }

  return [];
}

function getAssetMovementDetails(request: any) {
  const payload = getPayload(request);
  const sourceInput = payload?.sourceInput || {};
  const sourcePayload = sourceInput?.payload || {};

  const module = String(request?.module || sourceInput?.module || '').toUpperCase();
  const workflowType = String(request?.workflowType || sourceInput?.workflowType || '').toUpperCase();

  if (module !== 'ASSET_MANAGEMENT' || workflowType !== 'ASSET_MOVEMENT') {
    return null;
  }

  const lines = Array.isArray(sourcePayload?.lines) ? sourcePayload.lines : [];
  const firstLine = lines[0] || {};
  const stockItem = firstLine?.stockItem || {};

  const fromLocation = sourcePayload?.fromLocation || {};
  const toLocation = sourcePayload?.toLocation || {};

  const locationLabel = (location: any) => {
    const code = location?.locationCode || '';
    const name = location?.locationName || '';
    return [code, name].filter(Boolean).join(' - ') || 'None';
  };

  const lineSummary = lines.length
    ? lines
        .slice(0, 8)
        .map((line: any) => {
          const item = line?.stockItem || {};
          const code = item?.itemCode || line?.itemCode || line?.stockItemCode || '';
          const name = item?.itemName || line?.itemName || line?.stockItemName || line?.description || 'Item';
          const qty = line?.quantity ?? '-';
          const unit = item?.unitOfMeasure || line?.unitOfMeasure || '';

          return `${[code, name].filter(Boolean).join(' - ')} x ${qty}${unit ? ` ${unit}` : ''}`;
        })
        .join('; ')
    : '';

  return {
    movementNo: sourcePayload?.movementNo || sourceInput?.requestNo || request?.requestReference || '-',
    movementType: sourcePayload?.movementType || sourceInput?.movementType || '-',
    itemSummary:
      lineSummary ||
      [stockItem?.itemCode, stockItem?.itemName].filter(Boolean).join(' - ') ||
      '-',
    quantity: firstLine?.quantity ?? sourcePayload?.quantity ?? '-',
    unitOfMeasure: stockItem?.unitOfMeasure || firstLine?.unitOfMeasure || '',
    fromLocation: locationLabel(fromLocation),
    toLocation: locationLabel(toLocation),
    site: sourcePayload?.site || sourceInput?.site || request?.requesterSite || '-',
    branch: sourcePayload?.branch || sourceInput?.branch || '-',
    department: sourcePayload?.department || sourceInput?.department || request?.requesterDepartment || '-',
    reason: sourcePayload?.reason || sourceInput?.description || request?.requestDescription || '-',
    requestedBy: sourcePayload?.requestedBy || sourceInput?.requestedBy || request?.requesterName || '-',
    requestedByEmail: sourcePayload?.requestedByEmail || sourceInput?.requestedByEmail || request?.requesterEmail || '-',
    lineCount: lines.length,
  };
}

export default function ApprovalInboxPage() {
  const { data: session, status: sessionStatus } = useSession();

  const [records, setRecords] = useState<ApprovalWorkflowRecord[]>([]);
  const [selected, setSelected] = useState<ApprovalWorkflowRecord | null>(null);
  const [comments, setComments] = useState('');
  const [actioning, setActioning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const signedInEmail = session?.user?.email ?? '';
  const signedInName = session?.user?.name ?? session?.user?.email ?? '';
  const signedInEntraId = (session?.user as any)?.entraObjectId ?? '';
  const signedInRole = (session?.user as any)?.staffRole ?? '';

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      if (sessionStatus !== 'authenticated' || !signedInEmail) {
        setRecords([]);
        setError('You must sign in with your Southin Microsoft 365 account to view approvals.');
        return;
      }

      if (!signedInRole) {
        setRecords([]);
        setError('Your account is signed in, but it has not been assigned to a Southin Hub approval role.');
        return;
      }

      const data = await getApprovalInbox({
        email: signedInEmail,
        role: signedInRole,
      });

      setRecords(normaliseRecords(data));
    } catch (err: any) {
      setError(err?.message || 'Unable to load approval inbox.');
    } finally {
      setLoading(false);
    }
  }, [sessionStatus, signedInEmail, signedInRole]);

  useEffect(() => {
    if (sessionStatus !== 'loading') {
      loadData();
    }
  }, [sessionStatus, loadData]);

  const stats = useMemo(() => {
    return {
      total: records.length,
      inReview: records.filter((item) => normalise(item.status) === 'IN_REVIEW').length,
      submitted: records.filter((item) => normalise(item.status) === 'SUBMITTED').length,
      approved: records.filter((item) => normalise(item.status) === 'APPROVED').length,
      rejected: records.filter((item) => normalise(item.status) === 'REJECTED').length,
    };
  }, [records]);

  const selectedCurrentRole = selected ? getCurrentRole(selected) : '';
  const selectedCanAction =
    !!selected &&
    !isTerminalStatus(selected) &&
    roleMatchesApprovalStep(signedInRole, selectedCurrentRole);
  const selectedContextRows = useMemo<DetailRow[]>(() => {
  if (!selected) return [];

  const standardRows = buildApprovalRequestDetailRows(selected);

  if (standardRows.length) {
    return standardRows;
  }

  return getApprovalContextRows(selected) as DetailRow[];
}, [selected]);
  const selectedAssetMovement = selected ? getAssetMovementDetails(selected) : null;

  async function handleApprove(record: ApprovalWorkflowRecord) {
    setActioning(true);
    setMessage('');
    setError('');

    try {
      if (sessionStatus !== 'authenticated' || !signedInEmail || !signedInRole) {
        setError('You must be signed in with an approved Southin Hub role before approving.');
        return;
      }

      const currentRole = getCurrentRole(record);

      if (!roleMatchesApprovalStep(signedInRole, currentRole)) {
        setError(`Your role ${signedInRole || 'UNKNOWN'} cannot approve the current step ${currentRole || 'UNKNOWN'}.`);
        return;
      }

      const result = await approveApprovalWorkflow(record.id, {
        approvedBy: signedInName,
        approvedByEmail: signedInEmail,
        approvedByEntraObjectId: signedInEntraId,
        approvedByRole: signedInRole,

        actionedBy: signedInName,
        actionedByEmail: signedInEmail,
        actionedByEntraObjectId: signedInEntraId,
        actionedByRole: signedInRole,

        comments: comments || 'Approved from Southin Hub approval inbox.',
      });

      setMessage(`Approval action completed. Status: ${result?.status || 'Updated'}`);
      setComments('');
      setSelected(null);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Unable to approve request.');
    } finally {
      setActioning(false);
    }
  }

  async function handleReject(record: ApprovalWorkflowRecord) {
    setActioning(true);
    setMessage('');
    setError('');

    try {
      if (sessionStatus !== 'authenticated' || !signedInEmail || !signedInRole) {
        setError('You must be signed in with an approved Southin Hub role before rejecting.');
        return;
      }

      const currentRole = getCurrentRole(record);

      if (!roleMatchesApprovalStep(signedInRole, currentRole)) {
        setError(`Your role ${signedInRole || 'UNKNOWN'} cannot reject the current step ${currentRole || 'UNKNOWN'}.`);
        return;
      }

      const result = await rejectApprovalWorkflow(record.id, {
        rejectedBy: signedInName,
        rejectedByEmail: signedInEmail,
        rejectedByEntraObjectId: signedInEntraId,
        rejectedByRole: signedInRole,

        actionedBy: signedInName,
        actionedByEmail: signedInEmail,
        actionedByEntraObjectId: signedInEntraId,
        actionedByRole: signedInRole,

        comments: comments || 'Rejected from Southin Hub approval inbox.',
        rejectionReason: comments || 'Rejected from Southin Hub approval inbox.',
      });

      setMessage(`Request rejected. Status: ${result?.status || 'Updated'}`);
      setComments('');
      setSelected(null);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Unable to reject request.');
    } finally {
      setActioning(false);
    }
  }

  return (
    <AppShell>
      <RequireStaffRole allowedRoles={ALLOWED_APPROVAL_ROLES}>
        <section className="finance-page">
          <div className="finance-card finance-hero-card">
            <div>
              <p className="eyebrow">Approval Workflow</p>
              <h1>Approval Inbox</h1>
              <p className="muted">
                Review approval requests assigned to your Microsoft 365 identity and Southin Hub role.
              </p>
            </div>

            <div className="action-row">
              <button className="btn-secondary" type="button" onClick={loadData}>
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {message ? <div className="alert success">{message}</div> : null}
          {error ? <div className="alert error">{error}</div> : null}

          <div className="finance-summary-grid">
            <div className="finance-summary-card">
              <span>Total</span>
              <strong>{stats.total}</strong>
            </div>
            <div className="finance-summary-card">
              <span>In Review</span>
              <strong>{stats.inReview}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Submitted</span>
              <strong>{stats.submitted}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Approved</span>
              <strong>{stats.approved}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Rejected</span>
              <strong>{stats.rejected}</strong>
            </div>
          </div>

          <div className="finance-summary-card">
            <p className="eyebrow">Signed-in Approver</p>
            <h2>{signedInName || 'Not signed in'}</h2>

            <div className="mini-detail-grid">
              <div>
                <span>Email</span>
                <strong>{signedInEmail || '-'}</strong>
              </div>
              <div>
                <span>Southin Hub Role</span>
                <strong>{signedInRole || 'Not mapped yet'}</strong>
              </div>
              <div>
                <span>Entra Object ID</span>
                <strong>{signedInEntraId || '-'}</strong>
              </div>
            </div>

            <p className="muted" style={{ marginTop: '1rem' }}>
              The inbox is filtered by your signed-in Microsoft 365 account and role. Manual approver email entry has been removed for audit control.
            </p>
          </div>

          <div className="finance-summary-card">
            <h2>Pending / Recent Requests</h2>

            <div className="employee-table-wrap">
              <table className="employee-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Workflow</th>
                    <th>Requester</th>
                    <th>Current Step</th>
                    <th>Approver</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {!records.length ? (
                    <tr>
                      <td colSpan={8}>{loading ? 'Loading approval requests...' : 'No approval requests found.'}</td>
                    </tr>
                  ) : (
                    records.map((record) => {
                      const currentRole = getCurrentRole(record);
                      const canReview =
                        !isTerminalStatus(record) &&
                        roleMatchesApprovalStep(signedInRole, currentRole);

                      return (
                        <tr key={record.id}>
                          <td>
                            <strong>{record.requestReference || record.id.slice(0, 8)}</strong>
                            <br />
                            <span className="muted">{formatDate(record.submittedAt || record.createdAt)}</span>
                          </td>

                          <td>
                            <strong>{record.module}</strong>
                            <br />
                            <span className="muted">{record.workflowType}</span>
                          </td>

                          <td>
                            <strong>{record.requesterName || '-'}</strong>
                            <br />
                            <span className="muted">
                              {record.requesterDepartment || record.requesterSite || record.requesterRole || '-'}
                            </span>
                          </td>

                          <td>
                            <strong>{getCurrentStepLabel(record)}</strong>
                            <br />
                            <span className="muted">{currentRole}</span>
                          </td>

                          <td>{getCurrentApprover(record)}</td>
                          <td>{formatAmount(record.amount)}</td>

                          <td>
                            <span className={statusClass(String(getWorkflowStatus(record)))}>
                              {cleanStatus(String(getWorkflowStatus(record)))}
                            </span>
                          </td>

                          <td>
                            <div className="action-row">
                              <button
                                className={canReview ? 'btn-secondary' : 'btn-ghost'}
                                type="button"
                                onClick={() => {
                                  setSelected(record);
                                  setComments('');
                                  setError('');
                                  setMessage('');
                                }}
                              >
                                {canReview ? 'Review' : 'View'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {selected ? (
            <div className="finance-summary-card">
              <div className="section-heading-row">
                <div>
                  <p className="eyebrow">Request Review</p>
                  <h2>{selected.requestTitle || selected.requestReference || 'Approval Request'}</h2>
                  <p className="muted">{selected.requestDescription || 'No request description provided.'}</p>
                </div>

                <button className="btn-secondary" type="button" onClick={() => setSelected(null)}>
                  Close
                </button>
              </div>

              <div className="mini-detail-grid">
                <div>
                  <span>Reference</span>
                  <strong>{selected.requestReference || selected.id}</strong>
                </div>
                <div>
                  <span>Module</span>
                  <strong>{selected.module}</strong>
                </div>
                <div>
                  <span>Workflow</span>
                  <strong>{selected.workflowType}</strong>
                </div>
                <div>
                  <span>Requester</span>
                  <strong>{selected.requesterName || '-'}</strong>
                </div>
                <div>
                  <span>Current Step</span>
                  <strong>{getCurrentStepLabel(selected)}</strong>
                </div>
                <div>
                  <span>Required Role</span>
                  <strong>{selectedCurrentRole || '-'}</strong>
                </div>
                <div>
                  <span>Detected Role</span>
                  <strong>{signedInRole || '-'}</strong>
                </div>
                <div>
                  <span>Amount</span>
                  <strong>{formatAmount(selected.amount)}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>{cleanStatus(String(getWorkflowStatus(selected)))}</strong>
                </div>
              </div>

              {selectedAssetMovement ? (
                <div style={{ marginTop: '1.25rem' }}>
                  <h3>Asset Movement Details</h3>

                  <div className="mini-detail-grid">
                    <div>
                      <span>Movement Number</span>
                      <strong>{selectedAssetMovement.movementNo}</strong>
                    </div>

                    <div>
                      <span>Movement Type</span>
                      <strong>{selectedAssetMovement.movementType}</strong>
                    </div>

                    <div>
                      <span>Item / Items Being Moved</span>
                      <strong>{selectedAssetMovement.itemSummary}</strong>
                    </div>

                    <div>
                      <span>Quantity</span>
                      <strong>
                        {selectedAssetMovement.quantity} {selectedAssetMovement.unitOfMeasure}
                      </strong>
                    </div>

                    <div>
                      <span>From Location</span>
                      <strong>{selectedAssetMovement.fromLocation}</strong>
                    </div>

                    <div>
                      <span>To Location</span>
                      <strong>{selectedAssetMovement.toLocation}</strong>
                    </div>

                    <div>
                      <span>Site</span>
                      <strong>{selectedAssetMovement.site}</strong>
                    </div>

                    <div>
                      <span>Branch</span>
                      <strong>{selectedAssetMovement.branch}</strong>
                    </div>

                    <div>
                      <span>Department</span>
                      <strong>{selectedAssetMovement.department}</strong>
                    </div>

                    <div>
                      <span>Requested By</span>
                      <strong>{selectedAssetMovement.requestedBy}</strong>
                      <br />
                      <span className="muted">{selectedAssetMovement.requestedByEmail}</span>
                    </div>

                    <div>
                      <span>Line Count</span>
                      <strong>{selectedAssetMovement.lineCount}</strong>
                    </div>
                  </div>

                  <div className="mini-detail-grid" style={{ marginTop: '0.75rem' }}>
                    <div>
                      <span>Reason</span>
                      <strong>{selectedAssetMovement.reason}</strong>
                    </div>
                  </div>
                </div>
              ) : null}

              {selectedContextRows.length ? (
                <div style={{ marginTop: '1.25rem' }}>
                  <h3>Request Details</h3>

                  <div className="mini-detail-grid">
                    {selectedContextRows.map(([label, value]) => (
                      <div key={String(label)}>
                        <span>{label}</span>
                        <strong>{String(value)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {!selectedCanAction && !isTerminalStatus(selected) ? (
                <div className="alert warning" style={{ marginTop: '1rem' }}>
                  You can view this request, but your detected role cannot action the current approval step.
                </div>
              ) : null}

              {isTerminalStatus(selected) ? (
                <div className="alert success" style={{ marginTop: '1rem' }}>
                  This request is already closed and cannot be changed.
                </div>
              ) : null}

              <label style={{ display: 'block', marginTop: '1rem' }}>
                Comments
                <textarea
                  value={comments}
                  onChange={(event) => setComments(event.target.value)}
                  placeholder="Add approval or rejection comments."
                  disabled={!selectedCanAction || actioning}
                />
              </label>

              <div className="action-row" style={{ marginTop: '1rem' }}>
                <button
                  className="btn"
                  type="button"
                  disabled={!selectedCanAction || actioning}
                  onClick={() => handleApprove(selected)}
                >
                  {actioning ? 'Processing...' : 'Approve'}
                </button>

                <button
                  className="btn-secondary"
                  type="button"
                  disabled={!selectedCanAction || actioning}
                  onClick={() => handleReject(selected)}
                >
                  Reject
                </button>

                <button className="btn-secondary" type="button" onClick={() => setSelected(null)}>
                  Close
                </button>
              </div>

              <h3 style={{ marginTop: '1.5rem' }}>Approval History</h3>

              {!getHistory(selected).length ? (
                <p className="muted">No approval actions recorded yet.</p>
              ) : (
                <div className="employee-table-wrap">
                  <table className="employee-table">
                    <thead>
                      <tr>
                        <th>Step</th>
                        <th>Action</th>
                        <th>Actioned By</th>
                        <th>Comments</th>
                        <th>Date</th>
                      </tr>
                    </thead>

                    <tbody>
                      {getHistory(selected).map((item: any, index: number) => (
                        <tr key={`${item.actionedAt || item.decidedAt || index}-${index}`}>
                          <td>{item.stepSequence || item.sequence || '-'}</td>
                          <td>{cleanStatus(item.action || item.status)}</td>
                          <td>
                            <strong>{item.actionedBy || item.approverName || '-'}</strong>
                            <br />
                            <span className="muted">{item.actionedByEmail || item.approverEmail || '-'}</span>
                          </td>
                          <td>{item.comments || '-'}</td>
                          <td>{formatDate(item.actionedAt || item.decidedAt || item.updatedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}
        </section>
      </RequireStaffRole>
    </AppShell>
  );
}