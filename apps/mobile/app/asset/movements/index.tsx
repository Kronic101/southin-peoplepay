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

import {
  AssetMovementRecord,
  getAssetMovements,
} from '../../../src/api/assets';
import { useOfflineQueue } from '../../../src/hooks/useOfflineQueue';

function statusStyle(status?: string | null) {
  const value = String(status || '').toUpperCase();

  if (['POSTED', 'APPROVED', 'COMPLETED'].includes(value)) {
    return [styles.statusPill, styles.statusSuccess];
  }

  if (['DRAFT', 'PENDING', 'PENDING_APPROVAL'].includes(value)) {
    return [styles.statusPill, styles.statusWarning];
  }

  if (['REJECTED', 'CANCELLED'].includes(value)) {
    return [styles.statusPill, styles.statusDanger];
  }

  return [styles.statusPill, styles.statusNeutral];
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

export default function AssetMovementsPage() {
  const [movements, setMovements] = useState<AssetMovementRecord[]>([]);
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
    const draft = movements.filter((item) =>
      ['DRAFT', 'PENDING', 'PENDING_APPROVAL'].includes(String(item.status || '').toUpperCase()),
    ).length;

    const posted = movements.filter((item) =>
      ['POSTED', 'COMPLETED'].includes(String(item.status || '').toUpperCase()),
    ).length;

    return {
      total: movements.length,
      draft,
      posted,
    };
  }, [movements]);

  async function loadMovements() {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const result = await getAssetMovements();
      setMovements(result || []);
      await refreshQueue();
    } catch (err: any) {
      setError(err?.message || 'Unable to load asset movements.');
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
        setMessage(`${result.synced.length} offline asset movement(s) synced successfully.`);
        await loadMovements();
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
    loadMovements();
  }, []);

  const offlineMessage = lastSyncError || lastSyncMessage;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadMovements} />}
    >
      <View style={styles.mobileTopBar}>
        <Text style={styles.mobileTopBarText}>asset/movements</Text>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Asset Management</Text>
        <Text style={styles.heroTitle}>Asset Movements</Text>
        <Text style={styles.heroText}>
          Mobile view for stock, tools and scaffold movement requests. Posting remains controlled
          from the web app for audit and approval.
        </Text>

        <View style={styles.heroActions}>
          <Pressable style={styles.darkButton} onPress={() => router.push('/asset/movements/new')}>
            <Text style={styles.darkButtonText}>New Movement</Text>
          </Pressable>

          <Pressable style={styles.lightButton} onPress={() => router.push('/asset/scanner')}>
            <Text style={styles.lightButtonText}>Scanner</Text>
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
          <Text style={styles.summaryLabel}>Movements</Text>
          <Text style={styles.summaryValue}>{summary.total}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Pending</Text>
          <Text style={styles.summaryValue}>{summary.draft}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Posted</Text>
          <Text style={styles.summaryValue}>{summary.posted}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Offline</Text>
          <Text style={styles.summaryValue}>{stats.assets}</Text>
        </View>
      </View>

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
        <Text style={styles.sectionTitle}>Movement Register</Text>

        {loading && movements.length === 0 ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading movements...</Text>
          </View>
        ) : null}

        {!loading && movements.length === 0 ? (
          <Text style={styles.emptyText}>No asset movements found.</Text>
        ) : null}

        {movements.map((movement) => (
          <View key={movement.id} style={styles.movementRow}>
            <View style={styles.rowTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{movement.movementNo || '-'}</Text>
                <Text style={styles.rowMeta}>
                  {movement.movementType || 'MOVEMENT'} • {formatDate(movement.createdAt)}
                </Text>
              </View>

              <View style={statusStyle(movement.status)}>
                <Text style={styles.statusText}>{movement.status || 'DRAFT'}</Text>
              </View>
            </View>

            <Text style={styles.reasonText}>{movement.reason || movement.notes || 'No movement reason recorded.'}</Text>

            <View style={styles.detailGrid}>
              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>From</Text>
                <Text style={styles.detailValue}>
                  {movement.fromLocation?.locationName || movement.fromLocation?.site || '-'}
                </Text>
              </View>

              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>To</Text>
                <Text style={styles.detailValue}>
                  {movement.toLocation?.locationName || movement.toLocation?.site || '-'}
                </Text>
              </View>

              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>Lines</Text>
                <Text style={styles.detailValue}>{movement.lines?.length || 0}</Text>
              </View>

              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>Created By</Text>
                <Text style={styles.detailValue}>{movement.createdBy || movement.requestedBy || '-'}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#eaf1f7' },
  content: { paddingBottom: 32 },
  mobileTopBar: {
    backgroundColor: '#06152b',
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  mobileTopBarText: { color: '#ffffff', fontWeight: '900', fontSize: 18 },
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
  heroTitle: { color: '#06152b', fontSize: 28, fontWeight: '900', marginBottom: 8 },
  heroText: { color: '#475569', fontSize: 15, lineHeight: 22 },
  heroActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  darkButton: {
    flex: 1,
    backgroundColor: '#06152b',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  darkButtonText: { color: '#ffffff', fontWeight: '900' },
  lightButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  lightButtonText: { color: '#06152b', fontWeight: '900' },
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
  summaryValue: { color: '#06152b', fontSize: 22, fontWeight: '900', marginTop: 6 },
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ccd8e5',
  },
  sectionTitle: { color: '#06152b', fontSize: 21, fontWeight: '900', marginBottom: 10 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  muted: { color: '#64748b', fontWeight: '700' },
  smallDarkButton: {
    backgroundColor: '#06152b',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  smallDarkButtonText: { color: '#ffffff', fontWeight: '900' },
  successNotice: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },
  successText: { color: '#166534', fontWeight: '900' },
  warningNotice: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: '#fff7ed',
    borderColor: '#fdba74',
  },
  warningText: { color: '#9a3412', fontWeight: '900' },
  errorNotice: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
  },
  errorText: { color: '#991b1b', fontWeight: '900' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 18 },
  emptyText: { color: '#64748b', fontWeight: '800', paddingVertical: 12 },
  movementRow: {
    borderWidth: 1,
    borderColor: '#d7e1ed',
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    backgroundColor: '#f8fafc',
  },
  rowTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 10 },
  rowTitle: { color: '#06152b', fontWeight: '900', fontSize: 16 },
  rowMeta: { color: '#64748b', fontWeight: '700', marginTop: 3 },
  reasonText: { color: '#334155', fontWeight: '700', marginBottom: 12 },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusSuccess: { backgroundColor: '#dcfce7' },
  statusWarning: { backgroundColor: '#ffedd5' },
  statusDanger: { backgroundColor: '#fee2e2' },
  statusNeutral: { backgroundColor: '#e2e8f0' },
  statusText: { color: '#06152b', fontWeight: '900', fontSize: 11 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
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
  detailValue: { color: '#06152b', fontWeight: '900', marginTop: 4 },
});