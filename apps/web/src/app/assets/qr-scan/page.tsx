'use client';

import { useEffect, useRef, useState } from 'react';
import AppShell from '../../../components/AppShell';
import { AssetQrTag, getAssetQrTags, scanAssetQrTag } from '@/lib/assets-api';

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

export default function AssetQrScanPage() {
  const [mounted, setMounted] = useState(false);
  const [tags, setTags] = useState<AssetQrTag[]>([]);
  const [tagCode, setTagCode] = useState('QR-SCF-0001');
  const [scanType, setScanType] = useState<'QR' | 'RFID' | 'BARCODE'>('QR');
  const [scannedBy, setScannedBy] = useState('Asset Manager');
  const [site, setSite] = useState('Kitwe Main Distribution Centre');
  const [message, setMessage] = useState('');
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

  async function loadTags() {
    setLoading(true);
    setError('');
    setMessage('');

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
      setError('Enter or scan a QR/RFID/barcode tag first.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    const result = await scanAssetQrTag(cleanCode, {
      scannedBy: scannedBy || 'Asset Manager',
      site: site || 'Unknown site',
      scanType,
    } as any);

    if (!result.ok) {
      setError(result.error || `Tag ${cleanCode} could not be scanned.`);
      setLoading(false);
      return;
    }

    setMessage(`${scanType} tag ${cleanCode} scanned successfully.`);
    setTagCode(cleanCode);
    await loadTags();
    setLoading(false);
  }

  async function startCamera() {
    setError('');
    setCameraMessage('');

    if (!cameraSupported) {
      setCameraMessage('Camera scanning is not available in this browser. Use manual entry.');
      return;
    }

    if (!window.BarcodeDetector) {
      setCameraMessage(
        'This browser does not support built-in QR detection. Manual QR/RFID/barcode entry remains available.',
      );
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
      setCameraMessage(err instanceof Error ? err.message : 'Unable to open camera.');
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

    const detector = new window.BarcodeDetector({
      formats: ['qr_code', 'code_128', 'code_39'],
    });

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
        // Keep scanner quiet; manual entry remains available.
      }

      window.setTimeout(loop, 700);
    };

    loop();
  }

  const summary = {
    total: tags.length,
    available: tags.filter((tag) => tag.status === 'AVAILABLE').length,
    issued: tags.filter((tag) => tag.status === 'ISSUED').length,
    damaged: tags.filter((tag) => tag.status === 'DAMAGED').length,
    scanned: tags.filter((tag) => tag.lastScannedAt).length,
  };

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
                for UHF scanner input.
              </p>
            </div>

            <button className="btn-secondary" type="button" onClick={loadTags}>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {error ? <div className="finance-notice danger">{error}</div> : null}
          {message ? <div className="finance-notice success">{message}</div> : null}
          {cameraMessage ? <div className="finance-notice warning">{cameraMessage}</div> : null}

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
              <select value={scanType} onChange={(event) => setScanType(event.target.value as any)}>
                <option value="QR">QR Code</option>
                <option value="RFID">RFID / UHF Tag</option>
                <option value="BARCODE">Barcode</option>
              </select>
            </label>

            <label>
              Tag / EPC / Barcode Code
              <input
                value={tagCode}
                onChange={(event) => setTagCode(event.target.value)}
                placeholder="QR-SCF-0001 or RFID EPC code"
              />
            </label>

            <label>
              Scanned By
              <input value={scannedBy} onChange={(event) => setScannedBy(event.target.value)} />
            </label>

            <label>
              Site
              <input value={site} onChange={(event) => setSite(event.target.value)} />
            </label>

            <button className="btn" type="button" disabled={loading} onClick={() => handleScan()}>
              {loading ? 'Submitting...' : 'Submit Scan'}
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

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-secondary" type="button" onClick={startCamera}>
                Start Camera
              </button>

              {cameraActive ? (
                <button className="btn-secondary" type="button" onClick={stopCamera}>
                  Stop Camera
                </button>
              ) : null}
            </div>
          </div>

          <div className="finance-camera-box">
            <video
              ref={videoRef}
              muted
              playsInline
              style={{
                width: '100%',
                maxHeight: 320,
                borderRadius: 14,
                background: '#020617',
                display: cameraActive ? 'block' : 'none',
              }}
            />

            {!cameraActive ? (
              <div className="finance-notice warning">
                Camera inactive. Click Start Camera or continue with manual QR/RFID entry.
              </div>
            ) : null}
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
                        <span className="status-pill">{tag.status || '-'}</span>
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