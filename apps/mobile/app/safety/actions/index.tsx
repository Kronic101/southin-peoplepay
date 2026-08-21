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

function sourceNo(action: any) {
  return (
    action?.observation?.observationNo ||
    action?.incident?.incidentNo ||
    action?.sourceNo ||
    action?.sourceId ||
    '-'
  );
}

function sourceDescription(action: any) {
  return (
    action?.observation?.description ||
    action?.incident?.description ||
    action?.sourceType ||
    '-'
  );
}

export default function MobileSafetyActionsPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function loadActions() {
    setLoading(true);
    setMessage('');

    try {
      const result: any = await getSafetyCorrectiveActions();
      setRecords(Array.isArray(result) ? result : result?.actions || []);
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
          View, complete, verify and close corrective actions linked to safety observations and incidents.
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
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{message}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Action Register</Text>

        {loading && records.length === 0 ? <ActivityIndicator /> : null}

        {!loading && records.length === 0 ? (
          <Text style={styles.emptyText}>No corrective actions found.</Text>
        ) : null}

        {records.map((action) => (
          <Pressable
            key={action.id}
            style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
            onPress={() => router.push(`/safety/actions/${action.id}`)}
          >
            <View style={styles.actionHeader}>
              <Text style={styles.actionNo}>{action.actionNo || 'Corrective Action'}</Text>
              <StatusPill status={action.status || 'OPEN'} />
            </View>

            <Text style={styles.actionTitle}>{action.title || '-'}</Text>
            <Text style={styles.meta}>{sourceNo(action)}</Text>
            <Text style={styles.description}>{sourceDescription(action)}</Text>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>
                Assigned: {action.assignedToName || 'Not assigned'}
              </Text>
              <Text style={styles.footerText}>Due: {formatDate(action.dueDate)}</Text>
            </View>

            <View style={styles.priorityRow}>
              <StatusPill status={action.priority || 'MEDIUM'} />
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
  sectionTitle: { color: '#06152b', fontSize: 20, fontWeight: '900', marginBottom: 10 },
  emptyText: { color: '#64748b', fontWeight: '800', paddingVertical: 12 },
  actionCard: {
    borderWidth: 1,
    borderColor: '#d7e1ed',
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    backgroundColor: '#f8fafc',
  },
  actionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionNo: { color: '#06152b', fontWeight: '900', fontSize: 15, flex: 1 },
  actionTitle: { color: '#06152b', fontWeight: '900', fontSize: 18, marginTop: 10 },
  meta: { color: '#f26a21', fontWeight: '900', marginTop: 6 },
  description: { color: '#475569', fontWeight: '700', marginTop: 4, lineHeight: 20 },
  footerRow: { marginTop: 10 },
  footerText: { color: '#64748b', fontWeight: '800', marginTop: 3 },
  priorityRow: { alignItems: 'flex-start', marginTop: 10 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
  notice: {
    backgroundColor: '#fff7ed',
    borderColor: '#fdba74',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  noticeText: { color: '#9a3412', fontWeight: '900' },
});