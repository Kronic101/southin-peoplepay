'use client';

import { AppShell } from '@/components/AppShell';
import { exportToCsv } from '@/lib/csv-export';
import {
  closeAssetScaffoldDeployment,
  createAssetScaffoldDeployment,
  getAssetLocations,
  getAssetQrTags,
  getAssetScaffoldDeployments,
  getAssetStockItems,
} from '@/lib/assets-api';
import { useEffect, useMemo, useState } from 'react';

type Deployment = any;

function formatDate(value: unknown) {
  if (!value) return '-';

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString('en-ZM', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusClass(value: string) {
  const status = String(value || '').toUpperCase();

  if (['ACTIVE', 'DEPLOYED'].includes(status)) return 'badge success';
  if (['CLOSED', 'RETURNED'].includes(status)) return 'badge';
  if (['DAMAGED', 'LOST'].includes(status)) return 'badge danger';

  return 'badge warning';
}



export default function AssetDeploymentsPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [qrTags, setQrTags] = useState<any[]>([]);

  const [stockItemId, setStockItemId] = useState('');
  const [qrTagId, setQrTagId] = useState('');
  const [issuedToLocationId, setIssuedToLocationId] = useState('');
  const [deployedTo, setDeployedTo] = useState('');
  const [deployedBy, setDeployedBy] = useState('Asset Manager');
  const [projectCode, setProjectCode] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function handleExportCsv() {
    const rows = deployments.map((deployment: any) => ({
      deploymentNo: deployment.deploymentNo || '',
      status: deployment.status || '',
      stockItemCode:
        deployment.stockItem?.itemCode || deployment.scaffoldComponent?.stockItem?.itemCode || '',
      stockItemName:
        deployment.stockItem?.itemName || deployment.scaffoldComponent?.stockItem?.itemName || '',
      qrOrRfid: deployment.qrTag?.tagCode || '',
      issuedToLocation: deployment.issuedToLocation?.locationCode || '',
      deployedTo: deployment.deployedTo || '',
      projectCode: deployment.projectCode || '',
      deployedBy: deployment.deployedBy || '',
      deployedAt: deployment.deployedAt || '',
      closedBy: deployment.closedBy || '',
      closedAt: deployment.closedAt || '',
      notes: deployment.notes || '',
    }));

    exportToCsv('southin-asset-deployments.csv', rows);
  }

  async function loadPage() {
    setLoading(true);
    setError('');

    try {
      const [deploymentData, stockItemData, locationData, qrTagData] = await Promise.all([
        getAssetScaffoldDeployments(),
        getAssetStockItems(),
        getAssetLocations(),
        getAssetQrTags(),
      ]);

      setDeployments(Array.isArray(deploymentData) ? deploymentData : []);
      setStockItems(Array.isArray(stockItemData) ? stockItemData : []);
      setLocations(Array.isArray(locationData) ? locationData : []);
      setQrTags(Array.isArray(qrTagData) ? qrTagData : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load scaffold deployments.');
      setDeployments([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
  }, []);

  const summary = useMemo(() => {
    const active = deployments.filter((item) => item.status === 'ACTIVE').length;
    const closed = deployments.filter((item) => item.status === 'CLOSED').length;

    return {
      total: deployments.length,
      active,
      closed,
    };
  }, [deployments]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      if (!stockItemId && !qrTagId) {
        setError('Please select a stock item or QR/RFID tag.');
        return;
      }

      if (!deployedTo) {
        setError('Deployment site / area is required.');
        return;
      }

      await createAssetScaffoldDeployment({
        stockItemId: stockItemId || null,
        qrTagId: qrTagId || null,
        issuedToLocationId: issuedToLocationId || null,
        deployedTo,
        deployedBy,
        projectCode,
        notes,
      });

      setMessage('Deployment created successfully.');
      setDeployedTo('');
      setQrTagId('');
      setProjectCode('');
      setNotes('');
      await loadPage();
    } catch (err: any) {
      setError(err?.message || 'Failed to create deployment.');
    }
  }

  async function handleClose(deployment: Deployment) {
    setMessage('');
    setError('');

    try {
      await closeAssetScaffoldDeployment(deployment.id, {
        closedBy: deployedBy || 'Asset Manager',
      });

      setMessage(`Deployment ${deployment.deploymentNo} closed.`);
      await loadPage();
    } catch (err: any) {
      setError(err?.message || 'Failed to close deployment.');
    }
  }

  return (
    <AppShell>
      <section className="page-stack">
        <div className="finance-card finance-hero-card">
          <div>
            <p className="eyebrow">Asset Management</p>
            <h1>Scaffold & Asset Deployments</h1>
            <p className="muted">
              Track scaffold, stores and asset deployments to sites, projects and operational areas.
            </p>
          </div>

          <button className="btn-secondary" type="button" onClick={loadPage}>
            Refresh
          </button>

          <button className="btn-secondary" type="button" onClick={handleExportCsv}>
            Export CSV
          </button>
        </div>

        {error ? <div className="alert error">{error}</div> : null}
        {message ? <div className="alert success">{message}</div> : null}

        <div className="metric-grid">
          <div className="metric-card">
            <span>Total Deployments</span>
            <strong>{summary.total}</strong>
          </div>

          <div className="metric-card">
            <span>Active</span>
            <strong>{summary.active}</strong>
          </div>

          <div className="metric-card">
            <span>Closed</span>
            <strong>{summary.closed}</strong>
          </div>
        </div>

        <div className="card">
          <div className="page-header compact">
            <div>
              <h2>Create Deployment</h2>
              <p className="muted">
                Use this when scaffold components, QR/RFID items or stores stock are deployed to a
                project or work area.
              </p>
            </div>
          </div>

          <form className="form-grid" onSubmit={handleCreate}>
            <label>
              Stock Item
              <select value={stockItemId} onChange={(event) => setStockItemId(event.target.value)}>
                <option value="">Select stock item</option>
                {stockItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.itemCode} - {item.itemName}
                  </option>
                ))}
              </select>
            </label>

            <label>
              QR / RFID Tag
              <select value={qrTagId} onChange={(event) => setQrTagId(event.target.value)}>
                <option value="">Optional tag</option>
                {qrTags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.tagCode}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Issued To Location
              <select
                value={issuedToLocationId}
                onChange={(event) => setIssuedToLocationId(event.target.value)}
              >
                <option value="">Optional location</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.locationCode} - {location.locationName}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Deployed To
              <input
                value={deployedTo}
                onChange={(event) => setDeployedTo(event.target.value)}
                placeholder="Site, work area, project, or department"
              />
            </label>

            <label>
              Deployed By
              <input value={deployedBy} onChange={(event) => setDeployedBy(event.target.value)} />
            </label>

            <label>
              Project Code
              <input value={projectCode} onChange={(event) => setProjectCode(event.target.value)} />
            </label>

            <label className="full-span">
              Notes
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional deployment notes, site conditions, handover notes or return requirements."
              />
            </label>

            <div className="form-actions full-span">
              <button className="btn" type="submit">
                Create Deployment
              </button>
            </div>
          </form>
        </div>

        <div className="card">
          <div className="page-header compact">
            <div>
              <h2>Deployment Register</h2>
              <p className="muted">
                Active and closed scaffold / asset deployments for audit and project control.
              </p>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Deployment No.</th>
                  <th>Status</th>
                  <th>Stock Item</th>
                  <th>QR / RFID</th>
                  <th>Issued Location</th>
                  <th>Deployed To</th>
                  <th>Project</th>
                  <th>Deployed By</th>
                  <th>Deployed</th>
                  <th>Closed</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {deployments.length === 0 ? (
                  <tr>
                    <td colSpan={11}>
                      {loading ? 'Loading deployments...' : 'No deployments found.'}
                    </td>
                  </tr>
                ) : (
                  deployments.map((deployment) => (
                    <tr key={deployment.id}>
                      <td>{deployment.deploymentNo}</td>
                      <td>
                        <span className={statusClass(deployment.status)}>
                          {deployment.status || '-'}
                        </span>
                      </td>
                      <td>
                        {deployment.stockItem?.itemCode ||
                          deployment.scaffoldComponent?.stockItem?.itemCode ||
                          '-'}
                        <br />
                        <span className="muted">
                          {deployment.stockItem?.itemName ||
                            deployment.scaffoldComponent?.stockItem?.itemName ||
                            deployment.scaffoldComponent?.description ||
                            ''}
                        </span>
                      </td>
                      <td>{deployment.qrTag?.tagCode || '-'}</td>
                      <td>
                        {deployment.issuedToLocation?.locationCode || '-'}
                        <br />
                        <span className="muted">
                          {deployment.issuedToLocation?.locationName || ''}
                        </span>
                      </td>
                      <td>{deployment.deployedTo || '-'}</td>
                      <td>{deployment.projectCode || '-'}</td>
                      <td>{deployment.deployedBy || '-'}</td>
                      <td>{formatDate(deployment.deployedAt)}</td>
                      <td>{formatDate(deployment.closedAt)}</td>
                      <td>
                        {deployment.status === 'ACTIVE' ? (
                          <button
                            className="btn-secondary"
                            type="button"
                            onClick={() => handleClose(deployment)}
                          >
                            Close
                          </button>
                        ) : (
                          <span className="muted">Closed</span>
                        )}
                      </td>
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