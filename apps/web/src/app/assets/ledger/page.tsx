'use client';

import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { useEffect, useMemo, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

type LedgerEntry = {
  id: string;
  stockItemId?: string | null;
  locationId?: string | null;
  movementId?: string | null;
  movementLineId?: string | null;
  financeExpenseId?: string | null;
  procurementRequestId?: string | null;
  workshopJobId?: string | null;
  transactionType?: string | null;
  quantityIn?: string | number | null;
  quantityOut?: string | number | null;
  balanceAfter?: string | number | null;
  unitCost?: string | number | null;
  totalCost?: string | number | null;
  referenceType?: string | null;
  referenceId?: string | null;
  referenceNo?: string | null;
  department?: string | null;
  site?: string | null;
  branch?: string | null;
  projectCode?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  createdAt?: string | null;
  stockItem?: {
    itemCode?: string | null;
    itemName?: string | null;
    itemType?: string | null;
    category?: string | null;
    unitOfMeasure?: string | null;
  } | null;
  location?: {
    locationCode?: string | null;
    locationName?: string | null;
    site?: string | null;
    branch?: string | null;
    department?: string | null;
  } | null;
  movement?: {
    id?: string | null;
    movementNo?: string | null;
    movementType?: string | null;
    status?: string | null;
    requestedBy?: string | null;
    approvedBy?: string | null;
    postedBy?: string | null;
    postedAt?: string | null;
    financeExpenseId?: string | null;
  } | null;
  movementLine?: {
    qrTag?: {
      tagCode?: string | null;
      qrPayload?: string | null;
      barcodeValue?: string | null;
      status?: string | null;
    } | null;
  } | null;
  financeExpense?: {
    id?: string | null;
    expenseNo?: string | null;
    amount?: string | number | null;
    status?: string | null;
  } | null;
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
    status === 'RECEIPT' ||
    status === 'RETURN' ||
    status === 'ADJUSTMENT' ||
    status === 'LINKED'
  ) {
    return 'badge success';
  }

  if (
    status === 'ISSUE' ||
    status === 'DAMAGE' ||
    status === 'LOSS' ||
    status === 'WRITE_OFF' ||
    status === 'WORKSHOP_ISSUE' ||
    status === 'SCAFFOLD_ISSUE'
  ) {
    return 'badge warning';
  }

  return 'badge';
}

function cleanStatus(value?: string | null) {
  return String(value || '-').replaceAll('_', ' ');
}

function getQrValue(row: LedgerEntry) {
  return (
    row.movementLine?.qrTag?.tagCode ||
    row.movementLine?.qrTag?.qrPayload ||
    row.movementLine?.qrTag?.barcodeValue ||
    '-'
  );
}

function getFinanceLinked(row: LedgerEntry) {
  return Boolean(row.financeExpenseId || row.financeExpense?.id || row.movement?.financeExpenseId);
}

