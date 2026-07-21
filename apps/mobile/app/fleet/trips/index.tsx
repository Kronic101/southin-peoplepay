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
  TextInput,
  View,
} from 'react-native';

import { closeFleetTrip, getFleetTrips } from '../../../src/api/fleet';
import { useOfflineQueue } from '../../../src/hooks/useOfflineQueue';
import { enqueueOfflineRequest } from '../../../src/storage/offlineQueue';

type TripRecord = {
  id: string;
  vehicleId: string;
  tripNo?: string | null;
  tripDate?: string | null;
  driverName?: string | null;
  purpose?: string | null;
  origin?: string | null;
  destination?: string | null;
  openingOdometer?: string | number | null;
  closingOdometer?: string | number | null;
  distanceKm?: string | number | null;
  status?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  vehicle?: {
    registrationNo?: string | null;
    make?: string | null;
    model?: string | null;
    site?: string | null;
  } | null;
};

type TripCloseDraft = {
  closingOdometer: string;
  notes: string;
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

  return date.toLocaleString('en-ZM', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isOpenTrip(status?: string | null) {
  const value = String(status || '').toUpperCase();

  return ['OPEN', 'PLANNED', 'IN_PROGRESS', 'STARTED'].includes(value);
}

function isClosedTrip(status?: string | null) {
  const value = String(status || '').toUpperCase();

  return ['CLOSED', 'COMPLETED', 'ENDED'].includes(value);
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

  if (['CLOSED', 'COMPLETED', 'ENDED'].includes(value)) {
    return [styles.statusPill, styles.statusSuccess];
  }

  if (['OPEN', 'PLANNED', 'IN_PROGRESS', 'STARTED'].includes(value)) {
    return [styles.statusPill, styles.statusWarning];
  }

  return [styles.statusPill, styles.statusNeutral];
}

export default function FleetTripsPage() {
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [closeDrafts, setCloseDrafts] = useState<Record<string, TripCloseDraft>>({});
  const [loading, setLoading] = useState(false);
  const [closingId, setClosingId] = useState('');
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
    const open = trips.filter((trip) => isOpenTrip(trip.status)).length;
    const closed = trips.filter((trip) => isClosedTrip(trip.status)).length;
    const totalKm = trips.reduce((sum, trip) => sum + asNumber(trip.distanceKm), 0);

    return {
      total: trips.length,
      open,
      closed,
      totalKm,
    };
  }, [trips]);

  async function loadTrips() {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const result = await getFleetTrips();
      const records = (result || []) as TripRecord[];

      setTrips(records);
      await refreshQueue();

      setCloseDrafts((current) => {
        const next = { ...current };

        records.forEach((trip) => {
          if (!next[trip.id]) {
            next[trip.id] = {
              closingOdometer: '',
              notes: '',
            };
          }
        });

        return next;
      });
    } catch (err: any) {
      setError(err?.message || 'Unable to load trips.');
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
        setMessage(`${result.synced.length} offline trip record(s) synced.`);
        await loadTrips();
      } else if (result.remaining.length > 0) {
        setError(`${result.remaining.length} offline record(s) still pending.`);
      } else {
        setMessage('No offline records pending sync.');
      }
    } catch (err: any) {
      setError(err?.message || 'Offline sync failed.');
    }
  }

  function updateCloseDraft(id: string, field: keyof TripCloseDraft, value: string) {
    setCloseDrafts((current) => ({
      ...current,
      [id]: {
        closingOdometer: current[id]?.closingOdometer || '',
        notes: current[id]?.notes || '',
        [field]: value,
      },
    }));
  }

  async function handleCloseTrip(trip: TripRecord) {
    setClosingId(trip.id);
    setMessage('');
    setError('');

    try {
      const draft = closeDrafts[trip.id] || { closingOdometer: '', notes: '' };
      const openingOdometer = asNumber(trip.openingOdometer);
      const closingOdometer = asNumber(draft.closingOdometer);

      if (closingOdometer <= 0) {
        throw new Error('Closing odometer is required.');
      }

      if (openingOdometer > 0 && closingOdometer < openingOdometer) {
        throw new Error('Closing odometer cannot be less than opening odometer.');
      }

      const distanceKm =
        openingOdometer > 0 && closingOdometer >= openingOdometer
          ? closingOdometer - openingOdometer
          : 0;

      const payload = {
        status: 'CLOSED',
        closingOdometer: String(closingOdometer),
        endOdometer: String(closingOdometer),
        odometerEnd: String(closingOdometer),
        distanceKm: String(distanceKm),
        closedBy: 'Fleet Driver',
        completedBy: 'Fleet Driver',
        closedAt: new Date().toISOString(),
        notes: draft.notes.trim() || 'Trip closed from mobile.',
      };

      try {
        await closeFleetTrip(trip.id, payload);
        setMessage('Trip closed successfully.');
        await loadTrips();
      } catch (err: any) {
        if (isNetworkError(err)) {
          await enqueueOfflineRequest({
            type: 'FLEET_TRIP',
            path: `/fleet/trips/${trip.id}/close`,
            method: 'PATCH',
            payload,
          });

          setMessage('Trip closure saved offline. It will sync when signal is available.');
          await refreshQueue();
          return;
        }

        throw err;
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to close trip.');
    } finally {
      setClosingId('');
    }
  }

  useEffect(() => {
    loadTrips();
  }, []);

  const offlineMessage = lastSyncError || lastSyncMessage;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadTrips} />}
    >
      <View style={styles.mobileTopBar}>
        <Text style={styles.mobileTopBarText}>fleet/trips</Text>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Fleet Management</Text>
        <Text style={styles.heroTitle}>Fleet Trips</Text>
        <Text style={styles.heroText}>
          Start and close trip records from mobile. Trip data supports vehicle utilisation,
          odometer tracking, route history and fleet reporting.
        </Text>

        <View style={styles.heroActions}>
          <Pressable style={styles.darkButton} onPress={() => router.push('/fleet/trips/new')}>
            <Text style={styles.darkButtonText}>Start Trip</Text>
          </Pressable>

          <Pressable style={styles.lightButton} onPress={loadTrips}>
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
          <Text style={styles.summaryLabel}>Trips</Text>
          <Text style={styles.summaryValue}>{summary.total}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Open</Text>
          <Text style={styles.summaryValue}>{summary.open}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Closed</Text>
          <Text style={styles.summaryValue}>{summary.closed}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total KM</Text>
          <Text style={styles.summaryValue}>{summary.totalKm.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Offline Queue</Text>
            <Text style={styles.muted}>
              {stats.trips === 0
                ? 'No trip records waiting to sync.'
                : `${stats.trips} trip record(s) waiting to sync.`}
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
        <Text style={styles.sectionTitle}>Trip Register</Text>

        {loading && trips.length === 0 ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading trips...</Text>
          </View>
        ) : null}

        {!loading && trips.length === 0 ? (
          <Text style={styles.emptyText}>No trips found.</Text>
        ) : null}

        {trips.map((trip) => {
          const open = isOpenTrip(trip.status);
          const draft = closeDrafts[trip.id] || { closingOdometer: '', notes: '' };

          return (
            <View key={trip.id} style={styles.tripRow}>
              <View style={styles.tripTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tripTitle}>
                    {trip.vehicle?.registrationNo || 'Unknown Vehicle'}
                  </Text>
                  <Text style={styles.tripMeta}>
                    {[trip.vehicle?.make, trip.vehicle?.model].filter(Boolean).join(' ') ||
                      'Vehicle'}
                  </Text>
                </View>

                <View style={statusStyle(trip.status)}>
                  <Text style={styles.statusText}>{trip.status || 'PLANNED'}</Text>
                </View>
              </View>

              <Text style={styles.routeText}>
                {trip.origin || '-'} â†’ {trip.destination || '-'}
              </Text>

              <Text style={styles.descriptionText}>{trip.purpose || 'No trip purpose recorded.'}</Text>

              <View style={styles.detailGrid}>
                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>{formatDate(trip.tripDate || trip.createdAt)}</Text>
                </View>

                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>Driver</Text>
                  <Text style={styles.detailValue}>{trip.driverName || '-'}</Text>
                </View>

                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>Opening Odo</Text>
                  <Text style={styles.detailValue}>{trip.openingOdometer || '-'}</Text>
                </View>

                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>Closing Odo</Text>
                  <Text style={styles.detailValue}>{trip.closingOdometer || '-'}</Text>
                </View>

                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>Distance</Text>
                  <Text style={styles.detailValue}>{trip.distanceKm || '-'}</Text>
                </View>

                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>Trip No.</Text>
                  <Text style={styles.detailValue}>{trip.tripNo || '-'}</Text>
                </View>
              </View>

              {open ? (
                <View style={styles.closeBox}>
                  <Text style={styles.closeTitle}>Close Trip</Text>

                  <Text style={styles.label}>Closing Odometer</Text>
                  <TextInput
                    style={styles.input}
                    value={draft.closingOdometer}
                    onChangeText={(value) => updateCloseDraft(trip.id, 'closingOdometer', value)}
                    keyboardType="numeric"
                    placeholder="Enter closing odometer"
                  />

                  <Text style={styles.label}>Close Notes</Text>
                  <TextInput
                    style={[styles.input, styles.textAreaSmall]}
                    value={draft.notes}
                    onChangeText={(value) => updateCloseDraft(trip.id, 'notes', value)}
                    placeholder="Trip completed, route notes, delays, etc."
                    multiline
                  />

                  <Pressable
                    style={styles.closeButton}
                    onPress={() => handleCloseTrip(trip)}
                    disabled={closingId === trip.id}
                  >
                    {closingId === trip.id ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.closeButtonText}>Close Trip</Text>
                    )}
                  </Pressable>
                </View>
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
  tripRow: {
    borderWidth: 1,
    borderColor: '#d7e1ed',
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    backgroundColor: '#f8fafc',
  },
  tripTopRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  tripTitle: {
    color: '#06152b',
    fontWeight: '900',
    fontSize: 16,
  },
  tripMeta: {
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
  statusNeutral: {
    backgroundColor: '#e2e8f0',
  },
  statusText: {
    color: '#06152b',
    fontWeight: '900',
    fontSize: 11,
  },
  routeText: {
    color: '#06152b',
    fontWeight: '900',
    marginBottom: 8,
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
  closeBox: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 14,
  },
  closeTitle: {
    color: '#06152b',
    fontWeight: '900',
    fontSize: 16,
    marginBottom: 8,
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
  textAreaSmall: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  closeButton: {
    backgroundColor: '#06152b',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 8,
  },
  closeButtonText: {
    color: '#ffffff',
    fontWeight: '900',
  },
});



