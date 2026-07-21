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

import { getFleetFuelLogs } from '../../../src/api/fleet';
import { useOfflineQueue } from '../../../src/hooks/useOfflineQueue';

type FuelLogRecord = {
  id: string;
  vehicleId: string;
  fuelDate?: string | null;
  stationName?: string | null;
  fuelType?: string | null;
  litres?: string | number | null;
  amount?: string | number | null;
  odometer?: string | number | null;
  receiptDocumentId?: string | null;
  createdAt?: string | null;
  vehicle?: {
    registrationNo?: string | null;
    make?: string | null;
    model?: string | null;
    site?: string | null;
  } | null;
};

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: unknown) {
  return new Intl.NumberFormat('en-ZM', {
    style: 'currency',
    currency: 'ZMW',
    minimumFractionDigits: 2,
  }).format(asNumber(value));
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

export default function FleetFuelPage() {
  const [logs, setLogs] = useState<FuelLogRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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

  const summary = useMemo(() => {
    const totalLitres = logs.reduce((sum, log) => sum + asNumber(log.litres), 0);
    const totalCost = logs.reduce((sum, log) => sum + asNumber(log.amount), 0);
    const vehiclesFuelled = new Set(logs.map((log) => log.vehicleId)).size;

    return {
      totalLogs: logs.length,
      totalLitres,
      totalCost,
      vehiclesFuelled,
    };
  }, [logs]);

  async function loadFuelLogs() {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const result = await getFleetFuelLogs();
      setLogs((result || []) as FuelLogRecord[]);
      await refreshQueue();
    } catch (err: any) {
      setError(err?.message || 'Unable to load fuel logs.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSyncQueue() {
    setMessage('');
    setError('');

    try {
      const result = await syncQueue();

      if (result.synced.length > 0) {
        setMessage(`${result.synced.length} offline fuel record(s) synced.`);
        await loadFuelLogs();
      } else if (result.remaining.length > 0) {
        setError(`${result.remaining.length} offline record(s) still pending.`);
      } else {
        setMessage('No offline records pending sync.');
      }
    } catch (err: any) {
      setError(err?.message || 'Offline sync failed.');
    }
  }

  useEffect(() => {
    loadFuelLogs();
  }, []);

  const offlineMessage = lastSyncError || lastSyncMessage;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadFuelLogs} />}
    >
      <View style={styles.mobileTopBar}>
        <Text style={styles.mobileTopBarText}>fleet/fuel</Text>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Fleet Management</Text>
        <Text style={styles.heroTitle}>Fuel Logs</Text>
        <Text style={styles.heroText}>
          Capture and review mobile fuel records. Each fuel log can create a fleet operating cost
          for Finance review and monthly posting.
        </Text>

        <View style={styles.heroActions}>
          <Pressable style={styles.darkButton} onPress={() => router.push('/fleet/fuel/new')}>
            <Text style={styles.darkButtonText}>Capture Fuel</Text>
          </Pressable>

          <Pressable style={styles.lightButton} onPress={loadFuelLogs}>
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
          <Text style={styles.summaryLabel}>Fuel Logs</Text>
          <Text style={styles.summaryValue}>{summary.totalLogs}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Litres</Text>
          <Text style={styles.summaryValue}>{summary.totalLitres.toFixed(2)}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Fuel Cost</Text>
          <Text style={styles.summaryValue}>{formatMoney(summary.totalCost)}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Vehicles</Text>
          <Text style={styles.summaryValue}>{summary.vehiclesFuelled}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Offline Queue</Text>
            <Text style={styles.muted}>
              {stats.fuel === 0
                ? 'No fuel records waiting to sync.'
                : `${stats.fuel} fuel record(s) waiting to sync.`}
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
        <Text style={styles.sectionTitle}>Fuel Register</Text>

        {loading && logs.length === 0 ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading fuel logs...</Text>
          </View>
        ) : null}

        {!loading && logs.length === 0 ? (
          <Text style={styles.emptyText}>No fuel logs found.</Text>
        ) : null}

        {logs.map((log) => (
          <View key={log.id} style={styles.logRow}>
            <View style={styles.logTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.logTitle}>
                  {log.vehicle?.registrationNo || 'Unknown Vehicle'}
                </Text>
                <Text style={styles.logMeta}>
                  {[log.vehicle?.make, log.vehicle?.model].filter(Boolean).join(' ') || 'Vehicle'}
                </Text>
              </View>

              <View style={styles.amountPill}>
                <Text style={styles.amountPillText}>{formatMoney(log.amount)}</Text>
              </View>
            </View>

            <View style={styles.detailGrid}>
              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>{formatDate(log.fuelDate || log.createdAt)}</Text>
              </View>

              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>Litres</Text>
                <Text style={styles.detailValue}>{log.litres || '0'}</Text>
              </View>

              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>Odometer</Text>
                <Text style={styles.detailValue}>{log.odometer || '-'}</Text>
              </View>

              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>Receipt</Text>
                <Text style={styles.detailValue}>{log.receiptDocumentId || '-'}</Text>
              </View>
            </View>

            <Text style={styles.stationText}>{log.stationName || 'No station recorded'}</Text>
          </View>
        ))}
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
    fontSize: 22,
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
    alignItems: 'center',
    gap: 12,
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
  logRow: {
    borderWidth: 1,
    borderColor: '#d7e1ed',
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    backgroundColor: '#f8fafc',
  },
  logTopRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  logTitle: {
    color: '#06152b',
    fontWeight: '900',
    fontSize: 16,
  },
  logMeta: {
    color: '#64748b',
    fontWeight: '700',
    marginTop: 3,
  },
  amountPill: {
    backgroundColor: '#ffedd5',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  amountPillText: {
    color: '#9a3412',
    fontWeight: '900',
    fontSize: 12,
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
  stationText: {
    color: '#334155',
    fontWeight: '800',
    marginTop: 12,
  },
});



