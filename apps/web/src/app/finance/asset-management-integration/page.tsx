import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/ui/PageHeader';
import { Notice } from '@/components/ui/Notice';

/**
 * Asset Management Integration Placeholder
 * --------------------------------------------------------------------
 * Purpose:
 * This page documents how Finance will connect to the future Southin
 * Asset Management platform.
 *
 * Strategic direction:
 * - Asset Management will be its own platform/module.
 * - It will replace the future Omni Core dependency.
 * - It will manage assets, inventory, scaffold items, tools, consumables,
 *   procurement links, site movements, loss/damage, and project cost allocation.
 * - Finance will consume approved asset/procurement cost records from that system.
 */

const integrationAreas = [
  {
    area: 'Assets',
    financeUse: 'Asset purchase cost tracking, capex/opex classification, depreciation readiness.',
    status: 'Planned',
  },
  {
    area: 'Inventory',
    financeUse: 'Stock issue cost allocation, consumable tracking, and project cost control.',
    status: 'Planned',
  },
  {
    area: 'Procurement',
    financeUse: 'Requisition, PO, supplier invoice, GRN, and payment matching.',
    status: 'Planned',
  },
  {
    area: 'Scaffolding',
    financeUse: 'Scaffold movement accountability, loss tracking, and recoverable cost reporting.',
    status: 'Planned',
  },
  {
    area: 'Tools and Equipment',
    financeUse: 'Tool allocation, replacement cost, project usage, and damage recovery.',
    status: 'Planned',
  },
];

export default function AssetManagementIntegrationPage() {
  return (
    <AppShell>
      <section className="card wide-page-card">
        <PageHeader
          eyebrow="Finance Integration"
          title="Southin Asset Management Integration"
          description="Connect PeoplePay Finance with the Southin Asset Management system for asset cost, inventory movement, tools, scaffolding, and procurement visibility."
        />

        <div className="action-row" style={{ marginBottom: '1rem' }}>
          <Link className="btn-secondary" href="/finance/dashboard">
            Back to Finance Dashboard
          </Link>

          <Link className="btn-secondary" href="/finance/procurement-tracker">
            Procurement Tracker
          </Link>

          <Link className="btn-secondary" href="/workbench">
            Back to Workbench
          </Link>
        </div>

        <Notice>
          This page replaces the future Omni Core dependency by preparing PeoplePay to integrate
          with Southin’s own Asset Management system. Finance will be able to see procurement-linked
          assets, stock movement, project cost allocation, supplier payments, and asset-related
          payment evidence.
        </Notice>

        <section className="finance-dashboard-grid" style={{ marginTop: '1rem' }}>
          <div className="employee-panel">
            <h2>Integration Scope</h2>

            <div className="summary-grid">
              <div className="leave-summary-card">
                <span>Assets</span>
                <strong>Tools, equipment, scaffolds</strong>
              </div>

              <div className="leave-summary-card">
                <span>Inventory</span>
                <strong>Stock and consumables</strong>
              </div>

              <div className="leave-summary-card">
                <span>Procurement</span>
                <strong>Requisition and PO links</strong>
              </div>

              <div className="leave-summary-card">
                <span>Finance</span>
                <strong>Payment and cost evidence</strong>
              </div>
            </div>
          </div>

          <div className="employee-panel">
            <h2>Future API Link</h2>

            <p className="muted">
              Once the Asset Management API is ready, this page will connect to it and display asset
              purchase values, stock movements, loss/damage costs, scaffold allocations, and
              site/project cost summaries.
            </p>

            <div className="notice">
              PeoplePay remains the HR/payroll source of truth. Asset Management becomes the
              operational asset and procurement source of truth. Finance consumes both.
            </div>
          </div>
        </section>

        <section className="employee-panel" style={{ marginTop: '1rem' }}>
          <h2>Planned Finance Data from Asset Management</h2>

          <div className="employee-table-wrap">
            <table className="employee-table">
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
                      <span className="employee-status warning">{item.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </AppShell>
  );
}