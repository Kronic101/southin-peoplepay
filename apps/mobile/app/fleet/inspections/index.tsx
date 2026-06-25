'use client';

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { getFleetInspections } from '../../../src/api/fleet';
import { getOfflineQueue } from '../../../src/storage/offlineQueue';

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

  if (value === 'PASSED') return styles.statusPassed;
  if (value === 'PASSED_WITH_DEFECTS') return styles.statusWarning;
  if (value === 'FAILED') return styles.statusFailed;

  return styles.statusNeutral;
}

export default function FleetInspectionHistoryPage() {
  const [inspections, setInspections] = useState<any[]>([]);
  const [offlineCount, setOfflineCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const [inspectionResult, queue] = await Promise.all([
        getFleetInspections(),
        getOfflineQueue(),
      ]);

      setInspections(inspectionResult || []);
      setOfflineCount(queue.filter((item) => item.type === 'FLEET_INSPECTION').length);
    } catch (err: any) {
      setError(err?.message || 'Unable to load inspection history.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>fleet/inspections</Text>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Fleet Management</Text>
        <Text style={styles.title}>Inspection History</Text>
        <Text style={styles.description}>
          Review submitted vehicle pre-start inspections, safety status and pending offline records.
        </Text>
      </View>

      {error ? <Text style={styles.errorBox}>{error}</Text> : null}

      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={styles.summaryValue}>{inspections.length}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Passed</Text>
          <Text style={styles.summaryValue}>
            {inspections.filter((item) => item.overallStatus === 'PASSED').length}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>With Defects</Text>
          <Text style={styles.summaryValue}>
            {inspections.filter((item) => item.overallStatus === 'PASSED_WITH_DEFECTS').length}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Failed</Text>
          <Text style={styles.summaryValue}>
            {inspections.filter((item) => item.overallStatus === 'FAILED').length}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Offline Queue</Text>
          <Text style={styles.summaryValue}>{offlineCount}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => router.push('/fleet/inspections/new')}
      >
        <Text style={styles.primaryButtonText}>New Inspection</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={loadData}>
        <Text style={styles.secondaryButtonText}>
          {loading ? 'Refreshing...' : 'Refresh History'}
        </Text>
      </TouchableOpacity>

      {loading ? <ActivityIndicator size="large" color="#f97316" /> : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Recent Inspections</Text>

        {!inspections.length ? (
          <Text style={styles.muted}>No inspection records found.</Text>
        ) : (
          inspections.map((inspection) => (
            <View key={inspection.id} style={styles.recordCard}>
              <View style={styles.recordHeader}>
                <View>
                  <Text style={styles.recordTitle}>
                    {inspection.vehicle?.registrationNo || inspection.vehicleNo || '-'}
                  </Text>
                  <Text style={styles.recordSub}>
                    {inspection.vehicle?.make || ''} {inspection.vehicle?.model || ''}
                  </Text>
                </View>

                <Text style={[styles.statusPill, statusStyle(inspection.overallStatus)]}>
                  {inspection.overallStatus || '-'}
                </Text>
              </View>

              <Text style={styles.recordLine}>
                Driver: {inspection.driverName || '-'}
              </Text>

              <Text style={styles.recordLine}>
                Odometer: {inspection.odometer || '-'}
              </Text>

              <Text style={styles.recordLine}>
                Date: {formatDate(inspection.inspectionDate || inspection.createdAt)}
              </Text>

              <Text style={styles.recordLine}>
                Failed Items: {inspection.payload?.failedItems?.length || 0}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#eaf1f7',
  },
  content: {
    paddingBottom: 36,
  },
  topBar: {
    backgroundColor: '#07152b',
    paddingTop: 38,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  topBarTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
  },
  heroCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#d6e0eb',
  },
  eyebrow: {
    color: '#f97316',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: {
    color: '#07152b',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 8,
  },
  description: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
    borderWidth: 1,
    color: '#991b1b',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    padding: 14,
    fontWeight: '800',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderColor: '#d6e0eb',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    minWidth: '30%',
    flexGrow: 1,
  },
  summaryLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#07152b',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: '#f97316',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  secondaryButton: {
    backgroundColor: '#07152b',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#d6e0eb',
  },
  sectionTitle: {
    color: '#07152b',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 12,
  },
  muted: {
    color: '#64748b',
  },
  recordCard: {
    borderWidth: 1,
    borderColor: '#d6e0eb',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#f8fafc',
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  recordTitle: {
    color: '#07152b',
    fontWeight: '900',
    fontSize: 16,
  },
  recordSub: {
    color: '#64748b',
    marginTop: 2,
  },
  recordLine: {
    color: '#334155',
    fontWeight: '700',
    marginTop: 4,
  },
  statusPill: {
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: '900',
    alignSelf: 'flex-start',
  },
  statusPassed: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  statusWarning: {
    backgroundColor: '#ffedd5',
    color: '#9a3412',
  },
  statusFailed: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  statusNeutral: {
    backgroundColor: '#e2e8f0',
    color: '#334155',
  },
});