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

import { getSafetyCorrectiveActions } from '../../../src/api/safety';
import StatusPill from '../../../src/components/StatusPill';

function formatDate(value?: string | null) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('en-ZM', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function sourceLabel(action: any) {
  if (action?.observation?.observationNo) return action.observation.observationNo;
  if (action?.incident?.incidentNo) return action.incident.incidentNo;
  return action?.sourceId || '-';
}

export default function MobileSafetyActionsPage() {
  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function loadActions() {
    setLoading(true);
    setMessage('');

    try {
      const result: any = await getSafetyCorrectiveActions();
      setActions(Array.isArray(result) ? result : result?.actions || []);
    } catch (err: any) {
      setMessage(err?.message || 'Unable to load corrective actions.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadActions();
  }, []);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadActions} />}
    >
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Mobile Safety</Text>
        <Text style={styles.title}>Corrective Actions</Text>
        <Text style={styles.subtitle}>
          Review open, completed, verified and closed safety corrective actions.
        </Text>

        <View style={styles.actionRow}>
          <Pressable style={styles.darkButton} onPress={() => router.push('/safety')}>
            <Text style={styles.darkButtonText}>Safety</Text>
          </Pressable>

          <Pressable style={styles.lightButton} onPress={() => router.push('/safety/actions/new')}>
            <Text style={styles.lightButtonText}>New Action</Text>
          </Pressable>
        </View>
      </View>

      {message ? (
        <View style={styles.errorNotice}>
          <Text style={styles.errorText}>{message}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Action Register</Text>

        {loading && actions.length === 0 ? <ActivityIndicator /> : null}

        {!loading && actions.length === 0 ? (
          <Text style={styles.emptyText}>No corrective actions found.</Text>
        ) : null}

        {actions.map((action) => (
          <Pressable
            key={action.id}
            style={({ pressed }) => [styles.listRow, pressed && styles.cardPressed]}
            onPress={() => router.push(`/safety/actions/${action.id}`)}
          >
            <View style={styles.rowMain}>
              <Text style={styles.rowTitle}>{action.actionNo || 'Corrective Action'}</Text>
              <Text style={styles.rowMeta}>{action.title || action.description || '-'}</Text>
              <Text style={styles.rowMeta}>
                {sourceLabel(action)} - Due {formatDate(action.dueDate)}
              </Text>
              <Text style={styles.rowMeta}>
                Assigned: {action.assignedToName || 'Not assigned'}
              </Text>
            </View>

            <View style={styles.rowStatus}>
              <StatusPill status={action.priority || 'MEDIUM'} />
              <StatusPill status={action.status || 'OPEN'} />
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#eaf1f7' },
  content: { padding: 16, paddingBottom: 36 },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ccd8e5',
    padding: 18,
    marginBottom: 14,
  },
  eyebrow: {
    color: '#f26a21',
    textTransform: 'uppercase',
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: { color: '#06152b', fontSize: 26, fontWeight: '900' },
  subtitle: { color: '#475569', marginTop: 8, lineHeight: 21 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
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
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ccd8e5',
    padding: 16,
  },
  sectionTitle: {
    color: '#06152b',
    fontSize: 20,
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
  rowStatus: { gap: 6, alignItems: 'flex-end' },
  cardPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },
  errorNotice: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  errorText: { color: '#991b1b', fontWeight: '900' },
});