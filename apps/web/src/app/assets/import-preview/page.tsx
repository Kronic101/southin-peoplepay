'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '@/components/AppShell';
import {
  createAssetImportPreview,
  getAssetImportBatches,
  postAssetImportBatch,
} from '@/lib/assets-api';

type ImportBatch = {
  id: string;
  batchNo: string;
  sourceType: string;
  fileName: string;
  status: string;
  totalRows: number | string;
  validRows: number | string;
  warningRows: number | string;
  errorRows: number | string;
  postedRows: number | string;
  createdBy?: string | null;
  postedBy?: string | null;
  postedAt?: string | null;
  createdAt?: string | null;
};

const defaultCsv = `itemCode,itemName,itemType,category,unitOfMeasure,locationCode,locationName,quantityOnHand,minimumLevel,reorderLevel,standardCost,qrTagCode,scaffoldComponentNo,componentType,conditionStatus,site,branch,department
SCF-STANDARD,Scaffold Standard,SCAFFOLD_COMPONENT,Scaffold,EA,KMD-STORES,Kitwe Main Distribution Centre Stores,10,20,50,0,QR-SCF-0001,SCF-2026-0001,STANDARD,GOOD,Kitwe Main Distribution Centre,Kitwe,Operations
PPE-GLOVES,Safety Gloves,PPE,PPE,PAIR,KMD-STORES,Kitwe Main Distribution Centre Stores,100,50,100,,,GOOD,Kitwe Main Distribution Centre,Kitwe,Operations`;

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value?: string | null) {
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

function badgeClass(status?: string | null) {
  const value = String(status || '').toUpperCase();

  if (value === 'POSTED' || value === 'VALIDATED' || value === 'APPROVED') {
    return 'status-pill success';
  }

  if (value === 'FAILED' || value === 'ERROR' || value === 'REJECTED') {
    return 'status-pill danger';
  }

  if (value === 'DRAFT' || value === 'PENDING' || value === 'WARNING') {
    return 'status-pill warning';
  }

  return 'status-pill';
}

export default function AssetImportPreviewPage() {
  const [mounted, setMounted] = useState(false);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<ImportBatch | null>(null);

  const [sourceType, setSourceType] = useState('OMNI_CORE');
  const [fileName, setFileName] = useState('omni-core-import.csv');
  const [createdBy, setCreatedBy] = useState('Asset Manager');
  const [csvText, setCsvText] = useState(defaultCsv);

  const [loading, setLoading] = useState(false);
  const [postingId, setPostingId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
    loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);
    setError('');
    setMessage('');

    const result = await getAssetImportBatches();

    if (!result.ok) {
      setBatches([]);
      setSelectedBatch(null);
      setError(result.error || 'Unable to load import batches.');
      setLoading(false);
      return;
    }

    const rows = (result.data || []) as ImportBatch[];
    setBatches(rows);

    setSelectedBatch((current) => {
      if (!current) return rows[0] || null;
      return rows.find((row) => row.id === current.id) || rows[0] || null;
    });

    setLoading(false);
  }

  async function handleCreatePreview() {
    if (!fileName.trim()) {
      setError('File name is required.');
      return;
    }

    if (!createdBy.trim()) {
      setError('Created by is required.');
      return;
    }

    if (!csvText.trim()) {
      setError('CSV data is required.');
      return;
    }

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

    setMessage('Import preview created successfully.');
    await loadPage();
    setLoading(false);
  }

  async function handlePostBatch(batch: ImportBatch) {
    const confirmed = window.confirm(
      `Post import batch ${batch.batchNo}? This will update stock items, balances, stock movements, QR tags and scaffold records.`,
    );

    if (!confirmed) return;

    setPostingId(batch.id);
    setError('');
    setMessage('');

    const result = await postAssetImportBatch(batch.id, createdBy || 'Asset Manager');

    if (!result.ok) {
      setError(result.error || 'Unable to post import batch.');
      setPostingId('');
      return;
    }

    setMessage(`Import batch ${batch.batchNo} posted successfully.`);
    await loadPage();
    setPostingId('');
  }

  const summary = useMemo(() => {
    return batches.reduce(
      (current, batch) => {
        const status = String(batch.status || '').toUpperCase();

        current.totalBatches += 1;
        current.totalRows += asNumber(batch.totalRows);
        current.validRows += asNumber(batch.validRows);
        current.warningRows += asNumber(batch.warningRows);
        current.errorRows += asNumber(batch.errorRows);
        current.postedRows += asNumber(batch.postedRows);

        if (status === 'VALIDATED') current.readyToPost += 1;
        if (status === 'POSTED') current.postedBatches += 1;

        return current;
      },
      {
        totalBatches: 0,
        readyToPost: 0,
        postedBatches: 0,
        totalRows: 0,
        validRows: 0,
        warningRows: 0,
        errorRows: 0,
        postedRows: 0,
      },
    );
  }, [batches]);

  if (!mounted) return null;

  return (
    <AppShell>
      <section className="finance-page">
        <div className="finance-card finance-hero-card">
          <div>
            <p className="eyebrow">Asset Management</p>
            <h1>Import Preview</h1>
            <p className="muted">
              Stage Omni Core, Excel or CSV stock data before posting into stock items, balances,
              stock movements, QR tags and scaffold component records.
            </p>
          </div>

          <button className="dark-button" type="button" onClick={loadPage}>
            Refresh
          </button>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}
        {message ? <div className="success-banner">{message}</div> : null}

        <div className="metric-grid">
          <div className="metric-card">
            <span>Total Batches</span>
            <strong>{summary.totalBatches}</strong>
          </div>

          <div className="metric-card">
            <span>Ready to Post</span>
            <strong>{summary.readyToPost}</strong>
          </div>

          <div className="metric-card">
            <span>Posted Batches</span>
            <strong>{summary.postedBatches}</strong>
          </div>

          <div className="metric-card">
            <span>Total Rows</span>
            <strong>{summary.totalRows}</strong>
          </div>

          <div className="metric-card">
            <span>Valid Rows</span>
            <strong>{summary.validRows}</strong>
          </div>

          <div className="metric-card">
            <span>Warnings</span>
            <strong>{summary.warningRows}</strong>
          </div>

          <div className="metric-card">
            <span>Errors</span>
            <strong>{summary.errorRows}</strong>
          </div>

          <div className="metric-card">
            <span>Posted Rows</span>
            <strong>{summary.postedRows}</strong>
          </div>
        </div>

        <div className="finance-card">
          <h2>Create Import Preview</h2>
          <p className="muted">
            Paste exported Omni Core stock data below. The preview stage validates the file before
            posting into the live Asset Management register.
          </p>

          <div className="form-grid">
            <label>
              Source Type
              <select value={sourceType} onChange={(event) => setSourceType(event.target.value)}>
                <option value="OMNI_CORE">OMNI_CORE</option>
                <option value="EXCEL">EXCEL</option>
                <option value="CSV">CSV</option>
                <option value="MANUAL">MANUAL</option>
              </select>
            </label>

            <label>
              File Name
              <input
                value={fileName}
                onChange={(event) => setFileName(event.target.value)}
                placeholder="omni-core-import.csv"
              />
            </label>

            <label>
              Created By
              <input
                value={createdBy}
                onChange={(event) => setCreatedBy(event.target.value)}
                placeholder="Asset Manager"
              />
            </label>
          </div>

          <label className="full-width-label">
            CSV Data
            <textarea
              className="large-textarea"
              value={csvText}
              onChange={(event) => setCsvText(event.target.value)}
              rows={8}
              placeholder="Paste exported CSV data here..."
            />
          </label>

          <button
            className="primary-action"
            type="button"
            onClick={handleCreatePreview}
            disabled={loading}
          >
            {loading ? 'Creating Preview...' : 'Create Preview'}
          </button>
        </div>

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
                  <th>Created By</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan={12}>
                      {loading ? 'Loading import batches...' : 'No import batches found.'}
                    </td>
                  </tr>
                ) : (
                  batches.map((batch) => {
                    const isPosted = String(batch.status).toUpperCase() === 'POSTED';
                    const isReady = String(batch.status).toUpperCase() === 'VALIDATED';
                    const isPosting = postingId === batch.id;

                    return (
                      <tr key={batch.id}>
                        <td>{batch.batchNo}</td>
                        <td>{batch.sourceType}</td>
                        <td>{batch.fileName}</td>
                        <td>
                          <span className={badgeClass(batch.status)}>{batch.status}</span>
                        </td>
                        <td>{asNumber(batch.totalRows)}</td>
                        <td>{asNumber(batch.validRows)}</td>
                        <td>{asNumber(batch.warningRows)}</td>
                        <td>{asNumber(batch.errorRows)}</td>
                        <td>{asNumber(batch.postedRows)}</td>
                        <td>{batch.createdBy || '-'}</td>
                        <td>{formatDate(batch.createdAt)}</td>
                        <td>
                          <div className="button-row">
                            <button
                              className="dark-button small"
                              type="button"
                              onClick={() => setSelectedBatch(batch)}
                            >
                              View
                            </button>

                            <button
                              className="primary-button small"
                              type="button"
                              disabled={!isReady || isPosted || isPosting}
                              onClick={() => handlePostBatch(batch)}
                            >
                              {isPosting ? 'Posting...' : 'Post'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedBatch ? (
          <div className="finance-card">
            <h2>Selected Batch Summary</h2>

            <div className="metric-grid">
              <div className="metric-card">
                <span>Batch No.</span>
                <strong>{selectedBatch.batchNo}</strong>
              </div>

              <div className="metric-card">
                <span>Source</span>
                <strong>{selectedBatch.sourceType}</strong>
              </div>

              <div className="metric-card">
                <span>File</span>
                <strong>{selectedBatch.fileName}</strong>
              </div>

              <div className="metric-card">
                <span>Status</span>
                <strong>{selectedBatch.status}</strong>
              </div>

              <div className="metric-card">
                <span>Total Rows</span>
                <strong>{asNumber(selectedBatch.totalRows)}</strong>
              </div>

              <div className="metric-card">
                <span>Valid Rows</span>
                <strong>{asNumber(selectedBatch.validRows)}</strong>
              </div>

              <div className="metric-card">
                <span>Warning Rows</span>
                <strong>{asNumber(selectedBatch.warningRows)}</strong>
              </div>

              <div className="metric-card">
                <span>Error Rows</span>
                <strong>{asNumber(selectedBatch.errorRows)}</strong>
              </div>

              <div className="metric-card">
                <span>Posted Rows</span>
                <strong>{asNumber(selectedBatch.postedRows)}</strong>
              </div>

              <div className="metric-card">
                <span>Posted By</span>
                <strong>{selectedBatch.postedBy || '-'}</strong>
              </div>

              <div className="metric-card">
                <span>Posted At</span>
                <strong>{formatDate(selectedBatch.postedAt)}</strong>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}