export default function AssetLedgerPage() {
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadLedger() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/assets/ledger`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || 'Failed to load stock ledger.');
      }

      const data = await response.json();
      setLedger(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load stock ledger.');
      setLedger([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLedger();
  }, []);

  const summary = useMemo(() => {
    const quantityIn = ledger.reduce((sum, row) => sum + asNumber(row.quantityIn), 0);
    const quantityOut = ledger.reduce((sum, row) => sum + asNumber(row.quantityOut), 0);
    const totalValue = ledger.reduce((sum, row) => sum + asNumber(row.totalCost), 0);

    const stockItems = new Set(
      ledger.map((row) => row.stockItem?.itemCode || row.stockItemId).filter(Boolean),
    ).size;

    const locations = new Set(
      ledger.map((row) => row.location?.locationCode || row.locationId).filter(Boolean),
    ).size;

    const financeLinked = ledger.filter((row) => getFinanceLinked(row)).length;

    return {
      entries: ledger.length,
      stockItems,
      locations,
      quantityIn,
      quantityOut,
      totalValue,
      financeLinked,
    };
  }, [ledger]);

  return (
    <AppShell>
      <section className="page-stack finance-live-page">
        <div className="finance-live-card">
          <div className="finance-live-header">
            <div>
              <p className="eyebrow">Asset Management</p>
              <h1>Stock Ledger</h1>
              <p className="muted">
                Permanent audit trail for posted stock receipts, issues, transfers, losses, damages,
                write-offs, QR/RFID-tracked stock and finance-linked movements.
              </p>
            </div>  
          </div>

          <button className="btn-secondary" type="button" onClick={loadLedger} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {error ? <div className="alert error">{error}</div> : null}

        <div className="metric-grid">
          <div className="metric-card">
            <span>Ledger Entries</span>
            <strong>{summary.entries}</strong>
          </div>

          <div className="metric-card">
            <span>Stock Items</span>
            <strong>{summary.stockItems}</strong>
          </div>

          <div className="metric-card">
            <span>Locations</span>
            <strong>{summary.locations}</strong>
          </div>

          <div className="metric-card">
            <span>Quantity In</span>
            <strong>{summary.quantityIn}</strong>
          </div>

          <div className="metric-card">
            <span>Quantity Out</span>
            <strong>{summary.quantityOut}</strong>
          </div>

          <div className="metric-card">
            <span>Total Value</span>
            <strong>{money(summary.totalValue)}</strong>
          </div>

          <div className="metric-card">
            <span>Finance Linked</span>
            <strong>{summary.financeLinked}</strong>
          </div>
        </div>

        <div className="card">
          <div className="page-header compact">
            <div>
              <h2>Ledger Register</h2>
              <p className="muted">
                Every approved and posted stock movement should create a permanent ledger entry.
              </p>
            </div>

            <div className="action-row">
              <Link className="btn-secondary" href="/assets/movements">
                Movements
              </Link>

              <Link className="btn-secondary" href="/assets/stock">
                Stores & Stock
              </Link>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Movement No.</th>
                  <th>Type</th>
                  <th>Item Code</th>
                  <th>Item Name</th>
                  <th>Location</th>
                  <th>QR / RFID</th>
                  <th>Qty In</th>
                  <th>Qty Out</th>
                  <th>Balance After</th>
                  <th>Unit Cost</th>
                  <th>Total Cost</th>
                  <th>Finance</th>
                  <th>Reference</th>
                  <th>Receipt</th>
                </tr>
              </thead>

              <tbody>
                {ledger.length === 0 ? (
                  <tr>
                    <td colSpan={15}>
                      {loading ? 'Loading stock ledger...' : 'No ledger entries found.'}
                    </td>
                  </tr>
                ) : (
                  ledger.map((row) => {
                    const financeLinked = getFinanceLinked(row);
                    const movementId = row.movement?.id || row.movementId;

                    return (
                      <tr key={row.id}>
                        <td>{formatDate(row.createdAt)}</td>

                        <td>{row.movement?.movementNo || '-'}</td>

                        <td>
                          <span className={statusClass(row.transactionType)}>
                            {cleanStatus(row.transactionType || row.movement?.movementType)}
                          </span>
                        </td>

                        <td>{row.stockItem?.itemCode || '-'}</td>

                        <td>{row.stockItem?.itemName || '-'}</td>

                        <td>
                          <strong>{row.location?.locationCode || '-'}</strong>
                          <br />
                          <span className="muted">{row.location?.locationName || ''}</span>
                        </td>

                        <td>{getQrValue(row)}</td>

                        <td>{asNumber(row.quantityIn)}</td>

                        <td>{asNumber(row.quantityOut)}</td>

                        <td>{asNumber(row.balanceAfter)}</td>

                        <td>{money(row.unitCost)}</td>

                        <td>{money(row.totalCost)}</td>

                        <td>
                          <span className={financeLinked ? 'badge success' : 'badge'}>
                            {financeLinked ? 'LINKED' : 'NOT REQUIRED'}
                          </span>
                        </td>

                        <td>{row.referenceNo || row.referenceId || row.referenceType || '-'}</td>

                        <td>
                          {movementId ? (
                            <Link
                              className="btn-secondary compact"
                              href={`/assets/movements/${movementId}/receipt`}
                            >
                              Print
                            </Link>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </AppShell>
  );
}