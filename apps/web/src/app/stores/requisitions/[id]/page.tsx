'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import AppShell from '@/components/AppShell';
import { RequireStaffRole } from '@/components/RequireStaffRole';
import {
  ApprovalWorkflowRecord,
  getApprovalWorkflows,
} from '@/lib/approvals-api';
import {
  StoresRequisitionOperations,
  StoresRequisitionRecord,
  StoresOperationLine,
  StoresIssueAssignment,
  StoresIssueAssignmentType,
  StockAssignmentPolicy,
  getStoresRequisition,
  getStoresRequisitionOperations,
  issueStoresRequisition,
  createStoresShortfallProcurementRequest,
} from '@/lib/stores-api';
import {
  DocumentAttachmentRecord,
  getDocumentSignedUrl,
  listDocuments,
  uploadDocument,
} from '@/lib/documents-api';
import { getPeopleOpsContext } from '@/lib/api';

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: unknown) {
  return `K ${asNumber(value).toLocaleString('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value?: string | null) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString('en-ZM', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getPayload(record?: ApprovalWorkflowRecord | null) {
  if (!record?.payload) return {};

  if (typeof record.payload === 'string') {
    try {
      return JSON.parse(record.payload);
    } catch {
      return {};
    }
  }

  return record.payload as any;
}

function getWorkflowStatus(
  requisition?: StoresRequisitionRecord | null,
  approval?: ApprovalWorkflowRecord | null,
) {
  if (requisition?.status === 'APPROVED') return 'APPROVED';
  if (requisition?.status === 'REJECTED') return 'REJECTED';

  if (!approval) return requisition?.status || '-';

  const payload = getPayload(approval);
  return payload.workflowStatus || approval.status;
}

function getCurrentStepLabel(
  requisition?: StoresRequisitionRecord | null,
  approval?: ApprovalWorkflowRecord | null,
) {
  if (requisition?.status === 'APPROVED' || approval?.status === 'APPROVED') {
    return 'Completed';
  }

  if (requisition?.status === 'REJECTED' || approval?.status === 'REJECTED') {
    return 'Rejected';
  }

  if (!approval) return '-';

  const payload = getPayload(approval);

  return (
    payload?.nextStep?.label ||
    payload?.firstStep?.label ||
    (approval as any).currentStepRole ||
    `Step ${approval.currentStep || 1}`
  );
}

function getCurrentRole(
  requisition?: StoresRequisitionRecord | null,
  approval?: ApprovalWorkflowRecord | null,
) {
  if (requisition?.status === 'APPROVED' || approval?.status === 'APPROVED') {
    return 'FINAL_APPROVED';
  }

  if (!approval) return '-';

  const payload = getPayload(approval);

  return (
    (approval as any).currentStepRole ||
    (approval as any).currentApprovalRole ||
    payload?.nextStep?.role ||
    payload?.firstStep?.role ||
    '-'
  );
}

function getCurrentApprover(
  requisition?: StoresRequisitionRecord | null,
  approval?: ApprovalWorkflowRecord | null,
) {
  if (requisition?.status === 'APPROVED') {
    return requisition.approvedBy || 'Final approval completed';
  }

  if (!approval) return '-';

  return (
    (approval as any).currentApproverEmail ||
    (approval as any).assignedToEmail ||
    (approval as any).approverEmail ||
    getPayload(approval)?.resolvedApprover?.approver?.email ||
    getPayload(approval)?.resolvedApprover?.originalApprover?.email ||
    '-'
  );
}

function getHistory(record?: ApprovalWorkflowRecord | null) {
  const payload = getPayload(record);
  return Array.isArray(payload.history) ? payload.history : [];
}

function statusClass(value?: string | null) {
  const status = String(value || '').toUpperCase();

  if (
    status === 'APPROVED' ||
    status === 'IN_STOCK' ||
    status === 'ISSUED' ||
    status === 'POSTED'
  ) {
    return 'status-pill success';
  }

  if (
    status === 'REJECTED' ||
    status === 'NOT_IN_STOCK' ||
    status === 'APPROVER_NOT_CONFIGURED'
  ) {
    return 'status-pill danger';
  }

  return 'status-pill warning';
}

function controlLabel(value?: string | null) {
  return String(value || '').toUpperCase() === 'NON_CONSUMABLE'
    ? 'Non-Consumable'
    : 'Consumable';
}


function normaliseLocationText(value?: string | null) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

function sameSiteText(left?: string | null, right?: string | null) {
  const a = normaliseLocationText(left);
  const b = normaliseLocationText(right);

  return Boolean(a && b && a === b);
}

function getLineStockDecision(
  line: StoresOperationLine,
  requestedSite?: string | null,
) {
  const remaining = asNumber(line.remainingQuantity);

  let requestedSiteAvailable = 0;
  let otherStoresAvailable = 0;

  for (const location of line.locations || []) {
    const quantity = asNumber(location.quantityOnHand);

    if (
      requestedSite &&
      location.site &&
      sameSiteText(location.site, requestedSite)
    ) {
      requestedSiteAvailable += quantity;
    } else {
      otherStoresAvailable += quantity;
    }
  }

  /*
   * If historical locations do not have a Site value,
   * preserve the backend's company-wide availability.
   */
  const locationTotal =
    requestedSiteAvailable + otherStoresAvailable;

  const companyAvailable =
    locationTotal > 0
      ? locationTotal
      : asNumber(line.availableQuantity);

  const procurementShortfall = Math.max(
    remaining - companyAvailable,
    0,
  );

  const transferRequired = Math.min(
    Math.max(remaining - requestedSiteAvailable, 0),
    otherStoresAvailable,
  );

  let action = 'PROCUREMENT_REQUIRED';

  if (remaining <= 0) {
    action = 'COMPLETED';
  } else if (requestedSiteAvailable >= remaining) {
    action = 'READY_TO_ISSUE';
  } else if (
    requestedSiteAvailable > 0 &&
    companyAvailable >= remaining
  ) {
    action = 'ISSUE_AND_TRANSFER';
  } else if (
    requestedSiteAvailable <= 0 &&
    otherStoresAvailable >= remaining
  ) {
    action = 'INTER_STORE_TRANSFER';
  } else if (
    requestedSiteAvailable > 0 &&
    procurementShortfall > 0
  ) {
    action = 'ISSUE_AND_PROCURE';
  } else if (
    otherStoresAvailable > 0 &&
    procurementShortfall > 0
  ) {
    action = 'TRANSFER_AND_PROCURE';
  }

  return {
    remaining,
    requestedSiteAvailable,
    otherStoresAvailable,
    companyAvailable,
    procurementShortfall,
    transferRequired,
    action,
  };
}

function decisionLabel(action: string) {
  switch (action) {
    case 'COMPLETED':
      return 'Completed';
    case 'READY_TO_ISSUE':
      return 'Ready to Issue';
    case 'ISSUE_AND_TRANSFER':
      return 'Issue Local Stock + Transfer Balance';
    case 'INTER_STORE_TRANSFER':
      return 'Inter-Store Transfer Required';
    case 'ISSUE_AND_PROCURE':
      return 'Issue Available Stock + Procure Shortfall';
    case 'TRANSFER_AND_PROCURE':
      return 'Transfer Available Stock + Procure Shortfall';
    default:
      return 'Procurement Required';
  }
}

function decisionNoticeClass(action: string) {
  if (action === 'COMPLETED' || action === 'READY_TO_ISSUE') {
    return 'finance-notice success';
  }

  return 'finance-notice warning';
}

type IssueQuantities = Record<string, string>;

type IssueAssignmentDraft = {
  type: StoresIssueAssignmentType | '';
  employeeId: string;
  referenceId: string;
};

type IssueAssignments = Record<string, IssueAssignmentDraft>;

function normaliseAssignmentPolicy(
  value?: StockAssignmentPolicy | string | null,
): StockAssignmentPolicy {
  const policy = String(value || 'NONE').toUpperCase();

  if (
    policy === 'EMPLOYEE' ||
    policy === 'SITE' ||
    policy === 'DEPARTMENT' ||
    policy === 'PROJECT' ||
    policy === 'DEPLOYMENT' ||
    policy === 'FLEXIBLE'
  ) {
    return policy as StockAssignmentPolicy;
  }

  return 'NONE';
}

function fixedAssignmentType(
  policy?: StockAssignmentPolicy | string | null,
): StoresIssueAssignmentType | '' {
  const value = normaliseAssignmentPolicy(policy);

  if (
    value === 'EMPLOYEE' ||
    value === 'SITE' ||
    value === 'DEPARTMENT' ||
    value === 'PROJECT'
  ) {
    return value;
  }

  return '';
}

function employeeName(employee: any) {
  return (
    employee?.name ||
    employee?.displayName ||
    employee?.fullName ||
    [
      employee?.firstName,
      employee?.middleName,
      employee?.lastName,
    ]
      .filter(Boolean)
      .join(' ')
      .trim() ||
    employee?.employeeNumber ||
    'Employee'
  );
}

type LocationOption = {
  id: string;
  code: string;
  name: string;
  site: string;
  branch: string;
};

export default function StoresRequisitionDetailPage() {
  const params = useParams<{ id: string }>();
  const requisitionId = params?.id;

  const [record, setRecord] = useState<StoresRequisitionRecord | null>(null);
  const [approval, setApproval] = useState<ApprovalWorkflowRecord | null>(null);
  const [operations, setOperations] =
    useState<StoresRequisitionOperations | null>(null);

  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [issueQuantities, setIssueQuantities] = useState<IssueQuantities>({});

  const [issuedBy, setIssuedBy] = useState('');
  const [issuedByEmail, setIssuedByEmail] = useState('');
  const [issueAssignments, setIssueAssignments] =
    useState<IssueAssignments>({});
  const [employeeSearches, setEmployeeSearches] =
    useState<Record<string, string>>({});
  const [custodyContext, setCustodyContext] = useState<any>(null);
  const [loadingCustodyContext, setLoadingCustodyContext] = useState(false);
  const [issueNotes, setIssueNotes] = useState('');

  const [documents, setDocuments] = useState<DocumentAttachmentRecord[]>([]);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentTitle, setDocumentTitle] = useState('');
  const [uploadingDocument, setUploadingDocument] = useState(false);

  const [creatingShortfallPr, setCreatingShortfallPr] = useState(false);
  const [shortfallPrMessage, setShortfallPrMessage] = useState('');
  const [relatedProcurement, setRelatedProcurement] = useState<any>(null);

  const [issuing, setIssuing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadSessionIdentity() {
    try {
      const response = await fetch('/api/auth/session', {
        cache: 'no-store',
      });

      if (!response.ok) return;

      const session = await response.json();
      const user = session?.user || {};

      const name = String(
        user.name || user.displayName || user.fullName || '',
      ).trim();

      const email = String(user.email || '').trim();

      if (name) setIssuedBy(name);
      if (email) setIssuedByEmail(email);
    } catch {
      // Issuer can still be entered manually.
    }
  }


  async function loadCustodyContext() {
    setLoadingCustodyContext(true);

    try {
      const context = await getPeopleOpsContext('');
      setCustodyContext(context || {});
    } catch {
      setCustodyContext({
        employees: [],
        sites: [],
      });
    } finally {
      setLoadingCustodyContext(false);
    }
  }

  async function loadDocuments(
    requisitionId: string,
    operationResult: StoresRequisitionOperations,
  ) {
    const resultSets = await Promise.all([
      listDocuments({
        module: 'STORES',
        entityType: 'STORES_REQUISITION',
        entityId: requisitionId,
      }),
      ...(operationResult.movements || []).map((movement) =>
        listDocuments({
          module: 'STORES',
          entityType: 'STOCK_MOVEMENT',
          entityId: movement.id,
        }),
      ),
    ]);

    const byId = new Map<string, DocumentAttachmentRecord>();

    for (const records of resultSets) {
      for (const item of records) {
        byId.set(item.id, item);
      }
    }

    setDocuments(
      [...byId.values()].sort(
        (a, b) =>
          new Date(b.uploadedAt).getTime() -
          new Date(a.uploadedAt).getTime(),
      ),
    );
  }

  async function loadData() {
    if (!requisitionId) return;

    setLoading(true);
    setError('');

    try {
      const [requisition, operationResult] = await Promise.all([
        getStoresRequisition(requisitionId),
        getStoresRequisitionOperations(requisitionId),
      ]);

      setRecord(requisition);
      setOperations(operationResult);

      try {
        await loadDocuments(requisition.id, operationResult);
      } catch {
        setDocuments([]);
      }

      if (requisition.approvalRequestId) {
        const workflows = await getApprovalWorkflows();
        const matched =
          workflows.find(
            (item) => item.id === requisition.approvalRequestId,
          ) || null;

        setApproval(matched);
      } else {
        setApproval(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load stores requisition.');
      setRecord(null);
      setOperations(null);
      setApproval(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    loadSessionIdentity();
    loadCustodyContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requisitionId]);

  const totalValue = useMemo(() => {
    return (record?.lines || []).reduce(
      (sum, line) => sum + asNumber(line.totalCost),
      0,
    );
  }, [record]);

  const isApproved = record?.status === 'APPROVED';
  const workflowApproved =
    approval?.status === 'APPROVED' || record?.status === 'APPROVED';

  const isRejected =
    record?.status === 'REJECTED' || approval?.status === 'REJECTED';

  const locationOptions = useMemo<LocationOption[]>(() => {
    const map = new Map<string, LocationOption>();

    for (const line of operations?.lines || []) {
      for (const location of line.locations || []) {
        if (!location.locationId) continue;

        /*
         * Direct Stores issue is site-controlled.
         * Stock held at another Southin site must flow
         * through an inter-store transfer instead.
         */
        if (
          record?.site &&
          location.site &&
          !sameSiteText(location.site, record.site)
        ) {
          continue;
        }

        if (!map.has(location.locationId)) {
          map.set(location.locationId, {
            id: location.locationId,
            code: location.locationCode || '',
            name: location.locationName || location.locationCode || 'Store',
            site: location.site || '',
            branch: location.branch || '',
          });
        }
      }
    }

    return [...map.values()].sort((a, b) =>
      `${a.code} ${a.name}`.localeCompare(`${b.code} ${b.name}`),
    );
  }, [operations, record?.site]);

  const selectedLocation = useMemo(
    () =>
      locationOptions.find(
        (location) => location.id === selectedLocationId,
      ) || null,
    [locationOptions, selectedLocationId],
  );

  function locationAvailability(
    line: StoresOperationLine,
    locationId: string,
  ) {
    const balance = (line.locations || []).find(
      (location) => location.locationId === locationId,
    );

    return asNumber(balance?.quantityOnHand);
  }

  function updateIssueQuantity(stockItemId: string, value: string) {
    setIssueQuantities((current) => ({
      ...current,
      [stockItemId]: value,
    }));
  }

  function fillAvailable(line: StoresOperationLine) {
    if (!line.stockItemId || !selectedLocationId) return;

    const available = locationAvailability(line, selectedLocationId);

    const quantity = Math.min(
      asNumber(line.remainingQuantity),
      available,
    );

    updateIssueQuantity(
      line.stockItemId,
      quantity > 0 ? String(quantity) : '',
    );
  }

  const selectedIssueLines = useMemo(() => {
    if (!operations) return [];

    return operations.lines
      .filter((line) => Boolean(line.stockItemId))
      .map((line) => ({
        line,
        quantity: asNumber(
          line.stockItemId ? issueQuantities[line.stockItemId] : 0,
        ),
      }))
      .filter((entry) => entry.quantity > 0);
  }, [operations, issueQuantities]);

  const employeeOptions = useMemo(() => {
    const employees = Array.isArray(custodyContext?.employees)
      ? custodyContext.employees
      : [];

    return employees
      .filter((employee: any) => {
        const status = String(employee?.status || '').toUpperCase();
        return !['ARCHIVED', 'TERMINATED', 'DISMISSED', 'INACTIVE'].includes(
          status,
        );
      })
      .sort((a: any, b: any) =>
        `${a?.employeeNumber || ''} ${employeeName(a)}`.localeCompare(
          `${b?.employeeNumber || ''} ${employeeName(b)}`,
        ),
      );
  }, [custodyContext]);

  const siteOptions = useMemo(() => {
    const sites = Array.isArray(custodyContext?.sites)
      ? custodyContext.sites
      : [];

    return sites
      .filter((site: any) => site?.isActive !== false)
      .sort((a: any, b: any) =>
        `${a?.code || ''} ${a?.name || ''}`.localeCompare(
          `${b?.code || ''} ${b?.name || ''}`,
        ),
      );
  }, [custodyContext]);

  const departmentOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();

    for (const employee of employeeOptions) {
      const department =
        employee?.department && typeof employee.department === 'object'
          ? employee.department
          : null;

      const id = String(
        department?.id ||
          employee?.departmentId ||
          '',
      ).trim();

      const name = String(
        department?.name ||
          employee?.departmentName ||
          (typeof employee?.department === 'string'
            ? employee.department
            : '') ||
          '',
      ).trim();

      if (id && name) {
        map.set(id, { id, name });
      }
    }

    if (record?.departmentId && record?.department) {
      map.set(record.departmentId, {
        id: record.departmentId,
        name: record.department,
      });
    }

    return [...map.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [
    employeeOptions,
    record?.department,
    record?.departmentId,
  ]);

  function updateIssueAssignment(
    stockItemId: string,
    patch: Partial<IssueAssignmentDraft>,
  ) {
    setIssueAssignments((current) => ({
      ...current,
      [stockItemId]: {
        type: current[stockItemId]?.type || '',
        employeeId: current[stockItemId]?.employeeId || '',
        referenceId: current[stockItemId]?.referenceId || '',
        ...patch,
      },
    }));
  }

  function updateEmployeeSearch(
    stockItemId: string,
    value: string,
  ) {
    setEmployeeSearches((current) => ({
      ...current,
      [stockItemId]: value,
    }));
  }

  function filteredEmployeeOptions(
    stockItemId: string,
  ) {
    const term = String(
      employeeSearches[stockItemId] || '',
    )
      .trim()
      .toLowerCase();

    if (!term) {
      return employeeOptions;
    }

    return employeeOptions.filter((employee: any) => {
      const searchable = [
        employee?.employeeNumber,
        employeeName(employee),
        employee?.email,
        employee?.jobTitle?.name,
        employee?.jobTitleName,
        employee?.department?.name,
        employee?.departmentName,
        employee?.site?.name,
        employee?.siteName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(term);
    });
  }

  function effectiveAssignmentType(
    line: StoresOperationLine,
  ): StoresIssueAssignmentType | '' {
    const policy = normaliseAssignmentPolicy(line.assignmentPolicy);
    const fixedType = fixedAssignmentType(policy);

    if (fixedType) {
      return fixedType;
    }

    if (policy === 'FLEXIBLE' && line.stockItemId) {
      return issueAssignments[line.stockItemId]?.type || '';
    }

    return '';
  }

  function defaultReferenceId(
    line: StoresOperationLine,
    assignmentType: StoresIssueAssignmentType | '',
  ) {
    if (assignmentType === 'DEPARTMENT') {
      return record?.departmentId || '';
    }

    if (assignmentType === 'PROJECT') {
      return record?.projectCode || '';
    }

    if (assignmentType === 'SITE') {
      const requestedSite = String(record?.site || '').trim().toUpperCase();

      const matched = siteOptions.find(
        (site: any) =>
          String(site?.name || '').trim().toUpperCase() === requestedSite ||
          String(site?.code || '').trim().toUpperCase() === requestedSite,
      );

      return matched?.id || '';
    }

    return '';
  }

  function buildLineAssignment(
    line: StoresOperationLine,
  ): StoresIssueAssignment | null {
    const policy = normaliseAssignmentPolicy(line.assignmentPolicy);

    if (policy === 'NONE') {
      return null;
    }

    if (policy === 'DEPLOYMENT') {
      throw new Error(
        `${line.itemName} uses Deployment control and cannot be issued through the normal Stores issue workflow.`,
      );
    }

    if (!line.stockItemId) {
      throw new Error(`${line.itemName} is not linked to a StockItem.`);
    }

    const draft = issueAssignments[line.stockItemId] || {
      type: '',
      employeeId: '',
      referenceId: '',
    };

    const assignmentType = effectiveAssignmentType(line);

    if (!assignmentType) {
      throw new Error(
        `${line.itemName}: choose an assignment destination type.`,
      );
    }

    if (assignmentType === 'EMPLOYEE') {
      if (!draft.employeeId) {
        throw new Error(
          `${line.itemName}: select the employee who will hold custody.`,
        );
      }

      return {
        type: 'EMPLOYEE',
        employeeId: draft.employeeId,
      };
    }

    const referenceId =
      draft.referenceId ||
      defaultReferenceId(line, assignmentType);

    if (!referenceId) {
      throw new Error(
        `${line.itemName}: select the ${assignmentType.toLowerCase()} destination.`,
      );
    }

    if (assignmentType === 'SITE') {
      return {
        type: 'SITE',
        referenceId,
      };
    }

    if (assignmentType === 'DEPARTMENT') {
      return {
        type: 'DEPARTMENT',
        referenceId,
      };
    }

    return {
      type: 'PROJECT',
      referenceId,
    };
  }

  const selectedIssueValue = useMemo(
    () =>
      selectedIssueLines.reduce(
        (sum, { line, quantity }) =>
          sum + asNumber(line.standardCost) * quantity,
        0,
      ),
    [selectedIssueLines],
  );

  const stockDecisionSummary = useMemo(() => {
    const lines = operations?.lines || [];

    if (!lines.length) {
      return {
        action: 'PENDING_CHECK',
        requestedSiteAvailable: 0,
        otherStoresAvailable: 0,
        companyAvailable: 0,
        procurementShortfall: 0,
        transferRequired: 0,
      };
    }

    const decisions = lines.map((line) =>
      getLineStockDecision(line, record?.site),
    );

    const actions = new Set(decisions.map((item) => item.action));

    let action = 'READY_TO_ISSUE';

    if (actions.size === 1 && actions.has('COMPLETED')) {
      action = 'COMPLETED';
    } else if (
      actions.has('PROCUREMENT_REQUIRED') ||
      actions.has('ISSUE_AND_PROCURE') ||
      actions.has('TRANSFER_AND_PROCURE')
    ) {
      action = 'PROCUREMENT_REQUIRED';
    } else if (
      actions.has('INTER_STORE_TRANSFER') ||
      actions.has('ISSUE_AND_TRANSFER')
    ) {
      action = 'INTER_STORE_TRANSFER';
    } else if (actions.has('READY_TO_ISSUE')) {
      action = 'READY_TO_ISSUE';
    }

    return {
      action,
      requestedSiteAvailable: decisions.reduce(
        (sum, item) => sum + item.requestedSiteAvailable,
        0,
      ),
      otherStoresAvailable: decisions.reduce(
        (sum, item) => sum + item.otherStoresAvailable,
        0,
      ),
      companyAvailable: decisions.reduce(
        (sum, item) => sum + item.companyAvailable,
        0,
      ),
      procurementShortfall: decisions.reduce(
        (sum, item) => sum + item.procurementShortfall,
        0,
      ),
      transferRequired: decisions.reduce(
        (sum, item) => sum + item.transferRequired,
        0,
      ),
    };
  }, [operations, record?.site]);


  async function handleUploadDocument() {
    if (!record) return;

    setError('');
    setMessage('');

    try {
      if (!documentFile) {
        throw new Error('Choose a document to upload.');
      }

      setUploadingDocument(true);

      await uploadDocument({
        file: documentFile,
        module: 'STORES',
        entityType: 'STORES_REQUISITION',
        entityId: record.id,
        category: 'STORES_REQUISITION_SUPPORTING',
        title:
          documentTitle.trim() ||
          documentFile.name,
        uploadedBy: issuedBy.trim() || record.requestedBy || undefined,
        uploadedByEmail:
          issuedByEmail.trim() ||
          record.requestedByEmail ||
          undefined,
        isConfidential: false,
      });

      setDocumentFile(null);
      setDocumentTitle('');
      setMessage('Document uploaded to the private Southin Supabase document bucket.');

      if (operations) {
        await loadDocuments(record.id, operations);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to upload document.');
    } finally {
      setUploadingDocument(false);
    }
  }

  async function handleOpenDocument(document: DocumentAttachmentRecord) {
    setError('');

    try {
      const result = await getDocumentSignedUrl(document.id);
      window.open(result.url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setError(err?.message || 'Unable to open document.');
    }
  }

  async function handleCreateShortfallPr() {
    if (!record || !operations) return;

    setError('');
    setMessage('');
    setShortfallPrMessage('');
    setCreatingShortfallPr(true);

    try {
      if (!isApproved) {
        throw new Error(
          'The Stores requisition must be final APPROVED before a shortfall PR can be created.',
        );
      }

      const stockItemIds = operations.lines
        .filter((line) => line.shortfallQuantity > 0 && line.stockItemId)
        .map((line) => line.stockItemId as string);

      if (!stockItemIds.length) {
        throw new Error('There is no current shortfall to send to Procurement.');
      }

      const result = await createStoresShortfallProcurementRequest(record.id, {
        requestedBy: issuedBy.trim() || 'Stores Officer',
        requestedByEmail: issuedByEmail.trim() || null,
        requestedByRole: 'STORES_OFFICER',
        stockItemIds,
      });

      setRelatedProcurement(result.procurementRequest || null);

      setShortfallPrMessage(
        `${result.message} Reference: ${result.procurementRequest?.requisitionNo || '-'}`,
      );

      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Unable to create Procurement Request.');
    } finally {
      setCreatingShortfallPr(false);
    }
  }

  async function handleIssue() {
    if (!record || !operations) return;

    setIssuing(true);
    setMessage('');
    setError('');

    try {
      if (!isApproved) {
        throw new Error(
          'The Stores requisition record must be final APPROVED before stock can be issued.',
        );
      }

      if (!selectedLocationId) {
        throw new Error('Choose the issuing stock location.');
      }

      if (!issuedBy.trim()) {
        throw new Error('Issued By is required.');
      }

      if (!selectedIssueLines.length) {
        throw new Error('Enter at least one issue quantity.');
      }

      const preparedLines = selectedIssueLines.map(({ line, quantity }) => {
        if (!line.stockItemId) {
          throw new Error(`${line.itemName} is not linked to a StockItem.`);
        }

        if (line.assetRegistrationRequired) {
          throw new Error(
            `${line.itemName} requires asset registration before issue.`,
          );
        }

        const assignmentPolicy =
          normaliseAssignmentPolicy(line.assignmentPolicy);

        if (assignmentPolicy === 'DEPLOYMENT') {
          throw new Error(
            `${line.itemName} uses Deployment control and must be processed through the deployment workflow.`,
          );
        }

        if (quantity > asNumber(line.remainingQuantity)) {
          throw new Error(
            `${line.itemName}: issue quantity exceeds the remaining approved quantity.`,
          );
        }

        const atLocation = locationAvailability(
          line,
          selectedLocationId,
        );

        if (quantity > atLocation) {
          throw new Error(
            `${line.itemName}: only ${atLocation} ${line.unitOfMeasure} are available at the selected store.`,
          );
        }

        return {
          stockItemId: line.stockItemId,
          quantity,
          notes: null,
          assignment: buildLineAssignment(line),
        };
      });

      const result = await issueStoresRequisition(record.id, {
        fromLocationId: selectedLocationId,
        issuedBy: issuedBy.trim(),
        issuedByEmail: issuedByEmail.trim() || null,
        notes: issueNotes.trim() || null,
        lines: preparedLines,
      });

      const custodyCount =
        Array.isArray(result.custodyAssignments)
          ? result.custodyAssignments.length
          : 0;

      setMessage(
        `Stock posted successfully against ${result.requisitionNo}. ` +
          `Availability is now ${result.availabilityStatus}.` +
          (custodyCount
            ? ` ${custodyCount} structured custody assignment${
                custodyCount === 1 ? '' : 's'
              } created.`
            : ''),
      );

      if (result.custodyWarning) {
        setError(
          `Stock was posted successfully, but custody returned a warning: ${result.custodyWarning}`,
        );
      }

      setIssueQuantities({});
      setIssueAssignments({});
      setEmployeeSearches({});
      setIssueNotes('');

      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Unable to issue stores stock.');
    } finally {
      setIssuing(false);
    }
  }

  return (
    <AppShell>
      <RequireStaffRole
        allowedRoles={[
          'ADMIN',
          'DIRECTOR',
          'STORES_OFFICER',
          'PROCUREMENT_OFFICER',
          'ASSET_MANAGER',
          'ASSET_OFFICER',
          'LINE_MANAGER',
          'SUPERVISOR',
        ]}
      >
        <section className="finance-page">
          <div className="finance-card finance-hero-card">
            <div>
              <p className="eyebrow">Stores Management</p>
              <h1>{record?.requisitionNo || 'Stores Requisition'}</h1>
              <p className="muted">
                Approval status, live stock availability and controlled Stores
                issuing from the approved requisition.
              </p>
            </div>

            <div className="action-row">
              <Link className="btn-secondary" href="/stores/requisitions">
                Back to Requisitions
              </Link>

              <Link className="btn-secondary" href="/approvals/inbox">
                Approval Inbox
              </Link>

              <button
                className="btn-secondary"
                type="button"
                onClick={loadData}
                disabled={loading}
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          <div className="finance-notice warning">
            <strong>
              PROVISIONAL OPENING STOCK — PHYSICAL STOCKTAKE PENDING.
            </strong>{' '}
            Issues posted here are real stock movements and are retained in the
            ledger. The new physical count will reconcile the resulting
            balances through Stock Count adjustments.
          </div>

          {message ? <div className="alert success">{message}</div> : null}
          {error ? <div className="alert error">{error}</div> : null}

          {!record && !loading ? (
            <div className="finance-card">
              Stores requisition could not be loaded.
            </div>
          ) : null}

          {record ? (
            <>
              <div className="finance-summary-grid">
                <div className="finance-summary-card">
                  <span>Requisition Status</span>
                  <strong>{record.status}</strong>
                </div>

                <div className="finance-summary-card">
                  <span>Workflow Status</span>
                  <strong>{getWorkflowStatus(record, approval)}</strong>
                </div>

                <div className="finance-summary-card">
                  <span>Request Type</span>
                  <strong>
                    {controlLabel(operations?.inventoryControlType)}
                  </strong>
                </div>

                <div className="finance-summary-card">
                  <span>Availability</span>
                  <strong>
                    {operations?.availabilityStatus || 'PENDING_CHECK'}
                  </strong>
                </div>

                <div className="finance-summary-card">
                  <span>Total Value</span>
                  <strong>{money(totalValue || record.totalValue)}</strong>
                </div>

                <div className="finance-summary-card">
                  <span>Posted Issues</span>
                  <strong>{operations?.movements?.length || 0}</strong>
                </div>
              </div>

              {!workflowApproved && !isRejected ? (
                <div className="alert warning">
                  This requisition is still in approval. Approval actions are
                  performed from the identity-controlled Approval Inbox.
                </div>
              ) : null}

              {workflowApproved && !isApproved ? (
                <div className="alert warning">
                  The approval workflow reports APPROVED, but the Stores
                  requisition record has not yet synchronised to APPROVED.
                  Issuing is intentionally blocked until the source record is
                  final approved.
                </div>
              ) : null}

              {isRejected ? (
                <div className="alert error">
                  This requisition has been rejected. Stock cannot be issued.
                </div>
              ) : null}

              <div className="stores-detail-stack">
                <div className="finance-card">
                  <div className="section-title-row">
                    <div>
                      <p className="eyebrow">Request</p>
                      <h2>Requisition Details</h2>
                    </div>

                    <span className={statusClass(record.status)}>
                      {record.status}
                    </span>
                  </div>

                  <div className="mini-detail-grid">
                    <div>
                      <span>Requested By</span>
                      <strong>{record.requestedBy || '-'}</strong>
                    </div>

                    <div>
                      <span>Email</span>
                      <strong>{record.requestedByEmail || '-'}</strong>
                    </div>

                    <div>
                      <span>Department</span>
                      <strong>{record.department || '-'}</strong>
                    </div>

                    <div>
                      <span>Site</span>
                      <strong>{record.site || '-'}</strong>
                    </div>

                    <div>
                      <span>Branch</span>
                      <strong>{record.branch || '-'}</strong>
                    </div>

                    <div>
                      <span>Submitted</span>
                      <strong>
                        {formatDate(record.submittedAt || record.createdAt)}
                      </strong>
                    </div>

                    <div>
                      <span>Current Approval Step</span>
                      <strong>{getCurrentStepLabel(record, approval)}</strong>
                    </div>

                    <div>
                      <span>Current Role</span>
                      <strong>{getCurrentRole(record, approval)}</strong>
                    </div>

                    <div>
                      <span>Current Approver</span>
                      <strong>{getCurrentApprover(record, approval)}</strong>
                    </div>
                  </div>

                  <div className="stores-reason-box">
                    <span>Reason / Business Need</span>
                    <strong>
                      {record.reason ||
                        record.description ||
                        'No reason supplied.'}
                    </strong>
                  </div>
                </div>

                <div className="finance-card">
                  <div className="section-title-row">
                    <div>
                      <p className="eyebrow">Approved Requirement</p>
                      <h2>Line Items</h2>
                      <p className="muted">
                        The approved quantities below remain the source
                        requirement. Stores issues, transfers and Procurement
                        actions are tracked separately against them.
                      </p>
                    </div>

                    <span className="status-pill warning">
                      {controlLabel(operations?.inventoryControlType)}
                    </span>
                  </div>

                  <div className="stores-line-items-grid">
                    {(record.lines || []).map((line) => (
                      <div className="stores-line-item-card" key={line.id}>
                        <div>
                          <span className="stores-line-item-code">
                            {line.itemCode || 'NO CODE'}
                          </span>
                          <strong className="stores-line-item-name">
                            {line.itemName}
                          </strong>
                        </div>

                        <div className="stores-line-item-metrics">
                          <div>
                            <span>Requested</span>
                            <strong>
                              {asNumber(line.quantity)} {line.unitOfMeasure}
                            </strong>
                          </div>

                          <div>
                            <span>Unit Cost</span>
                            <strong>{money(line.unitCost)}</strong>
                          </div>

                          <div>
                            <span>Line Value</span>
                            <strong>{money(line.totalCost)}</strong>
                          </div>
                        </div>

                        {line.notes ? (
                          <p className="muted">{line.notes}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="finance-card">
                  <div className="section-title-row">
                    <div>
                      <p className="eyebrow">Stores Decision</p>
                      <h2>Availability & Issue Workbench</h2>
                      <p className="muted">
                        Direct issue is restricted to stock held at the
                        requested Site. Stock at another Southin Site must
                        follow the inter-store transfer workflow instead of
                        being issued directly.
                      </p>
                    </div>

                    <span
                      className={statusClass(
                        stockDecisionSummary.action === 'READY_TO_ISSUE'
                          ? 'IN_STOCK'
                          : stockDecisionSummary.action === 'COMPLETED'
                            ? 'ISSUED'
                            : stockDecisionSummary.action ===
                                'PROCUREMENT_REQUIRED'
                              ? 'NOT_IN_STOCK'
                              : 'PARTIALLY_AVAILABLE',
                      )}
                    >
                      {decisionLabel(stockDecisionSummary.action)}
                    </span>
                  </div>

                  <div className="stores-decision-summary">
                    <div>
                      <span>Requested Site</span>
                      <strong>{record.site || '-'}</strong>
                    </div>

                    <div>
                      <span>At Requested Site</span>
                      <strong>{stockDecisionSummary.requestedSiteAvailable}</strong>
                    </div>

                    <div>
                      <span>Other Southin Stores</span>
                      <strong>{stockDecisionSummary.otherStoresAvailable}</strong>
                    </div>

                    <div>
                      <span>Company Available</span>
                      <strong>{stockDecisionSummary.companyAvailable}</strong>
                    </div>

                    <div>
                      <span>Transfer Required</span>
                      <strong>{stockDecisionSummary.transferRequired}</strong>
                    </div>

                    <div>
                      <span>PR Shortfall</span>
                      <strong>{stockDecisionSummary.procurementShortfall}</strong>
                    </div>
                  </div>

                  {!isApproved ? (
                    <div className="finance-notice warning">
                      <strong>Operational controls locked.</strong>{' '}
                      The request must complete the configured authorization
                      workflow before Stores can issue stock, initiate a
                      transfer or raise Procurement for a shortfall.
                    </div>
                  ) : null}

                  {isApproved &&
                  stockDecisionSummary.action === 'INTER_STORE_TRANSFER' ? (
                    <div className="finance-notice warning">
                      <strong>Stock exists at another Southin Store.</strong>{' '}
                      Do not purchase this quantity and do not issue it directly
                      across Sites. The next Stores phase will create the
                      controlled Inter-Store Transfer transaction.
                    </div>
                  ) : null}

                  {isApproved &&
                  stockDecisionSummary.action === 'PROCUREMENT_REQUIRED' ? (
                    <div className="finance-notice warning">
                      <strong>Company stock is insufficient.</strong>{' '}
                      Procurement should receive only the current company-wide
                      shortfall. The approved Stores requirement remains
                      unchanged.
                    </div>
                  ) : null}

                  <div className="form-grid stores-issue-header">
                    <label>
                      Issuing Store
                      <select
                        value={selectedLocationId}
                        onChange={(event) => {
                          setSelectedLocationId(event.target.value);
                          setIssueQuantities({});
                        }}
                        disabled={
                          !isApproved ||
                          issuing ||
                          locationOptions.length === 0
                        }
                      >
                        <option value="">
                          {locationOptions.length
                            ? 'Select stock location'
                            : 'No stock available at the requested Site'}
                        </option>

                        {locationOptions.map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.code
                              ? `${location.code} - ${location.name}`
                              : location.name}
                            {location.site ? ` (${location.site})` : ''}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Issued By
                      <input
                        value={issuedBy}
                        onChange={(event) => setIssuedBy(event.target.value)}
                        placeholder="Stores Officer"
                        disabled={!isApproved || issuing}
                      />
                    </label>

                    <label>
                      Issuer Email
                      <input
                        type="email"
                        value={issuedByEmail}
                        onChange={(event) =>
                          setIssuedByEmail(event.target.value)
                        }
                        placeholder="stores.officer@southincon.com"
                        disabled={!isApproved || issuing}
                      />
                    </label>
                  </div>

                  <div className="stores-issue-line-list">
                    {!(operations?.lines || []).length ? (
                      <div className="stores-empty-state">
                        {loading
                          ? 'Loading availability...'
                          : 'No operational stock lines found.'}
                      </div>
                    ) : (
                      (operations?.lines || []).map((line) => {
                        const decision = getLineStockDecision(
                          line,
                          record.site,
                        );

                        const stockItemId = line.stockItemId || '';

                        const atSelectedStore = selectedLocationId
                          ? locationAvailability(line, selectedLocationId)
                          : 0;

                        const issueQuantity = stockItemId
                          ? issueQuantities[stockItemId] || ''
                          : '';

                        const selectedQty = asNumber(issueQuantity);

                        const assignmentPolicy =
                          normaliseAssignmentPolicy(line.assignmentPolicy);

                        const assignmentType =
                          effectiveAssignmentType(line);

                        const assignmentDraft =
                          stockItemId
                            ? issueAssignments[stockItemId] || {
                                type: '',
                                employeeId: '',
                                referenceId: '',
                              }
                            : {
                                type: '',
                                employeeId: '',
                                referenceId: '',
                              };

                        const assignmentReferenceId =
                          assignmentDraft.referenceId ||
                          defaultReferenceId(
                            line,
                            assignmentType,
                          );

                        const blockedForAsset =
                          line.assetRegistrationRequired;

                        const blockedForDeployment =
                          assignmentPolicy === 'DEPLOYMENT';

                        return (
                          <div
                            className="stores-issue-line-card"
                            key={line.lineId}
                          >
                            <div className="stores-issue-line-heading">
                              <div>
                                <span className="stores-line-item-code">
                                  {line.itemCode || 'NO CODE'}
                                </span>

                                <h3>{line.itemName}</h3>

                                <span className="muted">
                                  {line.itemType || '-'} ·{' '}
                                  {controlLabel(line.inventoryControlType)}
                                </span>
                              </div>

                              <span
                                className={statusClass(
                                  decision.action === 'READY_TO_ISSUE'
                                    ? 'IN_STOCK'
                                    : decision.action === 'COMPLETED'
                                      ? 'ISSUED'
                                      : decision.action ===
                                          'PROCUREMENT_REQUIRED'
                                        ? 'NOT_IN_STOCK'
                                        : 'PARTIALLY_AVAILABLE',
                                )}
                              >
                                {decisionLabel(decision.action)}
                              </span>
                            </div>

                            <div className="stores-line-metric-grid">
                              <div>
                                <span>Requested</span>
                                <strong>
                                  {line.requestedQuantity}{' '}
                                  {line.unitOfMeasure}
                                </strong>
                              </div>

                              <div>
                                <span>Already Issued</span>
                                <strong>
                                  {line.issuedQuantity}{' '}
                                  {line.unitOfMeasure}
                                </strong>
                              </div>

                              <div>
                                <span>Remaining</span>
                                <strong>
                                  {line.remainingQuantity}{' '}
                                  {line.unitOfMeasure}
                                </strong>
                              </div>

                              <div>
                                <span>Requested Site</span>
                                <strong>
                                  {decision.requestedSiteAvailable}
                                </strong>
                              </div>

                              <div>
                                <span>Other Stores</span>
                                <strong>{decision.otherStoresAvailable}</strong>
                              </div>

                              <div>
                                <span>Company Total</span>
                                <strong>{decision.companyAvailable}</strong>
                              </div>

                              <div>
                                <span>Transfer</span>
                                <strong>{decision.transferRequired}</strong>
                              </div>

                              <div>
                                <span>PR Shortfall</span>
                                <strong>{decision.procurementShortfall}</strong>
                              </div>
                            </div>

                            <div className={decisionNoticeClass(decision.action)}>
                              <strong>{decisionLabel(decision.action)}</strong>

                              {decision.action === 'READY_TO_ISSUE'
                                ? ` — stock is available at ${record.site || 'the requested Site'}.`
                                : null}

                              {decision.action === 'INTER_STORE_TRANSFER'
                                ? ' — stock exists elsewhere in Southin and must be transferred before issue.'
                                : null}

                              {decision.action === 'PROCUREMENT_REQUIRED'
                                ? ' — no sufficient company stock is available; use Procurement after final approval.'
                                : null}

                              {decision.action === 'ISSUE_AND_TRANSFER'
                                ? ' — issue local stock first, then transfer the balance from another Store.'
                                : null}

                              {decision.action === 'ISSUE_AND_PROCURE'
                                ? ' — issue the available local stock and procure only the remaining company shortfall.'
                                : null}

                              {decision.action === 'TRANSFER_AND_PROCURE'
                                ? ' — transfer available company stock and procure only the remaining shortfall.'
                                : null}
                            </div>

                            <div className="stores-line-control-grid">
                              <div>
                                <span>At Selected Store</span>
                                <strong>
                                  {selectedLocationId
                                    ? `${atSelectedStore} ${line.unitOfMeasure}`
                                    : 'Select Site Store'}
                                </strong>
                              </div>

                              <label>
                                Issue Now
                                <div className="stores-inline-control">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={issueQuantity}
                                    onChange={(event) =>
                                      stockItemId
                                        ? updateIssueQuantity(
                                            stockItemId,
                                            event.target.value,
                                          )
                                        : undefined
                                    }
                                    disabled={
                                      !isApproved ||
                                      !selectedLocationId ||
                                      !stockItemId ||
                                      line.remainingQuantity <= 0 ||
                                      atSelectedStore <= 0 ||
                                      blockedForAsset ||
                                      blockedForDeployment ||
                                      issuing
                                    }
                                  />

                                  <button
                                    className="btn-secondary"
                                    type="button"
                                    onClick={() => fillAvailable(line)}
                                    disabled={
                                      !isApproved ||
                                      !selectedLocationId ||
                                      !stockItemId ||
                                      atSelectedStore <= 0 ||
                                      line.remainingQuantity <= 0 ||
                                      blockedForAsset ||
                                      blockedForDeployment ||
                                      issuing
                                    }
                                  >
                                    Max
                                  </button>
                                </div>
                              </label>

                              <div>
                                <span>Controls</span>

                                <div className="stores-control-tags">
                                  {line.assetRegistrationRequired ? (
                                    <span className="status-pill danger">
                                      Asset registration
                                    </span>
                                  ) : null}

                                  {line.custodyTrackingRequired ? (
                                    <span className="status-pill warning">
                                      Custody
                                    </span>
                                  ) : null}

                                  {assignmentPolicy !== 'NONE' ? (
                                    <span className="status-pill warning">
                                      {assignmentPolicy}
                                    </span>
                                  ) : null}

                                  {blockedForDeployment ? (
                                    <span className="status-pill danger">
                                      Deployment workflow
                                    </span>
                                  ) : null}

                                  {line.isSerialized ? (
                                    <span className="status-pill warning">
                                      Serialized
                                    </span>
                                  ) : null}

                                  {!line.assetRegistrationRequired &&
                                  !line.custodyTrackingRequired &&
                                  !line.isSerialized ? (
                                    <span className="muted">
                                      Standard Stores issue
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </div>

                            {selectedQty > 0 &&
                            assignmentPolicy !== 'NONE' &&
                            assignmentPolicy !== 'DEPLOYMENT' ? (
                              <div
                                className="finance-notice warning"
                                style={{ marginTop: '0.85rem' }}
                              >
                                <div className="section-title-row">
                                  <div>
                                    <strong>
                                      Structured Custody Assignment
                                    </strong>
                                    <p className="muted">
                                      This issue will create an
                                      AssetCustodyAssignment linked to the
                                      posted stock movement.
                                    </p>
                                  </div>

                                  <span className="status-pill warning">
                                    {assignmentPolicy}
                                  </span>
                                </div>

                                <div className="form-grid stores-custody-grid">
                                  {assignmentPolicy === 'FLEXIBLE' ? (
                                    <label>
                                      Assignment Destination
                                      <select
                                        value={assignmentType}
                                        onChange={(event) =>
                                          stockItemId
                                            ? updateIssueAssignment(
                                                stockItemId,
                                                {
                                                  type: event.target
                                                    .value as StoresIssueAssignmentType,
                                                  employeeId: '',
                                                  referenceId: '',
                                                },
                                              )
                                            : undefined
                                        }
                                        disabled={issuing}
                                      >
                                        <option value="">
                                          Select destination type
                                        </option>
                                        <option value="EMPLOYEE">
                                          Employee
                                        </option>
                                        <option value="SITE">
                                          Site
                                        </option>
                                        <option value="DEPARTMENT">
                                          Department
                                        </option>
                                        <option value="PROJECT">
                                          Project
                                        </option>
                                      </select>
                                    </label>
                                  ) : (
                                    <label>
                                      Assignment Destination
                                      <input
                                        value={
                                          assignmentType || assignmentPolicy
                                        }
                                        readOnly
                                        disabled
                                      />
                                    </label>
                                  )}

                                  {assignmentType === 'EMPLOYEE' ? (
                                    <div
                                      style={{
                                        display: 'grid',
                                        gap: '0.55rem',
                                      }}
                                    >
                                      <label>
                                        Search Employee
                                        <input
                                          type="search"
                                          value={
                                            stockItemId
                                              ? employeeSearches[
                                                  stockItemId
                                                ] || ''
                                              : ''
                                          }
                                          onChange={(event) =>
                                            stockItemId
                                              ? updateEmployeeSearch(
                                                  stockItemId,
                                                  event.target.value,
                                                )
                                              : undefined
                                          }
                                          placeholder="Search by employee number, name, site or department"
                                          disabled={
                                            issuing ||
                                            loadingCustodyContext
                                          }
                                          autoComplete="off"
                                        />
                                      </label>

                                      <label>
                                        Employee / Custodian
                                        <select
                                          value={assignmentDraft.employeeId}
                                          onChange={(event) =>
                                            stockItemId
                                              ? updateIssueAssignment(
                                                  stockItemId,
                                                  {
                                                    employeeId:
                                                      event.target.value,
                                                    referenceId: '',
                                                  },
                                                )
                                              : undefined
                                          }
                                          disabled={
                                            issuing ||
                                            loadingCustodyContext
                                          }
                                        >
                                          <option value="">
                                            {loadingCustodyContext
                                              ? 'Loading employees...'
                                              : 'Select employee'}
                                          </option>

                                          {(stockItemId
                                            ? filteredEmployeeOptions(
                                                stockItemId,
                                              )
                                            : employeeOptions
                                          ).map((employee: any) => (
                                            <option
                                              key={employee.id}
                                              value={employee.id}
                                            >
                                              {employee.employeeNumber
                                                ? `${employee.employeeNumber} - `
                                                : ''}
                                              {employeeName(employee)}
                                              {employee?.site?.name
                                                ? ` (${employee.site.name})`
                                                : employee?.siteName
                                                  ? ` (${employee.siteName})`
                                                  : ''}
                                            </option>
                                          ))}
                                        </select>

                                        {stockItemId &&
                                        employeeSearches[stockItemId] ? (
                                          <span className="muted">
                                            {
                                              filteredEmployeeOptions(
                                                stockItemId,
                                              ).length
                                            }{' '}
                                            employee
                                            {filteredEmployeeOptions(
                                              stockItemId,
                                            ).length === 1
                                              ? ''
                                              : 's'}{' '}
                                            found
                                          </span>
                                        ) : null}
                                      </label>
                                    </div>
                                  ) : null}

                                  {assignmentType === 'SITE' ? (
                                    <label>
                                      Assigned Site
                                      <select
                                        value={assignmentReferenceId}
                                        onChange={(event) =>
                                          stockItemId
                                            ? updateIssueAssignment(
                                                stockItemId,
                                                {
                                                  referenceId:
                                                    event.target.value,
                                                  employeeId: '',
                                                },
                                              )
                                            : undefined
                                        }
                                        disabled={
                                          issuing ||
                                          loadingCustodyContext
                                        }
                                      >
                                        <option value="">
                                          {loadingCustodyContext
                                            ? 'Loading sites...'
                                            : 'Select site'}
                                        </option>

                                        {siteOptions.map((site: any) => (
                                          <option
                                            key={site.id}
                                            value={site.id}
                                          >
                                            {site.code
                                              ? `${site.code} - `
                                              : ''}
                                            {site.name}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                  ) : null}

                                  {assignmentType === 'DEPARTMENT' ? (
                                    <label>
                                      Assigned Department
                                      <select
                                        value={assignmentReferenceId}
                                        onChange={(event) =>
                                          stockItemId
                                            ? updateIssueAssignment(
                                                stockItemId,
                                                {
                                                  referenceId:
                                                    event.target.value,
                                                  employeeId: '',
                                                },
                                              )
                                            : undefined
                                        }
                                        disabled={issuing}
                                      >
                                        <option value="">
                                          Select department
                                        </option>

                                        {departmentOptions.map(
                                          (department) => (
                                            <option
                                              key={department.id}
                                              value={department.id}
                                            >
                                              {department.name}
                                            </option>
                                          ),
                                        )}
                                      </select>
                                    </label>
                                  ) : null}

                                  {assignmentType === 'PROJECT' ? (
                                    <label>
                                      Project
                                      <select
                                        value={assignmentReferenceId}
                                        onChange={(event) =>
                                          stockItemId
                                            ? updateIssueAssignment(
                                                stockItemId,
                                                {
                                                  referenceId:
                                                    event.target.value,
                                                  employeeId: '',
                                                },
                                              )
                                            : undefined
                                        }
                                        disabled={issuing}
                                      >
                                        <option value="">
                                          {record.projectCode
                                            ? 'Select project'
                                            : 'No project linked to requisition'}
                                        </option>

                                        {record.projectCode ? (
                                          <option value={record.projectCode}>
                                            {record.projectCode}
                                          </option>
                                        ) : null}
                                      </select>
                                    </label>
                                  ) : null}
                                </div>

                                {assignmentType === 'EMPLOYEE' &&
                                !employeeOptions.length &&
                                !loadingCustodyContext ? (
                                  <div className="alert error">
                                    No employees are available from the
                                    People Ops context. Do not post this
                                    custody-controlled issue until the
                                    employee register is available.
                                  </div>
                                ) : null}

                                {assignmentType === 'SITE' &&
                                !siteOptions.length &&
                                !loadingCustodyContext ? (
                                  <div className="alert error">
                                    No Site master records are available.
                                    Do not post this Site-controlled issue
                                    until the Site register is available.
                                  </div>
                                ) : null}
                              </div>
                            ) : null}

                            {blockedForDeployment ? (
                              <div
                                className="finance-notice warning"
                                style={{ marginTop: '0.85rem' }}
                              >
                                <strong>Deployment-controlled stock.</strong>{' '}
                                This item must be processed through the
                                dedicated deployment workflow rather than
                                the normal Stores issue action.
                              </div>
                            ) : null}

                            {selectedQty > atSelectedStore ? (
                              <div className="alert error">
                                Issue quantity exceeds stock held at the
                                selected Store.
                              </div>
                            ) : null}
                          </div>
                        );
                      })
                    )}
                  </div>

                  <label className="stores-issue-notes">
                    Issue Notes
                    <textarea
                      value={issueNotes}
                      onChange={(event) => setIssueNotes(event.target.value)}
                      placeholder="Optional Stores issue notes."
                      disabled={!isApproved || issuing}
                    />
                  </label>

                  <div className="finance-summary-grid">
                    <div className="finance-summary-card">
                      <span>Issuing Location</span>
                      <strong>
                        {selectedLocation
                          ? selectedLocation.code || selectedLocation.name
                          : 'Not Selected'}
                      </strong>
                    </div>

                    <div className="finance-summary-card">
                      <span>Lines to Issue</span>
                      <strong>{selectedIssueLines.length}</strong>
                    </div>

                    <div className="finance-summary-card">
                      <span>Issue Value</span>
                      <strong>{money(selectedIssueValue)}</strong>
                    </div>
                  </div>

                  <div className="action-row stores-primary-actions">
                    <button
                      className="btn"
                      type="button"
                      onClick={handleIssue}
                      disabled={
                        !isApproved ||
                        issuing ||
                        !selectedLocationId ||
                        selectedIssueLines.length === 0
                      }
                    >
                      {issuing
                        ? 'Posting Issue...'
                        : 'Issue Selected Stock'}
                    </button>
                  </div>

                  {(operations?.lines || []).some(
                    (line) => line.shortfallQuantity > 0,
                  ) ? (
                    <div className="finance-notice warning">
                      <strong>Stores shortfall detected.</strong>{' '}
                      Procurement will receive only the current outstanding
                      company-wide quantity; the approved Stores request is not
                      changed.

                      <div className="action-row stores-shortfall-actions">
                        <button
                          className="btn"
                          type="button"
                          onClick={handleCreateShortfallPr}
                          disabled={!isApproved || creatingShortfallPr}
                        >
                          {creatingShortfallPr
                            ? 'Creating PR...'
                            : 'Create PR for Shortfall'}
                        </button>
                      </div>

                      {!isApproved ? (
                        <p className="muted">
                          Procurement is locked until the Stores requisition
                          reaches final approval.
                        </p>
                      ) : null}

                      {shortfallPrMessage ? (
                        <div className="stores-related-pr">
                          <div>
                            <span>Related Procurement</span>
                            <strong>
                              {relatedProcurement?.requisitionNo || 'Created'}
                            </strong>
                            <p>{shortfallPrMessage}</p>
                          </div>

                          <Link
                            className="btn-secondary"
                            href="/finance/procurement-tracker"
                          >
                            Open Procurement Register
                          </Link>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="finance-card">
                <h2>Documents & Audit Pack</h2>

                <p className="muted">
                  Supporting files and system-generated issue dockets are stored
                  in the private Southin Supabase document bucket. The database
                  keeps the document metadata and transaction link.
                </p>

                <div className="form-grid" style={{ marginTop: '1rem' }}>
                  <label>
                    Supporting Document
                    <input
                      type="file"
                      onChange={(event) =>
                        setDocumentFile(event.target.files?.[0] || null)
                      }
                      disabled={uploadingDocument}
                    />
                  </label>

                  <label>
                    Document Title
                    <input
                      value={documentTitle}
                      onChange={(event) => setDocumentTitle(event.target.value)}
                      placeholder="Optional title"
                      disabled={uploadingDocument}
                    />
                  </label>
                </div>

                <div className="action-row" style={{ marginTop: '0.75rem' }}>
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={handleUploadDocument}
                    disabled={!documentFile || uploadingDocument}
                  >
                    {uploadingDocument
                      ? 'Uploading...'
                      : 'Upload to Document Store'}
                  </button>
                </div>

                <div className="employee-table-wrap" style={{ marginTop: '1rem' }}>
                  <table className="employee-table">
                    <thead>
                      <tr>
                        <th>Document</th>
                        <th>Category</th>
                        <th>Linked To</th>
                        <th>Uploaded By</th>
                        <th>Date</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {!documents.length ? (
                        <tr>
                          <td colSpan={6}>No stored documents found.</td>
                        </tr>
                      ) : (
                        documents.map((document) => (
                          <tr key={document.id}>
                            <td>
                              <strong>
                                {document.title || document.originalFileName}
                              </strong>
                              <br />
                              <span className="muted">
                                {document.originalFileName}
                              </span>
                            </td>
                            <td>{document.category}</td>
                            <td>
                              {document.entityType}
                              <br />
                              <span className="muted">{document.entityId}</span>
                            </td>
                            <td>
                              {document.uploadedBy || '-'}
                              <br />
                              <span className="muted">
                                {document.uploadedByEmail || ''}
                              </span>
                            </td>
                            <td>{formatDate(document.uploadedAt)}</td>
                            <td>
                              <button
                                className="btn-secondary"
                                type="button"
                                onClick={() => handleOpenDocument(document)}
                              >
                                Open
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="finance-card">
                <h2>Posted Issue History</h2>

                <div className="employee-table-wrap">
                  <table className="employee-table">
                    <thead>
                      <tr>
                        <th>Movement</th>
                        <th>Store</th>
                        <th>Issued By</th>
                        <th>Posted</th>
                        <th>Lines</th>
                      </tr>
                    </thead>

                    <tbody>
                      {!(operations?.movements || []).length ? (
                        <tr>
                          <td colSpan={5}>No stock has been issued yet.</td>
                        </tr>
                      ) : (
                        (operations?.movements || []).map((movement) => (
                          <tr key={movement.id}>
                            <td>
                              <strong>{movement.movementNo}</strong>
                              <br />
                              <span className={statusClass(movement.status)}>
                                {movement.status}
                              </span>
                            </td>

                            <td>
                              {movement.fromLocation?.locationCode ||
                                movement.fromLocation?.locationName ||
                                '-'}
                            </td>

                            <td>{movement.postedBy || '-'}</td>
                            <td>{formatDate(movement.postedAt)}</td>

                            <td>
                              {movement.lines.map((line) => (
                                <div key={line.id}>
                                  {line.itemCode || line.itemName || 'Item'}:{' '}
                                  <strong>{line.quantity}</strong>
                                </div>
                              ))}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="finance-card">
                <h2>Approval Trail</h2>

                {approval ? (
                  <>
                    <div className="mini-detail-grid">
                      <div>
                        <span>Approval Request</span>
                        <strong>{approval.id}</strong>
                      </div>

                      <div>
                        <span>Current Step</span>
                        <strong>{getCurrentStepLabel(record, approval)}</strong>
                      </div>

                      <div>
                        <span>Current Role</span>
                        <strong>{getCurrentRole(record, approval)}</strong>
                      </div>

                      <div>
                        <span>Current Approver</span>
                        <strong>{getCurrentApprover(record, approval)}</strong>
                      </div>
                    </div>

                    {!getHistory(approval).length ? (
                      <p className="muted">
                        No approval actions recorded yet.
                      </p>
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
                            {getHistory(approval).map(
                              (item: any, index: number) => (
                                <tr key={`${item.actionedAt}-${index}`}>
                                  <td>{item.stepSequence}</td>
                                  <td>{item.action}</td>
                                  <td>
                                    <strong>{item.actionedBy}</strong>
                                    <br />
                                    <span className="muted">
                                      {item.actionedByEmail}
                                    </span>
                                  </td>
                                  <td>{item.comments || '-'}</td>
                                  <td>{formatDate(item.actionedAt)}</td>
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="alert warning">
                    This requisition does not have an approval request linked.
                  </div>
                )}
              </div>
            </>
          ) : null}
        </section>
      </RequireStaffRole>
    </AppShell>
  );
}
