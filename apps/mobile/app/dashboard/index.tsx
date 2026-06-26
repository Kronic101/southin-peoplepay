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

import { getFleetDashboard } from '../../src/api/fleet';
import { useOfflineQueue } from '../../src/hooks/useOfflineQueue';

type DashboardData = {
  summary?: {
    vehicles?: number;
    activeVehicles?: number;
    drivers?: number;
    activeAssignments?: number;
    openDueItems?: number;
    overdueDueItems?: number;
    inspections?: number;
    defects?: number;
    openDefects?: number;
    trips?: number;
    fuelLogs?: number;
    workshopJobs?: number;
    openWorkshopJobs?: number;
  };
  recentVehicles?: any[];
  recentDueItems?: any[];
  recentDefects?: any[];
};

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value?: string | null) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString('en-ZM', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function statusStyle(status?: string | null) {
  const value = String(status || '').toUpperCase();

  if (['ACTIVE', 'PASSED', 'PASSED_WITH_DEFECTS', 'COMPLETED', 'CLOSED'].includes(value)) {
    return [styles.statusPill, styles.statusSuccess];
  }

  if (['OPEN', 'PLANNED', 'IN_PROGRESS', 'PENDING', 'OVERDUE', 'WAITING_PARTS'].includes(value)) {
    return [styles.statusPill, styles.statusWarning];
  }

  if (['FAILED', 'REJECTED', 'CRITICAL', 'DAMAGED'].includes(value)) {
    return [styles.statusPill, styles.statusDanger];
  }

  return [styles.statusPill, styles.statusNeutral];
}

export default function MobileDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
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
    return {
      vehicles: asNumber(data?.summary?.vehicles),
      activeVehicles: asNumber(data?.summary?.activeVehicles),
      drivers: asNumber(data?.summary?.drivers),
      inspections: asNumber(data?.summary?.inspections),
      openDefects: asNumber(data?.summary?.openDefects),
      trips: asNumber(data?.summary?.trips),
      fuelLogs: asNumber(data?.summary?.fuelLogs),
      workshopJobs: asNumber(data?.summary?.workshopJobs),
      openWorkshopJobs: asNumber(data?.summary?.openWorkshopJobs),
      openDueItems: asNumber(data?.summary?.openDueItems),
      overdueDueItems: asNumber(data?.summary?.overdueDueItems),
    };
  }, [data]);

  async function loadDashboard() {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const result = await getFleetDashboard();
      setData(result || null);
      await refreshQueue();
    } catch (err: any) {
      setError(err?.message || 'Unable to load mobile dashboard.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSyncOffline() {
    setMessage('');
    setError('');

    try {
      const result = await syncQueue();

      if (result.synced.length > 0) {
        setMessage(`${result.synced.length} offline record(s) synced successfully.`);
        await loadDashboard();
      } else if (result.remaining.length > 0) {
        setError(`${result.remaining.length} offline record(s) still pending sync.`);
      } else {
        setMessage('No offline records pending sync.');
      }
    } catch (err: any) {
      setError(err?.message || 'Offline sync failed.');
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const offlineMessage = lastSyncError || lastSyncMessage;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadDashboard} />}
    >
      <View style={styles.mobileTopBar}>
        <Text style={styles.mobileTopBarText}>dashboard</Text>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Southin Operations Hub</Text>
        <Text style={styles.heroTitle}>Mobile Dashboard</Text>
        <Text style={styles.heroText}>
          Driver and field-user control centre for inspections, defects, trips, fuel capture and
          offline sync.
        </Text>

        <View style={styles.heroActions}>
          <Pressable style={styles.darkButton} onPress={() => router.push('/fleet/inspections/new')}>
            <Text style={styles.darkButtonText}>New Inspection</Text>
          </Pressable>

          <Pressable style={styles.lightButton} onPress={loadDashboard}>
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
          <Text style={styles.summaryLabel}>Vehicles</Text>
          <Text style={styles.summaryValue}>{summary.vehicles}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Active</Text>
          <Text style={styles.summaryValue}>{summary.activeVehicles}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Inspections</Text>
          <Text style={styles.summaryValue}>{summary.inspections}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Open Defects</Text>
          <Text style={styles.summaryValue}>{summary.openDefects}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Trips</Text>
          <Text style={styles.summaryValue}>{summary.trips}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Fuel Logs</Text>
          <Text style={styles.summaryValue}>{summary.fuelLogs}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <View style={styles.actionGrid}>
          <Pressable style={styles.actionCard} onPress={() => router.push('/fleet/inspections/new')}>
            <Text style={styles.actionTitle}>Inspection</Text>
            <Text style={styles.actionText}>Complete pre-start checklist.</Text>
          </Pressable>

          <Pressable style={styles.actionCard} onPress={() => router.push('/fleet/defects/new')}>
            <Text style={styles.actionTitle}>Defect</Text>
            <Text style={styles.actionText}>Raise a vehicle defect.</Text>
          </Pressable>

          <Pressable style={styles.actionCard} onPress={() => router.push('/fleet/trips/new')}>
            <Text style={styles.actionTitle}>Trip</Text>
            <Text style={styles.actionText}>Start a vehicle trip.</Text>
          </Pressable>

          <Pressable style={styles.actionCard} onPress={() => router.push('/fleet/fuel/new')}>
            <Text style={styles.actionTitle}>Fuel</Text>
            <Text style={styles.actionText}>Capture fuel entry.</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Offline Queue</Text>
            <Text style={styles.muted}>
              {stats.total === 0
                ? 'No offline records waiting to sync.'
                : `${stats.total} offline record(s) waiting to sync.`}
            </Text>
          </View>

          <Pressable style={styles.smallDarkButton} onPress={handleSyncOffline} disabled={syncing}>
            {syncing ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.smallDarkButtonText}>Sync</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.offlineGrid}>
          <View style={styles.offlineBox}>
            <Text style={styles.offlineLabel}>Inspections</Text>
            <Text style={styles.offlineValue}>{stats.inspections}</Text>
          </View>

          <View style={styles.offlineBox}>
            <Text style={styles.offlineLabel}>Defects</Text>
            <Text style={styles.offlineValue}>{stats.defects}</Text>
          </View>

          <View style={styles.offlineBox}>
            <Text style={styles.offlineLabel}>Trips</Text>
            <Text style={styles.offlineValue}>{stats.trips}</Text>
          </View>

          <View style={styles.offlineBox}>
            <Text style={styles.offlineLabel}>Fuel</Text>
            <Text style={styles.offlineValue}>{stats.fuel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Recent Vehicles</Text>

        {loading && !data?.recentVehicles?.length ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading dashboard...</Text>
          </View>
        ) : null}

        {!loading && !data?.recentVehicles?.length ? (
          <Text style={styles.emptyText}>No recent vehicles found.</Text>
        ) : null}

        {(data?.recentVehicles || []).slice(0, 5).map((vehicle) => (
          <View key={vehicle.id} style={styles.listRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{vehicle.registrationNo || '-'}</Text>
              <Text style={styles.rowMeta}>
                {[vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Vehicle'}
                {' • '}
                {vehicle.site || 'No site'}
              </Text>
            </View>

            <View style={statusStyle(vehicle.status)}>
              <Text style={styles.statusText}>{vehicle.status || '-'}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Recent Defects</Text>

        {!data?.recentDefects?.length ? (
          <Text style={styles.emptyText}>No recent defects found.</Text>
        ) : null}

        {(data?.recentDefects || []).slice(0, 5).map((defect) => (
          <View key={defect.id} style={styles.listRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>
                {defect.vehicle?.registrationNo || 'Unknown Vehicle'}
              </Text>
              <Text style={styles.rowMeta}>
                {defect.title || defect.description || 'Vehicle defect'}
              </Text>
            </View>

            <View style={statusStyle(defect.status)}>
              <Text style={styles.statusText}>{defect.status || '-'}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Due Items</Text>

        {!data?.recentDueItems?.length ? (
          <Text style={styles.emptyText}>No due items found.</Text>
        ) : null}

        {(data?.recentDueItems || []).slice(0, 5).map((item) => (
          <View key={item.id} style={styles.listRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>
                {item.vehicle?.registrationNo || 'Unknown Vehicle'}
              </Text>
              <Text style={styles.rowMeta}>
                {item.title || item.dueType || 'Fleet due item'} • {formatDate(item.dueDate)}
              </Text>
            </View>

            <View style={statusStyle(item.status)}>
              <Text style={styles.statusText}>{item.status || '-'}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.footerCard}>
        <Text style={styles.footerTitle}>Next Step</Text>
        <Text style={styles.footerText}>
          Profile and login will control driver identity, permit number, role access and Microsoft
          authentication once enabled.
        </Text>

        <Pressable style={styles.profileButton} onPress={() => router.push('/profile')}>
          <Text style={styles.profileButtonText}>Open Profile</Text>
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
  sectionTitle: {
    color: '#06152b',
    fontSize: 21,
    fontWeight: '900',
    marginBottom: 10,
  },
  muted: {
    color: '#64748b',
    fontWeight: '700',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d7e1ed',
    padding: 14,
  },
  actionTitle: {
    color: '#06152b',
    fontWeight: '900',
    fontSize: 16,
    marginBottom: 4,
  },
  actionText: {
    color: '#64748b',
    fontWeight: '700',
    lineHeight: 18,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  offlineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  offlineBox: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  offlineLabel: {
    color: '#64748b',
    textTransform: 'uppercase',
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 1,
  },
  offlineValue: {
    color: '#06152b',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
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
  listRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d7e1ed',
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    backgroundColor: '#f8fafc',
  },
  rowTitle: {
    color: '#06152b',
    fontWeight: '900',
    fontSize: 15,
  },
  rowMeta: {
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