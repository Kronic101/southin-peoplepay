'use client';

import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { closeFleetDefect, getFleetDefects } from '../../../src/api/fleet';
import { useOfflineQueue } from '../../../src/hooks/useOfflineQueue';

type DefectRecord = {
  id: string;
  defectNo?: string | null;
  vehicleId?: string | null;
  title?: string | null;
  description?: string | null;
  severity?: string | null;
  status?: string | null;
  reportedBy?: string | null;
  reportedAt?: string | null;
  createdAt?: string | null;
  closedAt?: string | null;
  odometer?: string | number | null;
  location?: string | null;
  vehicle?: {
    registrationNo?: string | null;
    make?: string | null;
    model?: string | null;
    site?: string | null;
  } | null;
};

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

function statusStyle(status?: string | null) {
  const value = String(status || '').toUpperCase();

  if (['CLOSED', 'RESOLVED', 'COMPLETED'].includes(value)) {
    return [styles.statusPill, styles.statusSuccess];
  }

  if (['OPEN', 'REPORTED', 'IN_PROGRESS'].includes(value)) {
    return [styles.statusPill, styles.statusWarning];
  }

  return [styles.statusPill, styles.statusNeutral];
}

function severityStyle(severity?: string | null) {
  const value = String(severity || '').toUpperCase();

  if (['CRITICAL', 'HIGH'].includes(value)) {
    return [styles.severityPill, styles.severityDanger];
  }

  if (['MEDIUM'].includes(value)) {
    return [styles.severityPill, styles.severityWarning];
  }

  return [styles.severityPill, styles.severityNeutral];
}

