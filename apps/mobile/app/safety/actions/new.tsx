import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { createSafetyCorrectiveAction } from '../../../src/api/safety';
import { SAFETY_RISK_LEVELS } from '../../../src/constants/safety';

function todayPlusDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function NewMobileSafetyCorrectiveActionPage() {
  const params = useLocalSearchParams<{
    sourceType?: string;
    sourceId?: string;
    sourceNo?: string;
  }>();

  const [sourceType, setSourceType] = useState(
    params.sourceType || 'SAFETY_OBSERVATION',
  );
  const [sourceId, setSourceId] = useState(params.sourceId || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [assignedToName, setAssignedToName] = useState('');
  const [assignedToEmail, setAssignedToEmail] = useState('');
  const [dueDate, setDueDate] = useState(todayPlusDays(7));
  const [createdBy, setCreatedBy] = useState('Chongo Mwesa');
  const [createdByEmail, setCreatedByEmail] = useState(
    'chongomwesa@southincon.com',
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setError('');

    if (!sourceType) {
      setError('Please select the source type.');
      return;
    }

    if (!sourceId.trim()) {
      setError('Source record ID is required.');
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

    setSubmitting(true);

    try {
      await createSafetyCorrectiveAction({
        sourceType: sourceType as 'SAFETY_OBSERVATION' | 'SAFETY_INCIDENT',
        sourceId: sourceId.trim(),

        title: title.trim(),
        description: description.trim(),
        priority,

        assignedToName: assignedToName.trim() || null,
        assignedToEmail: assignedToEmail.trim() || null,
        dueDate: dueDate.trim() || null,

        createdBy: createdBy.trim() || null,
        createdByEmail: createdByEmail.trim() || null,
      });

      router.replace('/safety');
    } catch (err: any) {
      setError(err?.message || 'Failed to create corrective action.');
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
          Create an action linked to a safety observation or incident.
        </Text>

        {params.sourceNo ? (
          <Text style={styles.linkedText}>Linked Source: {params.sourceNo}</Text>
        ) : null}

        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorNotice}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Linked Source</Text>

        <Text style={styles.label}>Source Type</Text>
        <View style={styles.optionWrap}>
          {[
            { label: 'Observation', value: 'SAFETY_OBSERVATION' },
            { label: 'Incident', value: 'SAFETY_INCIDENT' },
          ].map((item) => {
            const selected = item.value === sourceType;

            return (
              <Pressable
                key={item.value}
                style={[styles.optionButton, selected && styles.optionSelected]}
                onPress={() => setSourceType(item.value)}
              >
                <Text
                  style={[
                    styles.optionText,
                    selected && styles.optionTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Field
          label="Source Record ID"
          value={sourceId}
          onChangeText={setSourceId}
          placeholder="Observation or incident UUID"
        />
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
          multiline
          placeholder="Describe the corrective or preventive action required."
        />

        <Text style={styles.label}>Priority</Text>
        <View style={styles.optionWrap}>
          {SAFETY_RISK_LEVELS.map((item) => {
            const selected = item.value === priority;

            return (
              <Pressable
                key={item.value}
                style={[styles.optionButton, selected && styles.optionSelected]}
                onPress={() => setPriority(item.value)}
              >
                <Text
                  style={[
                    styles.optionText,
                    selected && styles.optionTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Field
          label="Due Date"
          value={dueDate}
          onChangeText={setDueDate}
          placeholder="YYYY-MM-DD"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Assignment</Text>

        <Field
          label="Assigned To Name"
          value={assignedToName}
          onChangeText={setAssignedToName}
          placeholder="Person responsible"
        />

        <Field
          label="Assigned To Email"
          value={assignedToEmail}
          onChangeText={setAssignedToEmail}
          placeholder="name@southincon.com"
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Field
          label="Created By"
          value={createdBy}
          onChangeText={setCreatedBy}
        />

        <Field
          label="Created By Email"
          value={createdByEmail}
          onChangeText={setCreatedByEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>

      <Pressable
        style={[styles.submitButton, submitting && styles.disabledButton]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.submitButtonText}>
          {submitting ? 'Creating...' : 'Create Corrective Action'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  autoCapitalize,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'numeric';
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
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
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
  linkedText: {
    color: '#92400e',
    backgroundColor: '#ffedd5',
    borderColor: '#fdba74',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
    fontWeight: '900',
  },
  backButton: {
    backgroundColor: '#06152b',
    borderRadius: 12,
    paddingVertical: 11,
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
  sectionTitle: {
    color: '#06152b',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 10,
  },
  label: {
    color: '#06152b',
    fontWeight: '900',
    marginBottom: 6,
    marginTop: 8,
  },
  field: { marginBottom: 10 },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: '#06152b',
    fontWeight: '700',
  },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
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
    marginTop: 4,
  },
  submitButtonText: { color: '#ffffff', fontWeight: '900', fontSize: 16 },
  disabledButton: { opacity: 0.65 },
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