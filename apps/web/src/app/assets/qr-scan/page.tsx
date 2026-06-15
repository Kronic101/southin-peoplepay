'use client';

import { useEffect, useState } from 'react';

import AppShell from '../../../components/AppShell';
import { getAssetQrTags, scanAssetQrTag, type AssetQrTagRecord } from '../../../lib/api';

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-ZM', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function statusClass(status: string) {
  if (['AVAILABLE'].includes(status)) return 'status-pill success';
  if (['DAMAGED', 'LOST', 'RETIRED'].includes(status)) return 'status-pill danger';
  return 'status-pill warning';
}

export default function AssetQrScanPage() {
  const [tags, setTags] = useState<AssetQrTagRecord[]>([]);
  const [lastScan, setLastScan] = useState<AssetQrTagRecord | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadTags() {
    setError('');

    try {
      setTags(await getAssetQrTags());
    } catch (err: any) {
      setError(err?.message || 'Failed to load QR tags.');
    }
  }

  useEffect(() => {
    loadTags();
  }, []);

  async function handleScan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');

    const formData = new FormData(event.currentTarget);
    const tagCode = String(formData.get('tagCode') || '');

    try {
      const result = await scanAssetQrTag(tagCode, {
        scannedBy: String(formData.get('scannedBy') || 'Asset Manager'),
        site: String(formData.get('site') || 'Kitwe Main Distribution Centre'),
      });

      setLastScan(result);
      setMessage(`${tagCode} scanned successfully.`);
      await loadTags();
    } catch (err: any) {
      setError(err?.message || 'QR scan failed.');
    }
  }

  return (
    <AppShell>
      <section className="page-stack finance-live-page">
        <div className="finance-live-card">
          <div className="finance-live-header">
            <div>
              <p className="eyebrow">Asset Management</p>
              <h1>QR Scan Centre</h1>
              <p className="muted">
                Manual QR scan entry for now. Later this page can use the device camera scanner on
                mobile/tablet devices.
              </p>
            </div>

            <button className="btn-secondary" onClick={loadTags} type="button">
              Refresh
            </button>
          </div>

          {message && <div className="finance-notice success">{message}</div>}
          {error && <div className="finance-notice danger">{error}</div>}

          <form className="finance-form-grid" onSubmit={handleScan}>
            <label>
              QR Tag Code
              <input name="tagCode" defaultValue="QR-SCF-0001" required />
            </label>
            <label>
              Scanned By
              <input name="scannedBy" defaultValue="Asset Manager" />
            </label>
            <label>
              Site
              <input name="site" defaultValue="Kitwe Main Distribution Centre" />
            </label>

            <button className="btn" type="submit">
              Scan QR Tag
            </button>
          </form>
        </div>

        {lastScan && (
          <div className="finance-live-card">
            <h2>Last Scan Result</h2>
            <div className="finance-summary-grid">
              <div className="finance-summary-card"><span>Tag Code</span><strong>{lastScan.tagCode}</strong></div>
              <div className="finance-summary-card"><span>Status</span><strong>{lastScan.status}</strong></div>
              <div className="finance-summary-card"><span>Item</span><strong>{lastScan.stockItem?.itemName || '-'}</strong></div>
              <div className="finance-summary-card"><span>Location</span><strong>{lastScan.assignedLocation?.locationName || '-'}</strong></div>
            </div>
          </div>
        )}

        <div className="finance-live-card">
          <h2>QR Tag Register</h2>

          <div className="finance-table-wrap">
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Tag Code</th>
                  <th>Payload</th>
                  <th>Stock Item</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Last Scanned By</th>
                  <th>Last Scan Site</th>
                  <th>Last Scanned</th>
                </tr>
              </thead>
              <tbody>
                {tags.length === 0 ? (
                  <tr><td colSpan={8}>No QR tags found.</td></tr>
                ) : (
                  tags.map((tag) => (
                    <tr key={tag.id}>
                      <td>{tag.tagCode}</td>
                      <td>{tag.qrPayload || '-'}</td>
                      <td>{tag.stockItem?.itemName || '-'}</td>
                      <td>{tag.assignedLocation?.locationName || '-'}</td>
                      <td><span className={statusClass(tag.status)}>{tag.status}</span></td>
                      <td>{tag.lastScannedBy || '-'}</td>
                      <td>{tag.lastScanSite || '-'}</td>
                      <td>{formatDate(tag.lastScannedAt)}</td>
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