import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/ui/PageHeader';
import { SummaryGrid } from '@/components/ui/SummaryGrid';
import { Notice } from '@/components/ui/Notice';
import { StatusPill } from '@/components/ui/StatusPill';
import { getStoresDashboard } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function numberValue(value: any) {
  return Number(value ?? 0);
}

function fmtNumber(value: any) {
  return numberValue(value).toLocaleString('en-ZM');
}

function fmtDate(value?: string | null) {
  if (!value) return '-';

  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return '-';
  }
}

function valueOrDash(value: any) {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

export default async function StoresDashboardPage() {
  const data = await getStoresDashboard();

  const summary = data?.summary || {};
  const stockByLocation = data?.stockByLocation || [];
  const lowStockItems = data?.lowStockItems || [];
  const scaffoldByLocation = data?.scaffoldByLocation || [];
  const assetsBySite = data?.assetsBySite || [];
  const recentRequisitions = data?.recentRequisitions || [];

  return (
    <AppShell>
      <section className="finance-summary-card">
        <PageHeader
          eyebrow="Stores Control"
          title="Stores Dashboard"
          description="View imported opening stock, locations, scaffold components, assets, and recent stores requisitions."
          actions={
            <>
              <Link className="btn-secondary" href="/approvals/inbox">
                Approval Inbox
              </Link>

              <Link className="btn" href="/stores/requisitions/new">
                New Stores Request
              </Link>
            </>
          }
        />

        <SummaryGrid
          items={[
            {
              label: 'Stock items',
              value: fmtNumber(summary.stockItems),
            },
            {
              label: 'Stock locations',
              value: fmtNumber(summary.stockLocations),
            },
            {
              label: 'Quantity on hand',
              value: fmtNumber(summary.totalQuantityOnHand),
            },
            {
              label: 'Scaffold components',
              value: fmtNumber(summary.scaffoldComponents),
            },
            {
              label: 'Assets / fleet',
              value: fmtNumber(summary.hubAssets),
            },
            {
              label: 'Low / zero stock',
              value: fmtNumber(summary.lowStockItems),
            },
          ]}
        />

        <Notice>
          This dashboard is currently reading from imported ex-stock opening balances. Stock should
          only be reduced after the issue, return, damaged, and quarantine workflows are fully tested.
        </Notice>

        <div className="table-wrap">
          <h3>Stock by Location</h3>

          <table>
            <thead>
              <tr>
                <th>Location Code</th>
                <th>Location Name</th>
                <th>Type</th>
                <th>Site</th>
                <th>Branch</th>
                <th>Balance Lines</th>
                <th>Quantity on Hand</th>
              </tr>
            </thead>

            <tbody>
              {stockByLocation.length === 0 ? (
                <tr>
                  <td colSpan={7}>No stock locations found.</td>
                </tr>
              ) : (
                stockByLocation.map((location: any) => (
                  <tr key={location.locationCode}>
                    <td>{location.locationCode}</td>
                    <td>{location.locationName}</td>
                    <td>{location.locationType}</td>
                    <td>{location.site}</td>
                    <td>{location.branch}</td>
                    <td>{fmtNumber(location.balanceLines)}</td>
                    <td>{fmtNumber(location.quantityOnHand)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="table-wrap">
          <h3>Low / Zero Stock Watchlist</h3>

          <table>
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Item Name</th>
                <th>Type</th>
                <th>Category</th>
                <th>Location</th>
                <th>On Hand</th>
                <th>Minimum</th>
                <th>Reorder</th>
              </tr>
            </thead>

            <tbody>
              {lowStockItems.length === 0 ? (
                <tr>
                  <td colSpan={8}>No low stock items detected.</td>
                </tr>
              ) : (
                lowStockItems.map((item: any) => (
                  <tr key={`${item.itemCode}-${item.locationCode}`}>
                    <td>{item.itemCode}</td>
                    <td>{item.itemName}</td>
                    <td>{item.itemType}</td>
                    <td>{item.category}</td>
                    <td>
                      {item.locationCode} - {item.locationName}
                    </td>
                    <td>{fmtNumber(item.quantityOnHand)}</td>
                    <td>{fmtNumber(item.minimumLevel)}</td>
                    <td>{fmtNumber(item.reorderLevel)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="table-wrap">
          <h3>Scaffold Components by Location</h3>

          <table>
            <thead>
              <tr>
                <th>Location</th>
                <th>Site</th>
                <th>Component Type</th>
                <th>Components</th>
              </tr>
            </thead>

            <tbody>
              {scaffoldByLocation.length === 0 ? (
                <tr>
                  <td colSpan={4}>No scaffold components found.</td>
                </tr>
              ) : (
                scaffoldByLocation.map((row: any) => (
                  <tr key={`${row.locationCode}-${row.componentType}`}>
                    <td>{valueOrDash(row.locationCode)}</td>
                    <td>{valueOrDash(row.site)}</td>
                    <td>{valueOrDash(row.componentType)}</td>
                    <td>{fmtNumber(row.components)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="table-wrap">
          <h3>Assets / Fleet by Site</h3>

          <table>
            <thead>
              <tr>
                <th>Site</th>
                <th>Location</th>
                <th>Category</th>
                <th>Status</th>
                <th>Assets</th>
              </tr>
            </thead>

            <tbody>
              {assetsBySite.length === 0 ? (
                <tr>
                  <td colSpan={5}>No assets or fleet records found.</td>
                </tr>
              ) : (
                assetsBySite.map((row: any) => (
                  <tr key={`${row.site}-${row.location}-${row.category}-${row.status}`}>
                    <td>{valueOrDash(row.site)}</td>
                    <td>{valueOrDash(row.location)}</td>
                    <td>{valueOrDash(row.category)}</td>
                    <td>
                      <StatusPill status={row.status || 'ACTIVE'} />
                    </td>
                    <td>{fmtNumber(row.assets)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="table-wrap">
          <h3>Recent Stores Requisitions</h3>

          <table>
            <thead>
              <tr>
                <th>Requisition No.</th>
                <th>Title</th>
                <th>Site</th>
                <th>Requested By</th>
                <th>Status</th>
                <th>Lines</th>
                <th>Created</th>
              </tr>
            </thead>

            <tbody>
              {recentRequisitions.length === 0 ? (
                <tr>
                  <td colSpan={7}>No stores requisitions found.</td>
                </tr>
              ) : (
                recentRequisitions.map((request: any) => (
                  <tr key={request.id}>
                    <td>{request.requisitionNo}</td>
                    <td>
                      <Link href={`/stores/requisitions/${request.id}`}>
                        {request.title || request.description || request.requisitionNo}
                      </Link>
                    </td>
                    <td>{request.site || '-'}</td>
                    <td>{request.requestedBy || '-'}</td>
                    <td>
                      <StatusPill status={request.status || 'SUBMITTED'} />
                    </td>
                    <td>{request.lines?.length ?? 0}</td>
                    <td>{fmtDate(request.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}