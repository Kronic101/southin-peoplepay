import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getSafetyDashboard } from '../../src/api/safety';
import StatusPill from '../../src/components/StatusPill';

type DashboardData = {
  summary?: {
    totalObservations?: number;
    openObservations?: number;
    highRiskObservations?: number;
    totalIncidents?: number;
    openIncidents?: number;
    nearMisses?: number;
    openActions?: number;
    overdueActions?: number;
  };
  recentObservations?: any[];
  recentIncidents?: any[];
  recentActions?: any[];
};

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function MobileSafetyPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadDashboard() {
    setLoading(true);
    setError('');

    try {
      const result = await getSafetyDashboard();
      setData((result || null) as DashboardData);
    } catch (err: any) {
      setError(err?.message || 'Unable to load Safety dashboard.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const summary = data?.summary || {};

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadDashboard} />
      }
    >
      <View style={styles.topBar}>
        <Text style={styles.topBarText}>Southin Safety Mobile</Text>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Health & Safety</Text>
        <Text style={styles.heroTitle}>Safety Capture</Text>
        <Text style={styles.heroText}>
          Capture observations, incidents, near misses, corrective actions, GPS
          data and offline-ready field records.
        </Text>

        <View style={styles.heroActions}>
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.push('/safety/observations/new')}
          >
            <Text style={styles.primaryButtonText}>New Observation</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.push('/safety/incidents/new')}
          >
            <Text style={styles.secondaryButtonText}>Report Incident</Text>
          </Pressable>
        </View>

        <Pressable
          style={[styles.secondaryButton, styles.fullButton]}
          onPress={() => router.push('/safety/actions/new')}
        >
          <Text style={styles.secondaryButtonText}>New Corrective Action</Text>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorNotice}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.summaryGrid}>
        <SummaryCard label="Open Observations" value={asNumber(summary.openObservations)} />
        <SummaryCard label="High/Critical" value={asNumber(summary.highRiskObservations)} />
        <SummaryCard label="Open Incidents" value={asNumber(summary.openIncidents)} />
        <SummaryCard label="Near Misses" value={asNumber(summary.nearMisses)} />
        <SummaryCard label="Open Actions" value={asNumber(summary.openActions)} />
        <SummaryCard label="Overdue Actions" value={asNumber(summary.overdueActions)} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Recent Observations</Text>

        {loading && !data ? (
          <ActivityIndicator />
        ) : null}

        {!data?.recentObservations?.length ? (
          <Text style={styles.emptyText}>No observations captured yet.</Text>
        ) : null}

        {(data?.recentObservations || []).slice(0, 5).map((item) => (
          <View key={item.id} style={styles.listRow}>
            <View style={styles.rowMain}>
              <Text style={styles.rowTitle}>{item.observationNo}</Text>
              <Text style={styles.rowMeta}>{item.description}</Text>
              <Text style={styles.rowMeta}>
                {item.siteName || '-'} • {item.exactLocation || '-'}
              </Text>
            </View>
            <StatusPill status={item.riskLevel} />
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Recent Incidents</Text>

        {!data?.recentIncidents?.length ? (
          <Text style={styles.emptyText}>No incidents reported yet.</Text>
        ) : null}

        {(data?.recentIncidents || []).slice(0, 5).map((item) => (
          <View key={item.id} style={styles.listRow}>
            <View style={styles.rowMain}>
              <Text style={styles.rowTitle}>{item.incidentNo}</Text>
              <Text style={styles.rowMeta}>{item.description}</Text>
              <Text style={styles.rowMeta}>
                {item.siteName || '-'} • {item.exactLocation || '-'}
              </Text>
            </View>
            <StatusPill status={item.severity} />
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Mobile Readiness</Text>

        <View style={styles.syncRow}>
          <Text style={styles.syncLabel}>GPS</Text>
          <StatusPill status="READY" />
        </View>

        <View style={styles.syncRow}>
          <Text style={styles.syncLabel}>Offline IDs</Text>
          <StatusPill status="READY" />
        </View>

        <View style={styles.syncRow}>
          <Text style={styles.syncLabel}>Photos</Text>
          <StatusPill status="PENDING_UPLOAD_HANDLER" />
        </View>
      </View>
    </ScrollView>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#eaf1f7' },
  content: { paddingBottom: 32 },
  topBar: {
    backgroundColor: '#06152b',
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  topBarText: { color: '#ffffff', fontWeight: '900', fontSize: 18 },
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
  heroText: { color: '#475569', fontSize: 15, lineHeight: 22 },
  heroActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  primaryButton: {
    flex: 1,
    backgroundColor: '#f97316',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#ffffff', fontWeight: '900' },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#06152b',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#ffffff', fontWeight: '900' },
  fullButton: { marginTop: 10 },
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
  emptyText: { color: '#64748b', fontWeight: '800', paddingVertical: 12 },
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
  rowMain: { flex: 1 },
  rowTitle: { color: '#06152b', fontWeight: '900', fontSize: 15 },
  rowMeta: { color: '#64748b', fontWeight: '700', marginTop: 3 },
  syncRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingVertical: 12,
  },
  syncLabel: { color: '#06152b', fontWeight: '900' },
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
});