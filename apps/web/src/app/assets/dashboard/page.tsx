'use client';

import { useEffect, useRef, useState } from 'react';
import AppShell from '../../../components/AppShell';
import {
  AssetQrTag,
  getAssetQrTags,
  scanAssetQrTag,
} from '@/lib/assets-api';

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
      setError(result.error || 'Unable to load QR tag register.');
      setLoading(false);
      return;
    }

    setTags(result.data || []);
    setLoading(false);
  }

  async function handleScan(nextCode?: string) {
    const cleanCode = String(nextCode || tagCode || '').trim();

    if (!cleanCode) {
      setError('Enter or scan a QR tag code first.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    const result = await scanAssetQrTag(cleanCode, {
      scannedBy: scannedBy || 'Asset Manager',
      site: site || 'Unknown site',
    });

    if (!result.ok) {
      setError(result.error || `QR tag ${cleanCode} could not be scanned.`);
      setLoading(false);
      return;
    }

    setMessage(`QR tag ${cleanCode} scanned successfully.`);
    setTagCode(cleanCode);
    await loadTags();
    setLoading(false);
  }

  async function startCamera() {
    setError('');
    setCameraMessage('');

    if (!cameraSupported) {
      setCameraMessage(
        'Camera scanning is not available in this browser. Use manual QR entry.',
      );
      return;
    }

    if (!window.BarcodeDetector) {
      setCameraMessage(
        'This browser does not support built-in QR detection. Manual QR entry remains available.',
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
        },
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
        err instanceof Error
          ? err.message
          : 'Unable to open camera. Use manual QR entry.',
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

    const detector = new window.BarcodeDetector({
      formats: ['qr_code'],
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
        // Keep scanning quietly. Manual entry remains fallback.
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
  };

  if (!mounted) {
    return null;
  }

  return (
    <AppShell>
    <section className="finance-page">
      <div className="finance-card finance-hero-card">
        <div>
          <p className="eyebrow">Asset Management</p>
          <h1>QR Scan Centre</h1>
          <p className="muted">
            Manual QR scan entry for now, with camera QR scanning where supported by the browser.
          </p>
        </div>

        <button className="dark-button" type="button" onClick={loadTags}>
          Refresh
        </button>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}
      {message ? <div className="success-banner">{message}</div> : null}
      {cameraMessage ? <div className="warning-banner">{cameraMessage}</div> : null}

      <div className="metric-grid">
        <div className="metric-card">
          <span>Total QR Tags</span>
          <strong>{summary.total}</strong>
        </div>
        <div className="metric-card">
          <span>Available</span>
          <strong>{summary.available}</strong>
        </div>
        <div className="metric-card">
          <span>Issued</span>
          <strong>{summary.issued}</strong>
        </div>
        <div className="metric-card">
          <span>Damaged</span>
          <strong>{summary.damaged}</strong>
        </div>
      </div>

      <div className="finance-card">
        <h2>Scan QR Tag</h2>

        <div className="form-grid two">
          <label>
            QR Tag Code
            <input
              value={tagCode}
              onChange={(event) => setTagCode(event.target.value)}
              placeholder="QR-SCF-0001"
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

          <div className="button-row align-end">
            <button
              className="primary-button"
              type="button"
              disabled={loading}
              onClick={() => handleScan()}
            >
              {loading ? 'Scanning...' : 'Scan QR Tag'}
            </button>
          </div>
        </div>
      </div>

      <div className="finance-card">
        <div className="section-header-row">
          <div>
            <h2>Camera Scanner</h2>
            <p className="muted">
              Works on supported browsers. Manual entry remains the production fallback.
            </p>
          </div>

          <div className="button-row">
            {!cameraActive ? (
              <button className="dark-button" type="button" onClick={startCamera}>
                Start Camera
              </button>
            ) : (
              <button className="danger-button" type="button" onClick={stopCamera}>
                Stop Camera
              </button>
            )}
          </div>
        </div>

        <div className="camera-box">
          <video ref={videoRef} muted playsInline className="camera-video" />
          {!cameraActive ? (
            <div className="camera-placeholder">
              Camera inactive. Click Start Camera or use manual QR entry.
            </div>
          ) : null}
        </div>
      </div>

      <div className="finance-card">
        <h2>QR Tag Register</h2>

        <div className="table-wrap">
          <table className="data-table">
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
                  <td colSpan={8}>No QR tags found.</td>
                </tr>
              ) : (
                tags.map((tag) => (
                  <tr key={tag.id}>
                    <td>{tag.tagCode}</td>
                    <td>{tag.qrPayload}</td>
                    <td>{tag.stockItem?.itemName || '-'}</td>
                    <td>{tag.assignedLocation?.locationName || '-'}</td>
                    <td>
                      <span className="status-pill">{tag.status}</span>
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