import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  createSafetyCorrectiveAction,
  getSafetyCorrectiveActionSources,
} from '../../../src/api/safety';
import { SAFETY_RISK_LEVELS } from '../../../src/constants/safety';
import StatusPill from '../../../src/components/StatusPill';

type CorrectiveActionSource = {
  id: string;
  sourceId: string;
  sourceType: 'SAFETY_OBSERVATION' | 'SAFETY_INCIDENT';
  sourceNo: string;
  sourceKind: string;
  riskOrSeverity?: string | null;
  category?: string | null;
  siteId?: string | null;
  siteName?: string | null;
  branch?: string | null;
  exactLocation?: string | null;
  description?: string | null;
  status?: string | null;
  createdAt?: string | null;
  label?: string | null;
};

function todayPlusDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function shortDescription(value?: string | null, limit = 90) {
  const text = String(value || '').trim();

  if (!text) return '-';
  if (text.length <= limit) return text;

  return `${text.slice(0, limit)}...`;
}

function sourceDisplayLabel(source?: CorrectiveActionSource | null) {
  if (!source) return 'Select linked observation or incident';

  return `${source.sourceNo} - ${source.riskOrSeverity || 'N/A'} - ${
    source.siteName || 'No site'
  }`;
}

export default function NewMobileSafetyCorrectiveActionPage() {
  const params = useLocalSearchParams<{
    sourceType?: string;
    sourceId?: string;
    sourceNo?: string;
    siteId?: string;
  }>();

  const [sources, setSources] = useState<CorrectiveActionSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<CorrectiveActionSource | null>(null);

  const [showSources, setShowSources] = useState(false);
  const [sourceSearch, setSourceSearch] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [assignedToName, setAssignedToName] = useState('Chongo Mwesa');
  const [assignedToEmail, setAssignedToEmail] = useState('chongomwesa@southincon.com');
  const [dueDate, setDueDate] = useState(todayPlusDays(7));
  const [createdBy, setCreatedBy] = useState('Mobile Safety User');
  const [createdByEmail, setCreatedByEmail] = useState('mobile@southincon.com');

  const [loadingSources, setLoadingSources] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadSources() {
    setLoadingSources(true);
    setError('');

    try {
      const result: any = await getSafetyCorrectiveActionSources(params.siteId);
      const options: CorrectiveActionSource[] = result?.options || [];

      setSources(options);

      if (params.sourceId) {
        const match = options.find((item) => item.sourceId === params.sourceId);

        if (match) {
          selectSource(match);
        }
      }
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to load safety observations and incidents. Confirm the API is reachable.',
      );
    } finally {
      setLoadingSources(false);
    }
  }

  useEffect(() => {
    loadSources();
  }, []);

  const filteredSources = useMemo(() => {
    const search = sourceSearch.trim().toLowerCase();

    if (!search) return sources;

    return sources.filter((source) => {
      return [
        source.sourceNo,
        source.sourceKind,
        source.riskOrSeverity,
        source.category,
        source.siteName,
        source.branch,
        source.exactLocation,
        source.description,
        source.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search);
    });
  }, [sourceSearch, sources]);

  function selectSource(source: CorrectiveActionSource) {
    setSelectedSource(source);
    setShowSources(false);
    setSourceSearch(source.sourceNo);

    if (!title.trim()) {
      setTitle(`Corrective action for ${source.sourceNo}`);
    }

    if (!description.trim()) {
      setDescription(
        source.description
          ? `Action required for: ${source.description}`
          : `Corrective action linked to ${source.sourceNo}`,
      );
    }

    if (source.riskOrSeverity) {
      const risk = String(source.riskOrSeverity).toUpperCase();

      if (risk === 'LOW') setPriority('LOW');
      if (risk === 'MEDIUM') setPriority('MEDIUM');
      if (risk === 'HIGH') setPriority('HIGH');
      if (risk === 'CRITICAL') setPriority('CRITICAL');
    }
  }

  async function handleSubmit() {
    setError('');
    setMessage('');

    if (!selectedSource) {
      setError('Please select the linked observation or incident.');
      return;
    }

    if (!title.trim()) {
      setError('Action title is required.');
      return;
    }

    if (!description.trim()) {
      setError('Action description is required.');
      return;
    }

    if (!assignedToName.trim()) {
      setError('Assigned person is required.');
      return;
    }

    setSubmitting(true);

    try {
      const created: any = await createSafetyCorrectiveAction({
        sourceType: selectedSource.sourceType,
        sourceId: selectedSource.sourceId,

        title: title.trim(),
        description: description.trim(),
        priority,
        assignedToName: assignedToName.trim(),
        assignedToEmail: assignedToEmail.trim() || null,
        dueDate,
        createdBy: createdBy.trim() || 'Mobile Safety User',
        createdByEmail: createdByEmail.trim() || null,

        siteId: selectedSource.siteId || null,
        siteName: selectedSource.siteName || null,
        branch: selectedSource.branch || null,
        sourceNo: selectedSource.sourceNo,

        deviceId: 'MOBILE-SAFETY',
        syncStatus: 'SYNCED',
        syncedAt: new Date().toISOString(),
      });

      setMessage(`Corrective action created for ${selectedSource.sourceNo}.`);

      if (created?.id) {
        router.replace(`/safety/actions/${created.id}`);
        return;
      }

      router.replace('/safety/actions');
    } catch (err: any) {
      setError(err?.message || 'Unable to create corrective action.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Mobile Safety</Text>
        <Text style={styles.title}>New Corrective Action</Text>
        <Text style={styles.subtitle}>
          Create a corrective action linked to a safety observation or incident.
        </Text>

        <Pressable style={styles.backButton} onPress={() => router.push('/safety/actions')}>
          <Text style={styles.backButtonText}>Back to Actions</Text>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorNotice}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {message ? (
        <View style={styles.successNotice}>
          <Text style={styles.successText}>{message}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Linked Source</Text>
        <Text style={styles.helperText}>
          Select the observation or incident by its SAFE reference number. The system will link the
          internal record automatically.
        </Text>

        <Text style={styles.label}>Search Source</Text>
        <TextInput
          style={styles.input}
          value={sourceSearch}
          onChangeText={(value) => {
            setSourceSearch(value);
            setShowSources(true);
          }}
          placeholder="Search SAFE-OBS, SAFE-INC, site, risk or description"
        />

        <Pressable
          style={styles.darkButton}
          onPress={() => setShowSources((current) => !current)}
        >
          <Text style={styles.darkButtonText}>
            {showSources ? 'Hide Source List' : 'Show Source List'}
          </Text>
        </Pressable>

        {loadingSources ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.helperText}>Loading source records...</Text>
          </View>
        ) : null}

        {showSources ? (
          <View style={styles.sourceList}>
            {filteredSources.length === 0 ? (
              <Text style={styles.emptyText}>No matching observations or incidents found.</Text>
            ) : null}

            {filteredSources.map((source) => {
              const selected = selectedSource?.sourceId === source.sourceId;

              return (
                <Pressable
                  key={`${source.sourceType}-${source.sourceId}`}
                  style={[styles.sourceOption, selected && styles.sourceOptionSelected]}
                  onPress={() => selectSource(source)}
                >
                  <View style={styles.sourceHeader}>
                    <Text style={styles.sourceNo}>{source.sourceNo}</Text>
                    <StatusPill status={source.riskOrSeverity || 'MEDIUM'} />
                  </View>

                  <Text style={styles.sourceKind}>{source.sourceKind}</Text>
                  <Text style={styles.sourceMeta}>
                    {source.siteName || 'No site'} - {source.exactLocation || 'No location'}
                  </Text>
                  <Text style={styles.sourceDescription}>
                    {shortDescription(source.description)}
                  </Text>
                  <Text style={styles.sourceStatus}>Status: {source.status || '-'}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {selectedSource ? (
          <View style={styles.selectedBox}>
            <Text style={styles.selectedTitle}>{sourceDisplayLabel(selectedSource)}</Text>
            <Text style={styles.selectedText}>{selectedSource.sourceKind}</Text>
            <Text style={styles.selectedText}>{shortDescription(selectedSource.description)}</Text>
          </View>
        ) : (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              Select the linked SAFE-OBS or SAFE-INC record before submitting.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Action Details</Text>

        <Field
          label="Action Title"
          value={title}
          onChangeText={setTitle}
          placeholder="Example: Install barricade around scaffold area"
        />

        <Field
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the corrective or preventive action required."
          multiline
        />

        <Text style={styles.label}>Priority</Text>
        <View style={styles.optionGrid}>
          {SAFETY_RISK_LEVELS.map((level: string) => {
            const selected = level === priority;

            return (
              <Pressable
                key={level}
                style={[styles.optionButton, selected && styles.optionSelected]}
                onPress={() => setPriority(level)}
              >
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                  {level}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Field label="Due Date" value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" />

        <Field
          label="Assigned To"
          value={assignedToName}
          onChangeText={setAssignedToName}
          placeholder="Responsible person"
        />

        <Field
          label="Assigned Email"
          value={assignedToEmail}
          onChangeText={setAssignedToEmail}
          placeholder="responsible.person@southincon.com"
        />

        <Field
          label="Created By"
          value={createdBy}
          onChangeText={setCreatedBy}
          placeholder="Captured by"
        />

        <Field
          label="Creator Email"
          value={createdByEmail}
          onChangeText={setCreatedByEmail}
          placeholder="captured.by@southincon.com"
        />

        <Pressable
          style={[styles.submitButton, submitting && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>Create Corrective Action</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textarea]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        multiline={multiline}
      />
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
  sectionTitle: { color: '#06152b', fontSize: 20, fontWeight: '900', marginBottom: 8 },
  helperText: { color: '#64748b', fontWeight: '700', lineHeight: 20, marginBottom: 12 },
  field: { marginBottom: 12 },
  label: { color: '#06152b', fontWeight: '900', marginBottom: 7 },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#06152b',
    fontSize: 16,
  },
  textarea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  darkButton: {
    backgroundColor: '#06152b',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 10,
  },
  darkButtonText: { color: '#ffffff', fontWeight: '900' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  sourceList: {
    borderWidth: 1,
    borderColor: '#d7e1ed',
    borderRadius: 16,
    marginTop: 12,
    overflow: 'hidden',
  },
  sourceOption: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  sourceOptionSelected: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },
  sourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
  },
  sourceNo: { color: '#06152b', fontWeight: '900', fontSize: 15, flex: 1 },
  sourceKind: { color: '#f26a21', fontWeight: '900', marginTop: 5 },
  sourceMeta: { color: '#475569', fontWeight: '800', marginTop: 4 },
  sourceDescription: { color: '#64748b', fontWeight: '700', marginTop: 4, lineHeight: 20 },
  sourceStatus: { color: '#06152b', fontWeight: '800', marginTop: 4 },
  selectedBox: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
  },
  selectedTitle: { color: '#166534', fontWeight: '900', fontSize: 15 },
  selectedText: { color: '#166534', fontWeight: '700', marginTop: 4 },
  warningBox: {
    backgroundColor: '#fff7ed',
    borderColor: '#fdba74',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
  },
  warningText: { color: '#9a3412', fontWeight: '900' },
  emptyText: { color: '#64748b', fontWeight: '800', padding: 14 },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  optionButton: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 11,
    backgroundColor: '#ffffff',
  },
  optionSelected: {
    backgroundColor: '#06152b',
    borderColor: '#06152b',
  },
  optionText: { color: '#06152b', fontWeight: '900' },
  optionTextSelected: { color: '#ffffff' },
  submitButton: {
    backgroundColor: '#f97316',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: { color: '#ffffff', fontWeight: '900' },
  disabledButton: { opacity: 0.7 },
  errorNotice: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  errorText: { color: '#991b1b', fontWeight: '900' },
  successNotice: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  successText: { color: '#166534', fontWeight: '900' },
});