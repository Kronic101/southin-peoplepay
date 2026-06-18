import Link from 'next/link';
import { AppShell } from '@/components/AppShell';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

type PageProps = {
  params: Promise<{ id: string }>;
};

type MovementLine = {
  id: string;
  quantity?: string | number | null;
  unitCost?: string | number | null;
  totalCost?: string | number | null;
  notes?: string | null;
  stockItem?: {
    itemCode?: string | null;
    itemName?: string | null;
    itemType?: string | null;
    category?: string | null;
    unitOfMeasure?: string | null;
  } | null;
  qrTag?: {
    tagCode?: string | null;
    qrPayload?: string | null;
    barcodeValue?: string | null;
    status?: string | null;
  } | null;
  ledgerEntries?: Array<{
    id: string;
    transactionType?: string | null;
    quantityIn?: string | number | null;
    quantityOut?: string | number | null;
    balanceAfter?: string | number | null;
    totalCost?: string | number | null;
  }>;
};

type Movement = {
  id: string;
  movementNo?: string | null;
  movementType?: string | null;
  status?: string | null;
  fromLocationId?: string | null;
  toLocationId?: string | null;
  requestedBy?: string | null;
  requestedByEmail?: string | null;
  department?: string | null;
  site?: string | null;
  branch?: string | null;
  projectCode?: string | null;
  reason?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  referenceNo?: string | null;
  financeExpenseId?: string | null;
  financeExpenseNo?: string | null;
  financeStatus?: string | null;
  ledgerStatus?: string | null;
  ledgerEntryCount?: number | null;
  submittedAt?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  postedBy?: string | null;
  postedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  fromLocation?: {
    locationCode?: string | null;
    locationName?: string | null;
    site?: string | null;
    branch?: string | null;
    department?: string | null;
  } | null;
  toLocation?: {
    locationCode?: string | null;
    locationName?: string | null;
    site?: string | null;
    branch?: string | null;
    department?: string | null;
  } | null;
  financeExpense?: {
    id?: string | null;
    expenseNo?: string | null;
    amount?: string | number | null;
    status?: string | null;
    evidenceStatus?: string | null;
  } | null;
  lines?: MovementLine[];
};

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
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusClass(value?: string | null) {
  const status = String(value || '').toUpperCase();

  if (
    status === 'POSTED' ||
    status === 'APPROVED' ||
    status === 'LINKED' ||
    status === 'NOT_REQUIRED' ||
    status === 'COMPLETE'
  ) {
    return 'badge success';
  }

  if (status === 'REJECTED' || status === 'MISSING' || status === 'FAILED') {
    return 'badge danger';
  }

  return 'badge warning';
}

function cleanStatus(value?: string | null) {
  return String(value || '-').replaceAll('_', ' ');
}

function getLineTotal(line: MovementLine) {
  const providedTotal = asNumber(line.totalCost);
  if (providedTotal > 0) return providedTotal;

  return asNumber(line.quantity) * asNumber(line.unitCost);
}

function getMovementTotal(movement: Movement) {
  return (movement.lines || []).reduce((sum, line) => sum + getLineTotal(line), 0);
}

