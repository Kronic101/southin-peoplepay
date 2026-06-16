'use client';

import { useEffect, useState } from 'react';
import {
  AssetImportBatch,
  createAssetImportPreview,
  getAssetImportBatches,
  postAssetImportBatch,
} from '@/lib/assets-api';
import AppShell from '../../../components/AppShell';


const sampleCsv = `itemCode,itemName,itemType,category,unitOfMeasure,locationCode,locationName,quantityOnHand,minimumLevel,reorderLevel,standardCost,qrTagCode,scaffoldComponentNo,componentType,conditionStatus,site,branch,department
SCF-STANDARD,Scaffold Standard,SCAFFOLD_COMPONENT,Scaffold,EA,KMD-STORES,Kitwe Main Distribution Centre Stores,10,20,50,0,QR-SCF-0001,SCF-2026-0001,STANDARD,GOOD,Kitwe Main Distribution Centre,Kitwe,Operations
PPE-GLOVES,Safety Gloves,PPE,PPE,PAIR,KMD-STORES,Kitwe Main Distribution Centre Stores,100,50,100,0,,,GOOD,Kitwe Main Distribution Centre,Kitwe,Operations`;

function formatDateTime(value?: string | null) {
  if (!value) return '-';

  try {
    return new Intl.DateTimeFormat('en-ZM', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function AssetImportPreviewPage() {
  const [mounted, setMounted] = useState(false);
  const [csvText, setCsvText] = useState(sampleCsv);
  const [createdBy, setCreatedBy] = useState('Asset Manager');
  const [sourceType, setSourceType] = useState('OMNI_CORE');
  const [fileName, setFileName] = useState('omni-core-import.csv');
  const [batches, setBatches] = useState<AssetImportBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<AssetImportBatch | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadBatches();
  }, []);

  async function loadBatches() {
    setLoading(true);
    setError('');

    const result = await getAssetImportBatches();

    if (!result.ok) {
      setError(result.error || 'Unable to load import batches.');
      setLoading(false);
      return;
    }

    setBatches(result.data || []);
    setLoading(false);
  }

  async function previewImport() {
    setLoading(true);
    setError('');
    setMessage('');

    const result = await createAssetImportPreview({
      sourceType,
      fileName,
      createdBy,
      csvText,
    });

    if (!result.ok) {
      setError(result.error || 'Unable to create import preview.');
      setLoading(false);
      return;
    }

    setSelectedBatch(result.data?.batch || null);
    setMessage(result.data?.message || 'Import preview created.');
    await loadBatches();
    setLoading(false);
  }

  async function postImport(batch: AssetImportBatch) {
    if (!batch?.id) return;

    const confirmed = window.confirm(
      `Post import batch ${batch.batchNo} into stock items, balances and movements?`,
    );

    if (!confirmed) return;

    setLoading(true);
    setError('');
    setMessage('');

    const result = await postAssetImportBatch(batch.id, createdBy || 'Asset Manager');

    if (!result.ok) {
      setError(result.error || 'Unable to post import batch.');
      setLoading(false);
      return;
    }

    setSelectedBatch(result.data?.batch || null);
    setMessage(result.data?.message || 'Import batch posted.');
    await loadBatches();
    setLoading(false);
  }

  if (!mounted) return null;

  return (
    <AppShell>
    <section className="finance-page">
      <div className="finance-card finance-hero-card">
        <div>
          <p className="eyebrow">Asset Management</p>
          <h1>Omni Core Import Preview</h1>
          <p className="muted">
            Stage Omni Core, Excel or CSV stock data before posting into stock items, balances,
            movements, QR tags and scaffold records.
          </p>
        </div>

        <button className="dark-button" type="button" onClick={loadBatches}>
          Refresh
        </button>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}
      {message ? <div className="success-banner">{message}</div> : null}

      <div className="finance-card">
        <h2>Create Import Preview</h2>

        <div className="form-grid two">
          <label>
            Source Type
            <select value={sourceType} onChange={(event) => setSourceType(event.target.value)}>
              <option value="OMNI_CORE">OMNI_CORE</option>
              <option value="EXCEL">EXCEL</option>
              <option value="CSV">CSV</option>
              <option value="MANUAL_RECON">MANUAL_RECON</option>
            </select>
          </label>

          <label>
            File Name
            <input value={fileName} onChange={(event) => setFileName(event.target.value)} />
          </label>

          <label>
            Created By
            <input value={createdBy} onChange={(event) => setCreatedBy(event.target.value)} />
          </label>
        </div>

        <label className="full-width-field">
          CSV Data
          <textarea
            value={csvText}
            rows={12}
            onChange={(event) => setCsvText(event.target.value)}
          />
        </label>

        <button
          className="primary-button"
          type="button"
          disabled={loading}
          onClick={previewImport}
        >
          {loading ? 'Processing...' : 'Create Preview'}
        </button>
      </div>

      {selectedBatch ? (
        <div className="finance-card">
          <div className="section-header-row">
            <div>
              <h2>Selected Batch: {selectedBatch.batchNo}</h2>
              <p className="muted">
                Status: {selectedBatch.status} · Rows: {selectedBatch.totalRows} · Valid:{' '}
                {selectedBatch.validRows} · Warnings: {selectedBatch.warningRows} · Errors:{' '}
                {selectedBatch.errorRows}
              </p>
            </div>

            <button
              className="primary-button"
              type="button"
              disabled={loading || selectedBatch.status === 'POSTED' || selectedBatch.errorRows > 0}
              onClick={() => postImport(selectedBatch)}
            >
              Post Approved Import
            </button>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Item Code</th>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Location</th>
                  <th>Qty</th>
                  <th>QR Tag</th>
                  <th>Scaffold No.</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(selectedBatch.lines || []).map((line) => (
                  <tr key={line.id}>
                    <td>{line.rowNumber}</td>
                    <td>{line.itemCode || '-'}</td>
                    <td>{line.itemName || '-'}</td>
                    <td>{line.category || '-'}</td>
                    <td>{line.locationName || line.locationCode || '-'}</td>
                    <td>{line.quantityOnHand ?? '-'}</td>
                    <td>{line.qrTagCode || '-'}</td>
                    <td>{line.scaffoldComponentNo || '-'}</td>
                    <td>
                      <span className="status-pill">{line.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="finance-card">
        <h2>Import Batch Register</h2>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Batch No.</th>
                <th>Source</th>
                <th>File</th>
                <th>Status</th>
                <th>Total</th>
                <th>Valid</th>
                <th>Warnings</th>
                <th>Errors</th>
                <th>Posted</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={11}>No import batches found.</td>
                </tr>
              ) : (
                batches.map((batch) => (
                  <tr key={batch.id}>
                    <td>{batch.batchNo}</td>
                    <td>{batch.sourceType}</td>
                    <td>{batch.fileName || '-'}</td>
                    <td>
                      <span className="status-pill">{batch.status}</span>
                    </td>
                    <td>{batch.totalRows}</td>
                    <td>{batch.validRows}</td>
                    <td>{batch.warningRows}</td>
                    <td>{batch.errorRows}</td>
                    <td>{batch.postedRows}</td>
                    <td>{formatDateTime(batch.createdAt)}</td>
                    <td>
                      <button
                        className="dark-button small"
                        type="button"
                        onClick={() => setSelectedBatch(batch)}
                      >
                        View
                      </button>
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