export default function FleetDefectsPage() {
  const [defects, setDefects] = useState<DefectRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [closingId, setClosingId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const { stats, lastSyncMessage, lastSyncError, refreshQueue } = useOfflineQueue({
    autoSync: false,
    intervalMs: 30000,
  });

  const summary = useMemo(() => {
    const open = defects.filter((item) =>
      ['OPEN', 'REPORTED', 'IN_PROGRESS'].includes(String(item.status || '').toUpperCase()),
    ).length;

    const high = defects.filter((item) =>
      ['CRITICAL', 'HIGH'].includes(String(item.severity || '').toUpperCase()),
    ).length;

    const closed = defects.filter((item) =>
      ['CLOSED', 'RESOLVED', 'COMPLETED'].includes(String(item.status || '').toUpperCase()),
    ).length;

    return {
      total: defects.length,
      open,
      high,
      closed,
    };
  }, [defects]);

  async function loadDefects() {
    setLoading(true);
    setError('');

    try {
      const result = await getFleetDefects();
      setDefects((result || []) as DefectRecord[]);
      await refreshQueue();
    } catch (err: any) {
      setError(err?.message || 'Unable to load defects.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCloseDefect(id: string) {
    setClosingId(id);
    setMessage('');
    setError('');

    try {
      await closeFleetDefect(id, {
        status: 'CLOSED',
        closedBy: 'Fleet Driver',
        actionTaken: 'Resolved from mobile defect register.',
      });

      setMessage('Defect closed successfully.');
      await loadDefects();
    } catch (err: any) {
      setError(err?.message || 'Unable to close defect.');
    } finally {
      setClosingId('');
    }
  }

  useEffect(() => {
    loadDefects();
  }, []);

  const offlineMessage = lastSyncError || lastSyncMessage;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadDefects} />}
    >
      <View style={styles.mobileTopBar}>
        <Text style={styles.mobileTopBarText}>fleet/defects</Text>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Fleet Management</Text>
        <Text style={styles.heroTitle}>Vehicle Defects</Text>
        <Text style={styles.heroText}>
          View defects raised from inspections and manually reported vehicle issues. Critical
          defects should be escalated before the vehicle is used.
        </Text>

        <View style={styles.heroActions}>
          <Pressable style={styles.darkButton} onPress={() => router.push('/fleet/defects/new')}>
            <Text style={styles.darkButtonText}>Raise Defect</Text>
          </Pressable>

          <Pressable style={styles.lightButton} onPress={loadDefects}>
            <Text style={styles.lightButtonText}>Refresh</Text>
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

      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={styles.summaryValue}>{summary.total}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Open</Text>
          <Text style={styles.summaryValue}>{summary.open}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>High/Critical</Text>
          <Text style={styles.summaryValue}>{summary.high}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Closed</Text>
          <Text style={styles.summaryValue}>{summary.closed}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Offline Queue</Text>
            <Text style={styles.muted}>
              {stats.defects === 0
                ? 'No defect records waiting to sync.'
                : `${stats.defects} defect record(s) waiting to sync.`}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Defect Register</Text>

        {loading && defects.length === 0 ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading defects...</Text>
          </View>
        ) : null}

        {!loading && defects.length === 0 ? (
          <Text style={styles.emptyText}>No defects found.</Text>
        ) : null}

        {defects.map((defect) => {
          const currentStatus = String(defect.status || 'OPEN').toUpperCase();
          const isClosed = ['CLOSED', 'RESOLVED', 'COMPLETED'].includes(currentStatus);

          return (
            <View key={defect.id} style={styles.defectRow}>
              <View style={styles.defectTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.defectTitle}>{defect.title || 'Vehicle defect'}</Text>
                  <Text style={styles.defectMeta}>
                    {defect.vehicle?.registrationNo || 'Unknown Vehicle'}
                    {' â€¢ '}
                    {[defect.vehicle?.make, defect.vehicle?.model].filter(Boolean).join(' ') ||
                      'Vehicle'}
                  </Text>
                </View>

                <View style={statusStyle(defect.status)}>
                  <Text style={styles.statusText}>{defect.status || 'OPEN'}</Text>
                </View>
              </View>

              <View style={styles.defectBadges}>
                <View style={severityStyle(defect.severity)}>
                  <Text style={styles.statusText}>{defect.severity || 'MEDIUM'}</Text>
                </View>

                <Text style={styles.defectNo}>{defect.defectNo || '-'}</Text>
              </View>

              <Text style={styles.descriptionText}>
                {defect.description || 'No description recorded.'}
              </Text>

              <View style={styles.detailGrid}>
                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>Reported By</Text>
                  <Text style={styles.detailValue}>{defect.reportedBy || '-'}</Text>
                </View>

                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>Reported</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(defect.reportedAt || defect.createdAt)}
                  </Text>
                </View>

                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>Odometer</Text>
                  <Text style={styles.detailValue}>{defect.odometer || '-'}</Text>
                </View>

                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>
                    {defect.location || defect.vehicle?.site || '-'}
                  </Text>
                </View>
              </View>

              {!isClosed ? (
                <Pressable
                  style={styles.closeButton}
                  onPress={() => handleCloseDefect(defect.id)}
                  disabled={closingId === defect.id}
                >
                  {closingId === defect.id ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.closeButtonText}>Close Defect</Text>
                  )}
                </Pressable>
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
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccd8e5',
    padding: 14,
  },
  summaryLabel: {
    color: '#64748b',
    textTransform: 'uppercase',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1,
  },
  summaryValue: {
    color: '#06152b',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 6,
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
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#06152b',
    fontSize: 21,
    fontWeight: '900',
    marginBottom: 6,
  },
  muted: {
    color: '#64748b',
    fontWeight: '700',
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
  defectRow: {
    borderWidth: 1,
    borderColor: '#d7e1ed',
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    backgroundColor: '#f8fafc',
  },
  defectTopRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  defectTitle: {
    color: '#06152b',
    fontWeight: '900',
    fontSize: 16,
  },
  defectMeta: {
    color: '#64748b',
    fontWeight: '700',
    marginTop: 3,
  },
  defectBadges: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  defectNo: {
    color: '#64748b',
    fontWeight: '900',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  severityPill: {
    alignSelf: 'flex-start',
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
  severityDanger: {
    backgroundColor: '#fee2e2',
  },
  severityWarning: {
    backgroundColor: '#ffedd5',
  },
  severityNeutral: {
    backgroundColor: '#e2e8f0',
  },
  statusText: {
    color: '#06152b',
    fontWeight: '900',
    fontSize: 11,
  },
  descriptionText: {
    color: '#334155',
    fontWeight: '700',
    marginBottom: 12,
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
  closeButton: {
    backgroundColor: '#06152b',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 14,
  },
  closeButtonText: {
    color: '#ffffff',
    fontWeight: '900',
  },
});
