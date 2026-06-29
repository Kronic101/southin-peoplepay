'use client';

import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { getFleetInspections } from '../../../src/api/fleet';
import { useOfflineQueue } from '../../../src/hooks/useOfflineQueue';

type InspectionRecord = {
  id: string;
  vehicleId?: string | null;
  driverName?: string | null;
  inspectionDate?: string | null;
  odometer?: string | number | null;
  checklistPhase?: string | null;
  overallStatus?: string | null;
  notes?: string | null;
  payload?: any;
  createdAt?: string | null;
  vehicle?: {
    registrationNo?: string | null;
    make?: string | null;
    model?: string | null;
    site?: string | null;
  };
};

function parsePayload(payload: any) {
  if (!payload) {
    return {};
  }

  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload);
    } catch {
      return {};
    }
  }

  return payload;
}

function formatDate(value?: string | null) {
  if (!value) {
    return '-';
  }

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

function displayStatus(inspection: InspectionRecord) {
  const payload = parsePayload(inspection.payload);

  if (payload.businessStatus) {
    return payload.businessStatus;
  }

  if (payload.overallStatus) {
    return payload.overallStatus;
  }

  if (inspection.overallStatus === 'DEFECT_REPORTED') {
    return 'PASSED_WITH_DEFECTS';
  }

  return inspection.overallStatus || 'SUBMITTED';
}

function statusStyle(status: string) {
  const value = status.toUpperCase();

  if (value === 'PASSED') {
    return [styles.statusPill, styles.statusPassed];
  }

  if (value === 'PASSED_WITH_DEFECTS' || value === 'DEFECT_REPORTED') {
    return [styles.statusPill, styles.statusDefect];
  }

  if (value === 'FAILED') {
    return [styles.statusPill, styles.statusFailed];
  }

  return [styles.statusPill, styles.statusNeutral];
}

function vehicleLabel(inspection: InspectionRecord) {
  const registrationNo = inspection.vehicle?.registrationNo || '-';
  const vehicleName = [inspection.vehicle?.make, inspection.vehicle?.model]
    .filter(Boolean)
    .join(' ');

  return vehicleName ? `${registrationNo} â€¢ ${vehicleName}` : registrationNo;
}

export default function FleetInspectionHistoryPage() {
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    stats,
    syncing,
    lastSyncMessage,
    lastSyncError,
    syncQueue,
    refreshQueue,
  } = useOfflineQueue({
    autoSync: false,
    intervalMs: 30000,
  });

  const count = stats.total;
  const offlineMessage = lastSyncError || lastSyncMessage;

  const loadInspections = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await getFleetInspections();
      setInspections(Array.isArray(result) ? result : []);
      await refreshQueue();
    } catch (err: any) {
      setError(err?.message || 'Unable to load inspection history.');
    } finally {
      setLoading(false);
    }
  }, [refreshQueue]);

  useEffect(() => {
    loadInspections();
  }, [loadInspections]);

  const summary = useMemo(() => {
    const passed = inspections.filter((inspection) => displayStatus(inspection) === 'PASSED').length;
    const passedWithDefects = inspections.filter(
      (inspection) => displayStatus(inspection) === 'PASSED_WITH_DEFECTS',
    ).length;
    const failed = inspections.filter((inspection) => displayStatus(inspection) === 'FAILED').length;

    return {
      total: inspections.length,
      passed,
      passedWithDefects,
      failed,
    };
  }, [inspections]);

  async function handleSyncQueue() {
    await syncQueue();
    await loadInspections();
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadInspections} />
      }
    >
      <View style={styles.topBar}>
        <Text style={styles.topBarText}>fleet/inspections</Text>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Fleet Management</Text>
        <Text style={styles.title}>Inspection History</Text>
        <Text style={styles.muted}>
          View submitted pre-start inspections, safety status, advisory defects and failed inspections.
        </Text>

        <View style={styles.heroActions}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/fleet/inspections/new')}
          >
            <Text style={styles.secondaryButtonText}>New Inspection</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleSyncQueue}
            disabled={syncing}
          >
            <Text style={styles.secondaryButtonText}>
              {syncing ? 'Syncing...' : 'Sync Offline'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {error ? <Text style={styles.errorBox}>{error}</Text> : null}
      {lastSyncMessage ? <Text style={styles.successBox}>{lastSyncMessage}</Text> : null}
      {lastSyncError ? <Text style={styles.warningBox}>{lastSyncError}</Text> : null}

      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={styles.summaryValue}>{summary.total}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Passed</Text>
          <Text style={styles.summaryValue}>{summary.passed}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>With Defects</Text>
          <Text style={styles.summaryValue}>{summary.passedWithDefects}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Failed</Text>
          <Text style={styles.summaryValue}>{summary.failed}</Text>
        </View>
      </View>

      <View style={styles.queueCard}>
        <View>
          <Text style={styles.cardTitle}>Offline Queue</Text>
          <Text style={styles.muted}>
            {stats.total === 0
              ? 'No offline submissions pending.'
              : `${stats.total} record(s) waiting to sync.`}
          </Text>
        </View>

        {stats.total > 0 ? (
          <TouchableOpacity style={styles.primaryButtonSmall} onPress={handleSyncQueue}>
            <Text style={styles.primaryButtonText}>Sync Now</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent Inspections</Text>

        {loading && !inspections.length ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading inspections...</Text>
          </View>
        ) : null}

        {!loading && inspections.length === 0 ? (
          <Text style={styles.emptyText}>No inspections submitted yet.</Text>
        ) : null}

        {inspections.map((inspection) => {
          const payload = parsePayload(inspection.payload);
          const status = displayStatus(inspection);
          const failedItems = Array.isArray(payload.failedItems) ? payload.failedItems : [];
          const blockingFailedItems = Array.isArray(payload.blockingFailedItems)
            ? payload.blockingFailedItems
            : [];

          return (
            <View key={inspection.id} style={styles.inspectionCard}>
              <View style={styles.inspectionHeader}>
                <View style={styles.inspectionTitleBlock}>
                  <Text style={styles.vehicleText}>{vehicleLabel(inspection)}</Text>
                  <Text style={styles.muted}>
                    {formatDate(inspection.inspectionDate || inspection.createdAt)}
                  </Text>
                </View>

                <View style={statusStyle(status)}>
                  <Text style={styles.statusText}>{status.replace(/_/g, ' ')}</Text>
                </View>
              </View>

              <View style={styles.detailGrid}>
                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>Driver</Text>
                  <Text style={styles.detailValue}>{inspection.driverName || '-'}</Text>
                </View>

                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>Odometer</Text>
                  <Text style={styles.detailValue}>{inspection.odometer || '-'}</Text>
                </View>

                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>Safe for Use</Text>
                  <Text style={styles.detailValue}>
                    {payload.safeForUse === false ? 'NO' : 'YES'}
                  </Text>
                </View>

                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>Failed Items</Text>
                  <Text style={styles.detailValue}>{failedItems.length}</Text>
                </View>
              </View>

              {failedItems.length > 0 ? (
                <View style={styles.failedBox}>
                  <Text style={styles.failedTitle}>Defect Items</Text>

                  {failedItems.map((item: any, index: number) => (
                    <Text key={`${inspection.id}-failed-${index}`} style={styles.failedItem}>
                      {item.no}. {item.label} â€¢ {item.severity || 'MEDIUM'}
                      {item.blocksUse ? ' â€¢ Blocks use' : ' â€¢ Advisory'}
                      {item.comments ? ` â€” ${item.comments}` : ''}
                    </Text>
                  ))}

                  {blockingFailedItems.length > 0 ? (
                    <Text style={styles.blockingText}>
                      Vehicle use blocked until Fleet clears the critical defect.
                    </Text>
                  ) : (
                    <Text style={styles.advisoryText}>
                      Vehicle remains safe for use. Advisory defect created for Fleet follow-up.
                    </Text>
                  )}
                </View>
              ) : null}

              {inspection.notes ? (
                <Text style={styles.notesText}>Notes: {inspection.notes}</Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#eef5fb',
  },
  content: {
    paddingBottom: 40,
  },
  topBar: {
    backgroundColor: '#07152b',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  topBarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    margin: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#d7e2ee',
  },
  eyebrow: {
    color: '#f26522',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    color: '#07152b',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
  },
  muted: {
    color: '#536173',
    fontSize: 14,
    lineHeight: 20,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    flexWrap: 'wrap',
  },
  secondaryButton: {
    backgroundColor: '#07152b',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  primaryButtonSmall: {
    backgroundColor: '#f26522',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  errorBox: {
    backgroundColor: '#ffe2e2',
    borderColor: '#f5a3a3',
    borderWidth: 1,
    color: '#991b1b',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    fontWeight: '800',
  },
  successBox: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
    borderWidth: 1,
    color: '#166534',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    fontWeight: '800',
  },
  warningBox: {
    backgroundColor: '#ffedd5',
    borderColor: '#fdba74',
    borderWidth: 1,
    color: '#9a3412',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    fontWeight: '800',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d7e2ee',
    padding: 14,
    width: '47.5%',
  },
  summaryLabel: {
    color: '#5f6f84',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summaryValue: {
    color: '#07152b',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 6,
  },
  queueCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#d7e2ee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    marginHorizontal: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#d7e2ee',
  },
  cardTitle: {
    color: '#07152b',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 10,
  },
  loadingRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptyText: {
    color: '#536173',
    paddingVertical: 16,
  },
  inspectionCard: {
    borderWidth: 1,
    borderColor: '#d7e2ee',
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    backgroundColor: '#f8fbff',
  },
  inspectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'flex-start',
  },
  inspectionTitleBlock: {
    flex: 1,
  },
  vehicleText: {
    color: '#07152b',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusPassed: {
    backgroundColor: '#dcfce7',
  },
  statusDefect: {
    backgroundColor: '#ffedd5',
  },
  statusFailed: {
    backgroundColor: '#fee2e2',
  },
  statusNeutral: {
    backgroundColor: '#e8eef6',
  },
  statusText: {
    color: '#07152b',
    fontSize: 11,
    fontWeight: '900',
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  detailBox: {
    width: '47.5%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d7e2ee',
    borderRadius: 12,
    padding: 10,
  },
  detailLabel: {
    color: '#5f6f84',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  detailValue: {
    color: '#07152b',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 4,
  },
  failedBox: {
    marginTop: 14,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d7e2ee',
    padding: 12,
  },
  failedTitle: {
    color: '#07152b',
    fontWeight: '900',
    marginBottom: 8,
  },
  failedItem: {
    color: '#334155',
    marginBottom: 6,
    lineHeight: 19,
  },
  blockingText: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    fontWeight: '900',
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  advisoryText: {
    backgroundColor: '#dcfce7',
    color: '#166534',
    fontWeight: '900',
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  notesText: {
    marginTop: 12,
    color: '#334155',
    fontWeight: '700',
  },
});
