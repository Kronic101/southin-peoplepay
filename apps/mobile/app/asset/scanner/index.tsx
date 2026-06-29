'use client';

import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  AssetQrTagRecord,
  AssetScanResult,
  getAssetQrTags,
  scanAssetQrTag,
} from '../../../src/api/assets';
import { useDriverIdentity } from '../../../src/hooks/useDriverIdentity';
import { useOfflineQueue } from '../../../src/hooks/useOfflineQueue';
import { enqueueOfflineRequest } from '../../../src/storage/offlineQueue';

function clean(value: unknown) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function normalize(value: string) {
  return value.replace(/\s+/g, '').toUpperCase();
}

function formatDate(value?: string | null) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('en-ZM', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isNetworkError(err: any) {
  const message = String(err?.message || '').toLowerCase();

  return (
    message.includes('failed to fetch') ||
    message.includes('network request failed') ||
    message.includes('networkerror') ||
    message.includes('load failed')
  );
}

function statusStyle(status?: string | null) {
  const value = String(status || '').toUpperCase();

  if (['ACTIVE', 'AVAILABLE', 'ASSIGNED', 'POSTED'].includes(value)) {
    return [styles.statusPill, styles.statusSuccess];
  }

  if (['PENDING', 'IN_USE', 'IN_TRANSIT', 'SCANNED'].includes(value)) {
    return [styles.statusPill, styles.statusWarning];
  }

  if (['DAMAGED', 'LOST', 'INACTIVE', 'BLOCKED'].includes(value)) {
    return [styles.statusPill, styles.statusDanger];
  }

  return [styles.statusPill, styles.statusNeutral];
}

export default function AssetScannerPage() {
  const [permission, requestPermission] = useCameraPermissions();

  const { identity } = useDriverIdentity();

  const {
    stats,
    syncing,
    lastSyncMessage,
    lastSyncError,
    refreshQueue,
    syncQueue,
  } = useOfflineQueue({
    autoSync: false,
  });

  const [qrTags, setQrTags] = useState<AssetQrTagRecord[]>([]);
  const [manualTagCode, setManualTagCode] = useState('');
  const [searchText, setSearchText] = useState('');
  const [notes, setNotes] = useState('');
  const [locationName, setLocationName] = useState('');
  const [scanMode, setScanMode] = useState<'CAMERA' | 'MANUAL'>('MANUAL');

  const [cameraActive, setCameraActive] = useState(false);
  const [scanLocked, setScanLocked] = useState(false);

  const [loading, setLoading] = useState(false);
  const [submittingTag, setSubmittingTag] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [lastScan, setLastScan] = useState<AssetScanResult | null>(null);

  const filteredTags = useMemo(() => {
    const search = normalize(searchText);

    if (!search) {
      return qrTags.slice(0, 20);
    }

    return qrTags
      .filter((tag) => {
        const stockName = clean(tag.stockItem?.itemName);
        const stockCode = clean(tag.stockItem?.itemCode);
        const location = clean(tag.location?.locationName);

        return (
          normalize(tag.tagCode || '').includes(search) ||
          normalize(stockName).includes(search) ||
          normalize(stockCode).includes(search) ||
          normalize(location).includes(search)
        );
      })
      .slice(0, 20);
  }, [qrTags, searchText]);

  async function loadQrTags() {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const result = await getAssetQrTags();
      setQrTags(result || []);
      await refreshQueue();
    } catch (err: any) {
      setError(err?.message || 'Unable to load asset QR tags.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLocationName(identity.site || 'Kitwe Main Distribution Centre');
  }, [identity.site]);

  useEffect(() => {
    loadQrTags();
  }, []);

  function buildPayload(tagCode: string) {
    const finalTagCode = clean(tagCode);

    if (!finalTagCode) {
      throw new Error('Asset tag code is required.');
    }

    return {
      tagCode: finalTagCode,
      scanType: 'MOBILE_SCAN',
      scanSource: 'MOBILE_ASSET_SCANNER',
      scannedBy: identity.submittedBy || identity.driverName || 'Mobile User',
      employeeNo: identity.employeeNo || undefined,
      employeeNumber: identity.employeeNumber || undefined,
      department: identity.department || 'Operations',
      site: identity.site || 'Kitwe Main Distribution Centre',
      locationName: clean(locationName) || identity.site || 'Kitwe Main Distribution Centre',
      notes: clean(notes) || undefined,
      submittedFrom: 'MOBILE',
      scannedAt: new Date().toISOString(),
    };
  }

  async function submitScan(tagCode: string) {
    setSubmittingTag(tagCode);
    setMessage('');
    setError('');
    setLastScan(null);

    try {
      const finalTagCode = clean(tagCode);
      const payload = buildPayload(finalTagCode);

      try {
        const result = await scanAssetQrTag(finalTagCode, payload);

        setLastScan(result || null);
        setMessage(`Asset tag ${finalTagCode} scanned successfully.`);
        setManualTagCode('');
        setNotes('');
        await loadQrTags();
      } catch (err: any) {
        if (isNetworkError(err)) {
          await enqueueOfflineRequest({
            type: 'ASSET_SCAN',
            path: `/assets/qr-tags/${encodeURIComponent(finalTagCode)}/scan`,
            method: 'POST',
            payload,
          });

          setMessage(`Asset tag ${finalTagCode} saved offline. It will sync when signal is available.`);
          setManualTagCode('');
          setNotes('');
          await refreshQueue();
          return;
        }

        throw err;
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to submit asset scan.');
    } finally {
      setSubmittingTag('');
      setTimeout(() => {
        setScanLocked(false);
      }, 1200);
    }
  }

  async function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (scanLocked || submittingTag) {
      return;
    }

    const scannedValue = clean(result.data);

    if (!scannedValue) {
      return;
    }

    setScanLocked(true);
    setManualTagCode(scannedValue);
    await submitScan(scannedValue);
  }

  async function handleManualSubmit() {
    await submitScan(manualTagCode);
  }

  async function handleSyncQueue() {
    setMessage('');
    setError('');

    try {
      const result = await syncQueue();

      if (result.synced.length > 0) {
        setMessage(`${result.synced.length} offline asset record(s) synced successfully.`);
        await loadQrTags();
      } else if (result.remaining.length > 0) {
        setError(`${result.remaining.length} offline record(s) still pending sync.`);
      } else {
        setMessage('No offline records pending sync.');
      }
    } catch (err: any) {
      setError(err?.message || 'Offline sync failed.');
    }
  }

  async function handleOpenCamera() {
    setMessage('');
    setError('');

    if (!permission?.granted) {
      const result = await requestPermission();

      if (!result.granted) {
        setError('Camera permission is required for QR scanning. You can still use manual tag entry.');
        setScanMode('MANUAL');
        return;
      }
    }

    setScanMode('CAMERA');
    setCameraActive(true);
    setScanLocked(false);
  }

  const offlineMessage = lastSyncError || lastSyncMessage;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadQrTags} />}
    >
      <View style={styles.mobileTopBar}>
        <Text style={styles.mobileTopBarText}>assets/scanner</Text>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Asset Management</Text>
        <Text style={styles.heroTitle}>Asset Scanner</Text>
        <Text style={styles.heroText}>
          Scan QR or barcode tags for stock, tools, scaffold components and asset custody
          verification. Scans are linked to the logged-in mobile user.
        </Text>

        <View style={styles.heroActions}>
          <Pressable style={styles.darkButton} onPress={handleOpenCamera}>
            <Text style={styles.darkButtonText}>Open Camera</Text>
          </Pressable>

          <Pressable
            style={styles.lightButton}
            onPress={() => {
              setScanMode('MANUAL');
              setCameraActive(false);
            }}
          >
            <Text style={styles.lightButtonText}>Manual Entry</Text>
          </Pressable>
        </View>
      </View>

      {message ? (
        <View style={styles.successNotice}>
          <Text style={styles.successText}>{message}</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorNotice}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {offlineMessage ? (
        <View style={lastSyncError ? styles.errorNotice : styles.warningNotice}>
          <Text style={lastSyncError ? styles.errorText : styles.warningText}>
            {offlineMessage}
          </Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Scanner Mode</Text>

        <View style={styles.modeRow}>
          <Pressable
            style={[styles.modeButton, scanMode === 'CAMERA' ? styles.modeButtonActive : null]}
            onPress={handleOpenCamera}
          >
            <Text style={styles.modeButtonText}>Camera</Text>
          </Pressable>

          <Pressable
            style={[styles.modeButton, scanMode === 'MANUAL' ? styles.modeButtonActive : null]}
            onPress={() => {
              setScanMode('MANUAL');
              setCameraActive(false);
            }}
          >
            <Text style={styles.modeButtonText}>Manual</Text>
          </Pressable>
        </View>

        {scanMode === 'CAMERA' && cameraActive ? (
          <View style={styles.cameraWrap}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['qr', 'code128', 'ean13', 'ean8'],
              }}
              onBarcodeScanned={scanLocked ? undefined : handleBarcodeScanned}
            >
              <View style={styles.cameraOverlay}>
                <View style={styles.scanFrame} />
                <Text style={styles.cameraHelpText}>
                  Place the asset QR/barcode inside the frame.
                </Text>
              </View>
            </CameraView>

            <Pressable
              style={styles.stopCameraButton}
              onPress={() => {
                setCameraActive(false);
                setScanMode('MANUAL');
                setScanLocked(false);
              }}
            >
              <Text style={styles.stopCameraButtonText}>Stop Camera</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.manualBox}>
            <Text style={styles.label}>Asset Tag / QR Code</Text>
            <TextInput
              style={styles.input}
              value={manualTagCode}
              onChangeText={setManualTagCode}
              placeholder="e.g. QR-STK-0001 or ASSET-0001"
              autoCapitalize="characters"
            />

            <Text style={styles.label}>Scan Location</Text>
            <TextInput
              style={styles.input}
              value={locationName}
              onChangeText={setLocationName}
              placeholder="e.g. Kitwe Main Distribution Centre"
            />

            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional scan notes"
              multiline
            />

            <Pressable
              style={[styles.submitButton, submittingTag ? styles.disabledButton : null]}
              onPress={handleManualSubmit}
              disabled={Boolean(submittingTag)}
            >
              {submittingTag ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Asset Scan</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>

      {lastScan ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Last Scan Result</Text>

          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>
              {lastScan.qrTag?.tagCode || lastScan.tag?.tagCode || lastScan.tagCode || manualTagCode || '-'}
            </Text>

            <Text style={styles.resultText}>
              Item:{' '}
              {lastScan.qrTag?.stockItem?.itemName ||
                lastScan.tag?.stockItem?.itemName ||
                lastScan.stockItem?.itemName ||
                '-'}
            </Text>

            <Text style={styles.resultText}>
              Location:{' '}
              {lastScan.qrTag?.location?.locationName ||
                lastScan.tag?.location?.locationName ||
                lastScan.location?.locationName ||
                locationName ||
                '-'}
            </Text>

            <Text style={styles.resultText}>
              Message: {lastScan.message || 'Scan captured successfully.'}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Offline Queue</Text>
            <Text style={styles.muted}>
              {stats.assets === 0
                ? 'No asset records waiting to sync.'
                : `${stats.assets} asset record(s) waiting to sync.`}
            </Text>
          </View>

          <Pressable style={styles.smallDarkButton} onPress={handleSyncQueue} disabled={syncing}>
            {syncing ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.smallDarkButtonText}>Sync</Text>
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Find Existing Tags</Text>

        <TextInput
          style={styles.input}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search tag, item, stock code or location"
          autoCapitalize="characters"
        />

        {loading && qrTags.length === 0 ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading asset tags...</Text>
          </View>
        ) : null}

        {!loading && qrTags.length === 0 ? (
          <Text style={styles.emptyText}>No asset QR tags found.</Text>
        ) : null}

        {filteredTags.map((tag) => (
          <View key={tag.id} style={styles.tagRow}>
            <View style={styles.tagTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.tagTitle}>{tag.tagCode}</Text>
                <Text style={styles.tagMeta}>
                  {tag.stockItem?.itemName || tag.stockItem?.itemCode || 'Unassigned tag'}
                </Text>
              </View>

              <View style={statusStyle(tag.status)}>
                <Text style={styles.statusText}>{tag.status || 'ACTIVE'}</Text>
              </View>
            </View>

            <View style={styles.detailGrid}>
              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>Type</Text>
                <Text style={styles.detailValue}>{tag.tagType || '-'}</Text>
              </View>

              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>
                  {tag.location?.locationName || tag.location?.site || '-'}
                </Text>
              </View>

              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>Last Scan</Text>
                <Text style={styles.detailValue}>{formatDate(tag.lastScannedAt)}</Text>
              </View>

              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>Stock Code</Text>
                <Text style={styles.detailValue}>{tag.stockItem?.itemCode || '-'}</Text>
              </View>
            </View>

            <Pressable
              style={styles.scanExistingButton}
              onPress={() => submitScan(tag.tagCode)}
              disabled={Boolean(submittingTag)}
            >
              {submittingTag === tag.tagCode ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.scanExistingButtonText}>Scan This Tag</Text>
              )}
            </Pressable>
          </View>
        ))}
      </View>

      <View style={styles.footerCard}>
        <Text style={styles.footerTitle}>Next Asset Step</Text>
        <Text style={styles.footerText}>
          After scanner testing passes, we will connect mobile stock movements and mobile stock
          counts to complete field asset control.
        </Text>

        <Pressable style={styles.profileButton} onPress={() => router.push('/dashboard')}>
          <Text style={styles.profileButtonText}>Back to Dashboard</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#eaf1f7',
  },
  content: {
    paddingBottom: 32,
  },
  mobileTopBar: {
    backgroundColor: '#06152b',
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  mobileTopBarText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 18,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ccd8e5',
  },
  eyebrow: {
    color: '#f26a21',
    textTransform: 'uppercase',
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
  },
  heroTitle: {
    color: '#06152b',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
  },
  heroText: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 22,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  darkButton: {
    flex: 1,
    backgroundColor: '#06152b',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  darkButtonText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  lightButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  lightButtonText: {
    color: '#06152b',
    fontWeight: '900',
  },
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ccd8e5',
  },
  sectionTitle: {
    color: '#06152b',
    fontSize: 21,
    fontWeight: '900',
    marginBottom: 12,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  modeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#ffedd5',
    borderColor: '#fdba74',
  },
  modeButtonText: {
    color: '#06152b',
    fontWeight: '900',
  },
  cameraWrap: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#06152b',
  },
  camera: {
    height: 320,
    width: '100%',
  },
  cameraOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  scanFrame: {
    width: 220,
    height: 220,
    borderWidth: 3,
    borderColor: '#f26a21',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  cameraHelpText: {
    color: '#ffffff',
    fontWeight: '900',
    marginTop: 18,
    textAlign: 'center',
  },
  stopCameraButton: {
    backgroundColor: '#f26a21',
    paddingVertical: 14,
    alignItems: 'center',
  },
  stopCameraButtonText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  manualBox: {
    marginTop: 2,
  },
  label: {
    color: '#06152b',
    fontWeight: '900',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#06152b',
    fontSize: 16,
    marginBottom: 10,
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#f26a21',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 16,
  },
  successNotice: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },
  successText: {
    color: '#166534',
    fontWeight: '900',
  },
  warningNotice: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: '#fff7ed',
    borderColor: '#fdba74',
  },
  warningText: {
    color: '#9a3412',
    fontWeight: '900',
  },
  errorNotice: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
  },
  errorText: {
    color: '#991b1b',
    fontWeight: '900',
  },
  resultBox: {
    backgroundColor: '#f8fafc',
    borderColor: '#d7e1ed',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  resultTitle: {
    color: '#06152b',
    fontWeight: '900',
    fontSize: 18,
    marginBottom: 8,
  },
  resultText: {
    color: '#475569',
    fontWeight: '800',
    marginBottom: 5,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  muted: {
    color: '#64748b',
    fontWeight: '700',
  },
  smallDarkButton: {
    backgroundColor: '#06152b',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  smallDarkButtonText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 18,
  },
  emptyText: {
    color: '#64748b',
    fontWeight: '800',
    paddingVertical: 12,
  },
  tagRow: {
    borderWidth: 1,
    borderColor: '#d7e1ed',
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    backgroundColor: '#f8fafc',
  },
  tagTopRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tagTitle: {
    color: '#06152b',
    fontWeight: '900',
    fontSize: 16,
  },
  tagMeta: {
    color: '#64748b',
    fontWeight: '700',
    marginTop: 3,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusSuccess: {
    backgroundColor: '#dcfce7',
  },
  statusWarning: {
    backgroundColor: '#ffedd5',
  },
  statusDanger: {
    backgroundColor: '#fee2e2',
  },
  statusNeutral: {
    backgroundColor: '#e2e8f0',
  },
  statusText: {
    color: '#06152b',
    fontWeight: '900',
    fontSize: 11,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  detailBox: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 10,
  },
  detailLabel: {
    color: '#64748b',
    fontWeight: '900',
    textTransform: 'uppercase',
    fontSize: 10,
    letterSpacing: 1,
  },
  detailValue: {
    color: '#06152b',
    fontWeight: '900',
    marginTop: 4,
  },
  scanExistingButton: {
    backgroundColor: '#06152b',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 14,
  },
  scanExistingButtonText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  footerCard: {
    backgroundColor: '#06152b',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 18,
    borderRadius: 18,
  },
  footerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
  },
  footerText: {
    color: '#cbd5e1',
    fontWeight: '700',
    lineHeight: 20,
  },
  profileButton: {
    backgroundColor: '#f26a21',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 14,
  },
  profileButtonText: {
    color: '#ffffff',
    fontWeight: '900',
  },
});
