'use client';

import { useEffect, useState } from 'react';

import AppShell from '../../../components/AppShell';
import { getScaffoldComponents, type ScaffoldComponentRecord } from '../../../lib/api';

function statusClass(status: string) {
  if (['AVAILABLE', 'GOOD'].includes(status)) return 'status-pill success';
  if (['DAMAGED', 'LOST', 'RETIRED'].includes(status)) return 'status-pill danger';
  return 'status-pill warning';
}

export default function ScaffoldComponentsPage() {
  const [scaffolds, setScaffolds] = useState<ScaffoldComponentRecord[]>([]);
  const [error, setError] = useState('');

  async function loadScaffolds() {
    setError('');

    try {
      setScaffolds(await getScaffoldComponents());
    } catch (err: any) {
      setError(err?.message || 'Failed to load scaffold components.');
    }
  }

  useEffect(() => {
    loadScaffolds();
  }, []);

  return (
    <AppShell>
      <section className="page-stack finance-live-page">
        <div className="finance-live-card">
          <div className="finance-live-header">
            <div>
              <p className="eyebrow">Asset Management</p>
              <h1>Scaffold Component Register</h1>
              <p className="muted">
                Scaffold-specific register for standards, ledgers, transoms, braces, base jacks,
                toe boards, platforms and QR-tagged components.
              </p>
            </div>

            <button className="btn-secondary" onClick={loadScaffolds} type="button">
              Refresh
            </button>
          </div>

          {error && <div className="finance-notice danger">{error}</div>}

          <div className="finance-summary-grid">
            <div className="finance-summary-card"><span>Total Components</span><strong>{scaffolds.length}</strong></div>
            <div className="finance-summary-card"><span>Available</span><strong>{scaffolds.filter((s) => s.tagStatus === 'AVAILABLE').length}</strong></div>
            <div className="finance-summary-card"><span>Issued</span><strong>{scaffolds.filter((s) => s.tagStatus === 'ISSUED').length}</strong></div>
            <div className="finance-summary-card"><span>Damaged</span><strong>{scaffolds.filter((s) => s.tagStatus === 'DAMAGED').length}</strong></div>
          </div>
        </div>

        <div className="finance-live-card">
          <h2>Scaffold Components</h2>

          <div className="finance-table-wrap">
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Component No</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Stock Item</th>
                  <th>Current Site</th>
                  <th>Location</th>
                  <th>Condition</th>
                  <th>Tag Status</th>
                  <th>QR Tags</th>
                </tr>
              </thead>
              <tbody>
                {scaffolds.length === 0 ? (
                  <tr><td colSpan={9}>No scaffold components found.</td></tr>
                ) : (
                  scaffolds.map((item) => (
                    <tr key={item.id}>
                      <td>{item.componentNo}</td>
                      <td>{item.componentType}</td>
                      <td>{item.description || '-'}</td>
                      <td>{item.stockItem?.itemName || '-'}</td>
                      <td>{item.currentSite || '-'}</td>
                      <td>{item.currentLocation || '-'}</td>
                      <td><span className={statusClass(item.conditionStatus)}>{item.conditionStatus}</span></td>
                      <td><span className={statusClass(item.tagStatus)}>{item.tagStatus}</span></td>
                      <td>{item.qrTags?.map((tag) => tag.tagCode).join(', ') || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </AppShell>
  );
}