'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/ui/PageHeader';
import { Notice } from '@/components/ui/Notice';
import { getAssetDashboard, getAssetLedger, getAssetMovements } from '@/lib/assets-api';

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

const integrationAreas = [
  {
    area: 'Assets',
    financeUse: 'Asset purchase cost tracking, capex/opex classification, depreciation readiness.',
    status: 'Live foundation',
  },
  {
    area: 'Inventory',
    financeUse: 'Stock issue cost allocation, consumable tracking, and project cost control.',
    status: 'Live',
  },
  {
    area: 'Procurement',
    financeUse: 'Requisition, PO, supplier invoice, GRN, and payment matching.',
    status: 'Planned link',
  },
  {
    area: 'Scaffolding',
    financeUse: 'Scaffold movement accountability, loss tracking, and recoverable cost reporting.',
    status: 'Live foundation',
  },
  {
    area: 'Tools and Equipment',
    financeUse: 'Tool allocation, replacement cost, project usage, and damage recovery.',
    status: 'Live foundation',
  },
];

export default function AssetManagementIntegrationPage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadPage() {
    setLoading(true);
    setError('');

    try {
      const [dashboardData, ledgerData, movementData] = await Promise.all([
        getAssetDashboard(),
        getAssetLedger(),
        getAssetMovements(),
      ]);

      setDashboard(dashboardData || null);
      setLedger(Array.isArray(ledgerData) ? ledgerData : []);
      setMovements(Array.isArray(movementData) ? movementData : []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load Asset Management finance integration data.');
      setDashboard(null);
      setLedger([]);
      setMovements([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
  }, []);

  const summary = useMemo(() => {
    const ledgerValue = ledger.reduce((sum, row) => sum + asNumber(row.totalCost), 0);
    const financeLinked = movements.filter(
      (movement) => movement.financeExpenseId || movement.financeExpense,
    ).length;

    return {
      stockItems: asNumber(dashboard?.summary?.stockItems),
      locations: asNumber(dashboard?.summary?.locations),
      movements: asNumber(dashboard?.summary?.movements),
      ledgerEntries: asNumber(dashboard?.summary?.ledgerEntries || ledger.length),
      financeLinked: asNumber(dashboard?.summary?.financeLinkedMovements || financeLinked),
      activeCustody: asNumber(dashboard?.summary?.activeCustody),
      activeDeployments: asNumber(dashboard?.summary?.activeDeployments),
      openStockCounts: asNumber(dashboard?.summary?.openStockCounts),
      ledgerValue,
    };
  }, [dashboard, ledger, movements]);

  return (
    <AppShell>
      <section className="page-stack">
        <section className="card wide-page-card">
          <div className="finance-card finance-hero-card">
            <PageHeader
              eyebrow="Finance Integration"
              title="Southin Asset Management Integration"
              description="Live finance view for asset cost, stock movement, stores requisitions, ledger entries, custody, deployments and procurement visibility."
            />

            <div className="action-row">
              <button className="btn-secondary" type="button" onClick={loadPage}>
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>

              <Link className="btn-secondary" href="/finance/dashboard">
                Finance Dashboard
              </Link>

              <Link className="btn-secondary" href="/assets/dashboard">
                Asset Dashboard
              </Link>

              <Link className="btn-secondary" href="/assets/ledger">
                Stock Ledger
              </Link>
            </div>
          </div>

          {error ? <div className="alert error">{error}</div> : null}

          <Notice>
            PeoplePay remains the HR/payroll and finance source of truth. Asset Management is now
            the operational source for stores requisitions, stock movements, custody, deployments,
            QR/RFID tracking and ledger-backed asset cost visibility.
          </Notice>

          <div className="metric-grid" style={{ marginTop: '1rem' }}>
            <div className="metric-card">
              <span>Stock Items</span>
              <strong>{summary.stockItems}</strong>
            </div>

            <div className="metric-card">
              <span>Locations</span>
              <strong>{summary.locations}</strong>
            </div>

            <div className="metric-card">
              <span>Movements</span>
              <strong>{summary.movements}</strong>
            </div>

            <div className="metric-card">
              <span>Ledger Entries</span>
              <strong>{summary.ledgerEntries}</strong>
            </div>

            <div className="metric-card">
              <span>Ledger Value</span>
              <strong>{money(summary.ledgerValue)}</strong>
            </div>

            <div className="metric-card">
              <span>Finance Linked</span>
              <strong>{summary.financeLinked}</strong>
            </div>

            <div className="metric-card">
              <span>Active Custody</span>
              <strong>{summary.activeCustody}</strong>
            </div>

            <div className="metric-card">
              <span>Deployments</span>
              <strong>{summary.activeDeployments}</strong>
            </div>

            <div className="metric-card">
              <span>Open Stock Counts</span>
              <strong>{summary.openStockCounts}</strong>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="page-header compact">
            <div>
              <h2>Integration Scope</h2>
              <p className="muted">
                Finance consumes approved and posted Asset Management transactions for audit,
                project costing and operational cost visibility.
              </p>
            </div>
          </div>

          <div className="metric-grid">
            <div className="metric-card">
              <span>Assets</span>
              <strong>Tools, equipment, scaffolds</strong>
            </div>

            <div className="metric-card">
              <span>Inventory</span>
              <strong>Stores, PPE, consumables</strong>
            </div>

            <div className="metric-card">
              <span>Procurement</span>
              <strong>Requisition and PO links</strong>
            </div>

            <div className="metric-card">
              <span>Finance</span>
              <strong>Cost and payment evidence</strong>
            </div>
          </div>
        </section>

        <section className="card">
          <h2>Finance Data from Asset Management</h2>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data Area</th>
                  <th>Finance Use</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {integrationAreas.map((item) => (
                  <tr key={item.area}>
                    <td>
                      <strong>{item.area}</strong>
                    </td>
                    <td>{item.financeUse}</td>
                    <td>
                      <span
                        className={
                          item.status.toUpperCase().includes('LIVE')
                            ? 'badge success'
                            : 'badge warning'
                        }
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <div className="page-header compact">
            <div>
              <h2>Recent Finance-Relevant Movements</h2>
              <p className="muted">
                Posted stores movements and requisitions that finance can use for project costing,
                consumable tracking and expense evidence.
              </p>
            </div>

            <Link className="btn-secondary" href="/assets/movements">
              View Movements
            </Link>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Movement No.</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Ledger</th>
                  <th>Finance</th>
                  <th>Site</th>
                  <th>Reason</th>
                  <th>Value</th>
                </tr>
              </thead>

              <tbody>
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={8}>No movement records found.</td>
                  </tr>
                ) : (
                  movements.slice(0, 10).map((movement) => {
                    const value = (movement.lines || []).reduce(
                      (sum: number, line: any) => sum + asNumber(line.totalCost),
                      0,
                    );

                    return (
                      <tr key={movement.id}>
                        <td>{movement.movementNo || '-'}</td>
                        <td>{movement.movementType || '-'}</td>
                        <td>
                          <span className="badge">{movement.status || '-'}</span>
                        </td>
                        <td>
                          <span className={movement.ledgerStatus === 'POSTED' ? 'badge success' : 'badge warning'}>
                            {movement.ledgerStatus || '-'}
                          </span>
                        </td>
                        <td>
                          <span className={movement.financeStatus === 'LINKED' ? 'badge success' : 'badge'}>
                            {movement.financeStatus || 'NOT_REQUIRED'}
                          </span>
                        </td>
                        <td>{movement.site || '-'}</td>
                        <td>{movement.reason || '-'}</td>
                        <td>{money(value)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </AppShell>
  );
}