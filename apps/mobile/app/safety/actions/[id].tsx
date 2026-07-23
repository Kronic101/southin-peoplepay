import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
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

import {
  closeSafetyCorrectiveAction,
  completeSafetyCorrectiveAction,
  getSafetyCorrectiveAction,
  verifySafetyCorrectiveAction,
} from '../../../src/api/safety';
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

function sourceDescription(action: any) {
  return (
    action?.observation?.description ||
    action?.incident?.description ||
    action?.sourceType ||
    '-'
  );
}

export default function MobileSafetyActionDetailPage() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = String(params.id || '');

  const [action, setAction] = useState<any | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState('');
  const [message, setMessage] = useState('');

  async function loadAction() {
    if (!id) return;

    setLoading(true);
    setMessage('');

    try {
      const result: any = await getSafetyCorrectiveAction(id);
      setAction(result || null);
    } catch (err: any) {
      setMessage(err?.message || 'Unable to load corrective action.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAction();
  }, [id]);

  async function runAction(type: 'complete' | 'verify' | 'close') {
    if (!id) return;

    setBusyAction(type);
    setMessage('');

    try {
      const payload = {
        notes: notes.trim() || undefined,
        actionedBy: 'Mobile Safety User',
        verifiedBy: 'Mobile Safety User',
        closedBy: 'Mobile Safety User',
      };

      if (type === 'complete') {
        await completeSafetyCorrectiveAction(id, payload);
        setMessage('Corrective action marked as completed.');
      }

      if (type === 'verify') {
        await verifySafetyCorrectiveAction(id, payload);
        setMessage('Corrective action verified.');
      }

      if (type === 'close') {
        await closeSafetyCorrectiveAction(id, payload);
        setMessage('Corrective action closed.');
      }

      setNotes('');
      await loadAction();
    } catch (err: any) {
      setMessage(err?.message || 'Unable to update corrective action.');
    } finally {
      setBusyAction('');
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadAction} />}
    >
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Mobile Safety</Text>
        <Text style={styles.title}>{action?.actionNo || 'Corrective Action'}</Text>
        <Text style={styles.subtitle}>
          Complete, verify and close corrective actions from the field.
        </Text>

        <Pressable style={styles.backButton} onPress={() => router.push('/safety/actions')}>
          <Text style={styles.backButtonText}>Back to Actions</Text>
        </Pressable>
      </View>

      {message ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{message}</Text>
        </View>
      ) : null}

      {loading && !action ? (
        <View style={styles.card}>
          <ActivityIndicator />
          <Text style={styles.muted}>Loading corrective action...</Text>
        </View>
      ) : null}

      {action ? (
        <>
          <View style={styles.card}>
            <View style={styles.statusRow}>
              <StatusPill status={action.status || 'OPEN'} />
              <StatusPill status={action.priority || 'MEDIUM'} />
            </View>

            <Text style={styles.sectionTitle}>{action.title || 'Corrective Action'}</Text>
            <Text style={styles.description}>{action.description || '-'}</Text>

            <Info label="Linked Source" value={sourceLabel(action)} />
            <Info label="Source Description" value={sourceDescription(action)} />
            <Info label="Assigned To" value={action.assignedToName || 'Not assigned'} />
            <Info label="Assigned Email" value={action.assignedToEmail || '-'} />
            <Info label="Due Date" value={formatDate(action.dueDate)} />
            <Info label="Created By" value={action.createdBy || '-'} />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Closeout Notes</Text>

            <TextInput
              style={styles.textarea}
              value={notes}
              onChangeText={setNotes}
              placeholder="Enter completion, verification or closeout notes."
              multiline
            />

            <Pressable
              style={styles.primaryButton}
              disabled={!!busyAction}
              onPress={() => runAction('complete')}
            >
              {busyAction === 'complete' ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>Mark Completed</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              disabled={!!busyAction}
              onPress={() => runAction('verify')}
            >
              {busyAction === 'verify' ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.secondaryButtonText}>Verify Action</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              disabled={!!busyAction}
              onPress={() => runAction('close')}
            >
              {busyAction === 'close' ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.secondaryButtonText}>Close Action</Text>
              )}
            </Pressable>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
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
  backButton: {
    backgroundColor: '#06152b',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 14,
  },
  backButtonText: { color: '#ffffff', fontWeight: '900' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ccd8e5',
    padding: 16,
    marginBottom: 14,
  },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  sectionTitle: {
    color: '#06152b',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
  },
  description: { color: '#475569', fontWeight: '700', lineHeight: 22 },
  infoBox: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingVertical: 12,
  },
  infoLabel: {
    color: '#64748b',
    textTransform: 'uppercase',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  infoValue: { color: '#06152b', fontWeight: '900', marginTop: 4 },
  textarea: {
    minHeight: 120,
    textAlignVertical: 'top',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#06152b',
    fontSize: 16,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#f97316',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: { color: '#ffffff', fontWeight: '900' },
  secondaryButton: {
    backgroundColor: '#06152b',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  secondaryButtonText: { color: '#ffffff', fontWeight: '900' },
  notice: {
    backgroundColor: '#fff7ed',
    borderColor: '#fdba74',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  noticeText: { color: '#9a3412', fontWeight: '900' },
  muted: { color: '#64748b', fontWeight: '700', marginTop: 10 },
});