async function getMovement(id: string): Promise<Movement | null> {
  try {
    const response = await fetch(`${API_URL}/assets/movements/${id}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data || null;
  } catch {
    return null;
  }
}

export default async function StockMovementReceiptPage({ params }: PageProps) {
  const { id } = await params;
  const movement = await getMovement(id);

  const movementTotal = movement ? getMovementTotal(movement) : 0;
  const financeRef =
    movement?.financeExpenseNo ||
    movement?.financeExpense?.expenseNo ||
    movement?.financeExpenseId ||
    'Not required';

  return (
    <AppShell>
      <section className="page-stack print-page">
        <div className="finance-live-card">
          <div className="finance-live-header">
            <div>
            <p className="eyebrow">Asset Management</p>
            <h1>Stock Movement Receipt</h1>
            <p className="muted">
              Printable movement voucher for stores, custody, audit, finance and filing.
            </p>
          </div>
        </div>
          <div className="action-row">
            <Link className="btn-secondary" href="/assets/movements">
              Back to Movements
            </Link>

            <button className="btn" type="button" onClick={undefined as any}>
              Use Ctrl + P to Print
            </button>
          </div>
        </div>

        {!movement ? (
          <div className="alert error">Movement receipt could not be loaded.</div>
        ) : (
          <div className="card receipt-card">
            <div className="receipt-header">
              <div>
                <p className="eyebrow">Southin Operations Hub</p>
                <h1>Stock Movement Voucher</h1>
                <p className="muted">Asset, Stores & Scaffold Management</p>
              </div>

              <div className="receipt-meta">
                <span>Movement No.</span>
                <strong>{movement.movementNo || '-'}</strong>
                <span>{cleanStatus(movement.movementType)}</span>
                <span className={statusClass(movement.status)}>{cleanStatus(movement.status)}</span>
              </div>
            </div>

            <div className="metric-grid">
              <div className="metric-card">
                <span>Ledger Status</span>
                <strong>{cleanStatus(movement.ledgerStatus)}</strong>
              </div>

              <div className="metric-card">
                <span>Finance Status</span>
                <strong>{cleanStatus(movement.financeStatus)}</strong>
              </div>

              <div className="metric-card">
                <span>Finance Ref</span>
                <strong>{financeRef}</strong>
              </div>

              <div className="metric-card">
                <span>Movement Value</span>
                <strong>{money(movementTotal)}</strong>
              </div>

              <div className="metric-card">
                <span>Ledger Entries</span>
                <strong>{movement.ledgerEntryCount ?? 0}</strong>
              </div>
            </div>

            <div className="card soft-card">
              <h2>Movement Control Details</h2>

              <div className="detail-grid">
                <div>
                  <span className="summary-label">Requested By</span>
                  <strong>{movement.requestedBy || '-'}</strong>
                </div>

                <div>
                  <span className="summary-label">Requester Email</span>
                  <strong>{movement.requestedByEmail || '-'}</strong>
                </div>

                <div>
                  <span className="summary-label">Approved By</span>
                  <strong>{movement.approvedBy || '-'}</strong>
                </div>

                <div>
                  <span className="summary-label">Posted By</span>
                  <strong>{movement.postedBy || '-'}</strong>
                </div>

                <div>
                  <span className="summary-label">Department</span>
                  <strong>{movement.department || '-'}</strong>
                </div>

                <div>
                  <span className="summary-label">Site</span>
                  <strong>{movement.site || '-'}</strong>
                </div>

                <div>
                  <span className="summary-label">Branch</span>
                  <strong>{movement.branch || '-'}</strong>
                </div>

                <div>
                  <span className="summary-label">Project Code</span>
                  <strong>{movement.projectCode || '-'}</strong>
                </div>

                <div>
                  <span className="summary-label">Reference Type</span>
                  <strong>{movement.referenceType || '-'}</strong>
                </div>

                <div>
                  <span className="summary-label">Reference No.</span>
                  <strong>{movement.referenceNo || movement.referenceId || '-'}</strong>
                </div>

                <div>
                  <span className="summary-label">Submitted</span>
                  <strong>{formatDate(movement.submittedAt)}</strong>
                </div>

                <div>
                  <span className="summary-label">Approved</span>
                  <strong>{formatDate(movement.approvedAt)}</strong>
                </div>

                <div>
                  <span className="summary-label">Posted</span>
                  <strong>{formatDate(movement.postedAt)}</strong>
                </div>
              </div>
            </div>

            <div className="card soft-card">
              <h2>Location Details</h2>

              <div className="detail-grid">
                <div>
                  <span className="summary-label">From Location</span>
                  <strong>{movement.fromLocation?.locationName || '-'}</strong>
                  <p className="muted">{movement.fromLocation?.locationCode || ''}</p>
                </div>

                <div>
                  <span className="summary-label">To Location</span>
                  <strong>{movement.toLocation?.locationName || '-'}</strong>
                  <p className="muted">{movement.toLocation?.locationCode || ''}</p>
                </div>
              </div>
            </div>

            <div className="notice">
              <strong>Reason:</strong> {movement.reason || '-'}
            </div>

            <div className="card soft-card">
              <h2>Movement Lines</h2>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Item Code</th>
                      <th>Item Name</th>
                      <th>Category</th>
                      <th>UOM</th>
                      <th>QR / RFID</th>
                      <th>Quantity</th>
                      <th>Unit Cost</th>
                      <th>Total Cost</th>
                      <th>Ledger Entries</th>
                    </tr>
                  </thead>

                  <tbody>
                    {(movement.lines || []).length === 0 ? (
                      <tr>
                        <td colSpan={9}>No movement lines found.</td>
                      </tr>
                    ) : (
                      movement.lines?.map((line) => {
                        const qrValue =
                          line.qrTag?.tagCode ||
                          line.qrTag?.qrPayload ||
                          line.qrTag?.barcodeValue ||
                          '-';

                        return (
                          <tr key={line.id}>
                            <td>{line.stockItem?.itemCode || '-'}</td>
                            <td>{line.stockItem?.itemName || '-'}</td>
                            <td>{line.stockItem?.category || '-'}</td>
                            <td>{line.stockItem?.unitOfMeasure || '-'}</td>
                            <td>{qrValue}</td>
                            <td>{asNumber(line.quantity)}</td>
                            <td>{money(line.unitCost)}</td>
                            <td>{money(getLineTotal(line))}</td>
                            <td>{line.ledgerEntries?.length || 0}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="signature-grid">
              <div>
                <span>Requested By</span>
                <div />
              </div>

              <div>
                <span>Approved By</span>
                <div />
              </div>

              <div>
                <span>Issued / Received By</span>
                <div />
              </div>

              <div>
                <span>Stores / Asset Officer</span>
                <div />
              </div>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}