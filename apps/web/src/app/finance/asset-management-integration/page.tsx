import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/ui/PageHeader';
import { Notice } from '@/components/ui/Notice';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function AssetManagementIntegrationPage() {
  return (
    <AppShell>
      <section className="card">
        <PageHeader
          eyebrow="Finance Integration"
          title="Southin Asset Management Integration"
          description="Connect PeoplePay Finance with the Southin Asset Management system for asset cost, inventory movement, tools, scaffolding, and procurement visibility."
        />

        <div className="action-row" style={{ marginBottom: '1rem' }}>
          <Link className="btn-secondary" href="/finance/dashboard">
            Back to Finance Dashboard
          </Link>
          <Link className="btn-secondary" href="/workbench">
            Back to Workbench
          </Link>
        </div>

        <Notice>
          This replaces the future Omni Core dependency by preparing PeoplePay to integrate with
          Southin’s own Asset Management system. Finance will be able to see procurement-linked
          assets, stock movement, project cost allocation, and asset-related payment evidence.
        </Notice>

        <section className="finance-dashboard-grid" style={{ marginTop: '1rem' }}>
          <div className="employee-panel">
            <h2>Integration Scope</h2>

            <div className="mini-detail-grid finance-detail-grid">
              <div>
                <span>Assets</span>
                <strong>Tools, equipment, scaffolds</strong>
              </div>
              <div>
                <span>Inventory</span>
                <strong>Stock and consumables</strong>
              </div>
              <div>
                <span>Procurement</span>
                <strong>Requisition and PO links</strong>
              </div>
              <div>
                <span>Finance</span>
                <strong>Payment and cost evidence</strong>
              </div>
            </div>
          </div>

          <div className="employee-panel">
            <h2>Future API Link</h2>
            <p className="muted">
              Once the Asset Management API is ready, this page will connect to it and display
              asset purchase values, stock movements, loss/damage costs, scaffold allocations, and
              site/project cost summaries.
            </p>
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
                <tr>
                  <td>Asset purchases</td>
                  <td>Capex/opex cost tracking and supplier payment matching</td>
                  <td>
                    <span className="employee-status warning">Planned</span>
                  </td>
                </tr>

                <tr>
                  <td>Inventory issues</td>
                  <td>Project/site cost allocation and stock control</td>
                  <td>
                    <span className="employee-status warning">Planned</span>
                  </td>
                </tr>

                <tr>
                  <td>Damaged/lost assets</td>
                  <td>Recovery, write-off, and audit evidence</td>
                  <td>
                    <span className="employee-status warning">Planned</span>
                  </td>
                </tr>

                <tr>
                  <td>Scaffold movements</td>
                  <td>Operational cost tracking and site accountability</td>
                  <td>
                    <span className="employee-status warning">Planned</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </AppShell>
  );
}