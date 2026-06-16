'use client';

import AppShell from '@/components/AppShell';
import {
  AssetQrTag,
  getAssetQrTags,
  scanAssetTag,
  type ScanAssetTagPayload,
} from '@/lib/assets-api';
import { useEffect, useMemo, useRef, useState } from 'react';

type BarcodeDetectorResult = {
  rawValue: string;
};

type BarcodeDetectorInstance = {
  detect(source: HTMLVideoElement): Promise<BarcodeDetectorResult[]>;
};

type BarcodeDetectorConstructor = new (options?: {
  formats?: string[];
}) => BarcodeDetectorInstance;

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

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

function statusClass(status: string) {
  const upper = String(status || '').toUpperCase();

  if (['AVAILABLE', 'ACTIVE', 'POSTED', 'APPROVED'].includes(upper)) {
    return 'status-pill success';
  }

  if (['DAMAGED', 'LOST', 'RETIRED', 'REJECTED'].includes(upper)) {
    return 'status-pill danger';
  }

  return 'status-pill warning';
}

export default function AssetQrScanPage() {
  const [mounted, setMounted] = useState(false);
  const [tags, setTags] = useState<AssetQrTag[]>([]);
  const [tagCode, setTagCode] = useState('QR-SCF-0001');
  const [scanType, setScanType] = useState<ScanAssetTagPayload['scanType']>('QR_CODE');
  const [scannedBy, setScannedBy] = useState('Asset Manager');
  const [site, setSite] = useState('Kitwe Main Distribution Centre');
  const [message, setMessage] = useState('Ready to scan QR, RFID or barcode tag.');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [cameraSupported, setCameraSupported] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraMessage, setCameraMessage] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    setCameraSupported(
      typeof window !== 'undefined' &&
        typeof navigator !== 'undefined' &&
        Boolean(navigator.mediaDevices?.getUserMedia),
    );

    loadTags();

    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(() => {
    return {
      total: tags.length,
      available: tags.filter((tag) => tag.status === 'AVAILABLE').length,
      issued: tags.filter((tag) => tag.status === 'ISSUED').length,
      damaged: tags.filter((tag) => tag.status === 'DAMAGED').length,
      scanned: tags.filter((tag) => Boolean(tag.lastScannedAt)).length,
    };
  }, [tags]);

  async function loadTags() {
    setLoading(true);
    setError('');

    const result = await getAssetQrTags();

    if (!result.ok) {
      setError(result.error || 'Unable to load QR/RFID tag register.');
      setLoading(false);
      return;
    }

    setTags(result.data || []);
    setLoading(false);
  }

  async function handleScan(nextCode?: string) {
    const cleanCode = String(nextCode || tagCode || '').trim();

    if (!cleanCode) {
      setError('Enter or scan a tag code first.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    const result = await scanAssetTag({
      tagCode: cleanCode,
      scanType,
      scannedBy: scannedBy || 'Asset Manager',
      site: site || 'Unknown site',
    });

    if (!result.ok) {
      setError(result.error || `Tag ${cleanCode} could not be scanned.`);
      setLoading(false);
      return;
    }

    setTagCode(cleanCode);
    setMessage(`${scanType.replaceAll('_', ' ')} tag ${cleanCode} scanned successfully.`);
    await loadTags();
    setLoading(false);
  }

  async function startCamera() {
    setError('');
    setCameraMessage('');

    if (scanType !== 'QR_CODE') {
      setCameraMessage('Camera scanning is for QR codes. Use manual entry for UHF RFID and barcode scanner input.');
      return;
    }

    if (!cameraSupported) {
      setCameraMessage('Camera scanning is not available in this browser. Use manual QR entry.');
      return;
    }

    if (!window.BarcodeDetector) {
      setCameraMessage('This browser does not support built-in QR detection. Manual QR entry remains available.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);
      scanningRef.current = true;
      runCameraLoop();
    } catch (err) {
      setCameraMessage(
        err instanceof Error ? err.message : 'Unable to open camera. Use manual QR entry.',
      );
    }
  }

  function stopCamera() {
    scanningRef.current = false;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setCameraActive(false);
  }

  async function runCameraLoop() {
    if (!videoRef.current || !window.BarcodeDetector) return;

    const detector = new window.BarcodeDetector({ formats: ['qr_code'] });

    const loop = async () => {
      if (!scanningRef.current || !videoRef.current) return;

      try {
        const codes = await detector.detect(videoRef.current);
        const firstCode = codes[0]?.rawValue?.trim();

        if (firstCode) {
          scanningRef.current = false;
          stopCamera();
          setTagCode(firstCode);
          await handleScan(firstCode);
          return;
        }
      } catch {
        // Keep manual fallback available.
      }

      window.setTimeout(loop, 700);
    };

    loop();
  }

  if (!mounted) return null;

  return (
    <AppShell>
      <section className="page-stack finance-live-page">
        <div className="finance-live-card">
          <div className="finance-live-header">
            <div>
              <p className="eyebrow">Asset Management</p>
              <h1>QR / RFID Scan Centre</h1>
              <p className="muted">
                Unified scanning point for scaffold components, tools, stores stock, disposable
                equipment and high-value assets. QR scanning is active now; RFID support is prepared
                for UHF scanner integration.
              </p>
            </div>

            <button className="btn-secondary" type="button" onClick={loadTags}>
              Refresh
            </button>
          </div>

          {error && <div className="finance-notice danger">{error}</div>}
          {message && <div className="finance-notice success">{message}</div>}
          {cameraMessage && <div className="finance-notice warning">{cameraMessage}</div>}

          <div className="finance-summary-grid">
            <div className="finance-summary-card">
              <span>Total Tags</span>
              <strong>{summary.total}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Available</span>
              <strong>{summary.available}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Issued</span>
              <strong>{summary.issued}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Damaged</span>
              <strong>{summary.damaged}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Scanned</span>
              <strong>{summary.scanned}</strong>
            </div>
          </div>
        </div>

        <div className="finance-live-card">
          <h2>Scan Tag</h2>

          <div className="finance-form-grid">
            <label>
              Scan Type
              <select value={scanType} onChange={(event) => setScanType(event.target.value as ScanAssetTagPayload['scanType'])}>
                <option value="QR_CODE">QR Code</option>
                <option value="RFID_UHF">UHF RFID</option>
                <option value="BARCODE">Barcode</option>
              </select>
            </label>

            <label>
              Tag / EPC / Barcode Code
              <input
                value={tagCode}
                onChange={(event) => setTagCode(event.target.value)}
                placeholder="QR-SCF-0001 or RFID EPC"
              />
            </label>

            <label>
              Scanned By
              <input
                value={scannedBy}
                onChange={(event) => setScannedBy(event.target.value)}
                placeholder="Asset Manager"
              />
            </label>

            <label>
              Site
              <input
                value={site}
                onChange={(event) => setSite(event.target.value)}
                placeholder="Kitwe Main Distribution Centre"
              />
            </label>

            <button className="btn" type="button" disabled={loading} onClick={() => handleScan()}>
              {loading ? 'Scanning...' : 'Submit Scan'}
            </button>
          </div>
        </div>

        <div className="finance-live-card">
          <div className="finance-live-header">
            <div>
              <h2>Camera QR Scanner</h2>
              <p className="muted">
                Use this on supported mobile/tablet browsers. UHF RFID scanners can be added as
                keyboard-input or API-connected devices.
              </p>
            </div>

            <div className="finance-inline-actions">
              {!cameraActive ? (
                <button className="btn-secondary" type="button" onClick={startCamera}>
                  Start Camera
                </button>
              ) : (
                <button className="btn-secondary danger" type="button" onClick={stopCamera}>
                  Stop Camera
                </button>
              )}
            </div>
          </div>

          <div className="finance-table-wrap">
            <video
              ref={videoRef}
              muted
              playsInline
              style={{
                width: '100%',
                maxHeight: 320,
                borderRadius: 16,
                background: '#0f172a',
                display: cameraActive ? 'block' : 'none',
              }}
            />

            {!cameraActive && (
              <div className="finance-notice">
                Camera inactive. Click Start Camera or continue with manual QR/RFID entry.
              </div>
            )}
          </div>
        </div>

        <div className="finance-live-card">
          <h2>Tag Register</h2>

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
                  <tr>
                    <td colSpan={8}>{loading ? 'Loading tags...' : 'No tags found.'}</td>
                  </tr>
                ) : (
                  tags.map((tag) => (
                    <tr key={tag.id}>
                      <td>{tag.tagCode}</td>
                      <td>{tag.qrPayload || tag.barcodeValue || '-'}</td>
                      <td>{tag.stockItem?.itemName || '-'}</td>
                      <td>{tag.assignedLocation?.locationName || '-'}</td>
                      <td>
                        <span className={statusClass(tag.status)}>{tag.status}</span>
                      </td>
                      <td>{tag.lastScannedBy || '-'}</td>
                      <td>{tag.lastScanSite || '-'}</td>
                      <td>{formatDateTime(tag.lastScannedAt)}</td>
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