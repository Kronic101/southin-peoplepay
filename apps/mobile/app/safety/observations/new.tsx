import { router } from 'expo-router';
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
  createSafetyObservation,
  getSafetySites,
} from '../../../src/api/safety';
import {
  makeMobileId,
  SAFETY_OBSERVATION_TYPES,
  SAFETY_RISK_LEVELS,
  todayIso,
} from '../../../src/constants/safety';
import { SafetySite } from '../../../src/types/safety';

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

export default function NewMobileSafetyObservationPage() {
  const [sites, setSites] = useState<SafetySite[]>([]);
  const [loadingSites, setLoadingSites] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [siteId, setSiteId] = useState('');
  const [branch, setBranch] = useState('Solwezi');
  const [department, setDepartment] = useState('Operations');
  const [exactLocation, setExactLocation] = useState('');
  const [observationDate, setObservationDate] = useState(todayDateOnly());
  const [observationType, setObservationType] = useState('UNSAFE_CONDITION');
  const [riskLevel, setRiskLevel] = useState('LOW');
  const [description, setDescription] = useState('');
  const [immediateAction, setImmediateAction] = useState('');
  const [personObserved, setPersonObserved] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [contractorName, setContractorName] = useState('');
  const [gpsLatitude, setGpsLatitude] = useState('');
  const [gpsLongitude, setGpsLongitude] = useState('');
  const [reportedBy, setReportedBy] = useState('Chongo Mwesa');
  const [reportedByEmail, setReportedByEmail] = useState(
    'chongomwesa@southincon.com',
  );

  const mobileDraftId = useMemo(() => makeMobileId('LOCAL-OBS'), []);
  const idempotencyKey = useMemo(() => makeMobileId('MOBILE-OBS'), []);

  const selectedSite = sites.find((site) => site.id === siteId) || null;

  async function loadSites() {
    setLoadingSites(true);
    setError('');

    try {
      const result = await getSafetySites();
      setSites(result || []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load site list.');
    } finally {
      setLoadingSites(false);
    }
  }

  useEffect(() => {
    loadSites();
  }, []);

  async function handleSubmit() {
    setError('');

    if (!selectedSite) {
      setError('Please select a site.');
      return;
    }

    if (!exactLocation.trim()) {
      setError('Exact location is required.');
      return;
    }

    if (!description.trim()) {
      setError('Description is required.');
      return;
    }

    setSubmitting(true);

    try {
      await createSafetyObservation({
        siteId: selectedSite.id,
        siteName: selectedSite.name,
        branch: branch.trim() || null,
        department: department.trim() || null,
        exactLocation: exactLocation.trim(),

        observationDate,
        observationType,
        riskLevel,

        description: description.trim(),
        immediateAction: immediateAction.trim() || null,

        personObserved: personObserved.trim() || null,
        employeeId: employeeId.trim() || null,
        contractorName: contractorName.trim() || null,

        reportedBy: reportedBy.trim() || 'Mobile safety user',
        reportedByEmail: reportedByEmail.trim() || null,

        photoUrls: [],
        gpsLatitude: gpsLatitude.trim() || null,
        gpsLongitude: gpsLongitude.trim() || null,

        mobileDraftId,
        idempotencyKey,
        syncStatus: 'PENDING_SYNC',
        deviceId: 'MOBILE-WEB',
        capturedOfflineAt: todayIso(),
      });

      router.replace('/safety');
    } catch (err: any) {
      setError(err?.message || 'Failed to submit safety observation.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Mobile Safety</Text>
        <Text style={styles.title}>New Observation</Text>
        <Text style={styles.subtitle}>
          Capture unsafe acts, unsafe conditions, PPE non-compliance, or positive
          safety observations.
        </Text>

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
        <Text style={styles.sectionTitle}>Site / Location</Text>

        {loadingSites ? <ActivityIndicator /> : null}

        <View style={styles.optionWrap}>
          {sites.map((site) => {
            const selected = site.id === siteId;

            return (
              <Pressable
                key={site.id}
                style={[styles.optionButton, selected && styles.optionSelected]}
                onPress={() => setSiteId(site.id)}
              >
                <Text
                  style={[
                    styles.optionText,
                    selected && styles.optionTextSelected,
                  ]}
                >
                  {site.code ? `${site.code} - ` : ''}
                  {site.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Field label="Branch" value={branch} onChangeText={setBranch} />
        <Field
          label="Department"
          value={department}
          onChangeText={setDepartment}
        />
        <Field
          label="Exact Location"
          value={exactLocation}
          onChangeText={setExactLocation}
          placeholder="Workshop, scaffold bay, laydown area..."
        />
        <Field
          label="Observation Date"
          value={observationDate}
          onChangeText={setObservationDate}
          placeholder="YYYY-MM-DD"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Observation Details</Text>

        <Text style={styles.label}>Observation Type</Text>
        <View style={styles.optionWrap}>
          {SAFETY_OBSERVATION_TYPES.map((item) => {
            const selected = item.value === observationType;

            return (
              <Pressable
                key={item.value}
                style={[styles.optionButton, selected && styles.optionSelected]}
                onPress={() => setObservationType(item.value)}
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

        <Text style={styles.label}>Risk Level</Text>
        <View style={styles.optionWrap}>
          {SAFETY_RISK_LEVELS.map((item) => {
            const selected = item.value === riskLevel;

            return (
              <Pressable
                key={item.value}
                style={[styles.optionButton, selected && styles.optionSelected]}
                onPress={() => setRiskLevel(item.value)}
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
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="Describe what was observed."
        />

        <Field
          label="Immediate Action Taken"
          value={immediateAction}
          onChangeText={setImmediateAction}
          multiline
          placeholder="What immediate control or correction was done?"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>People / Contractor</Text>

        <Field
          label="Person Observed"
          value={personObserved}
          onChangeText={setPersonObserved}
          placeholder="Optional"
        />
        <Field
          label="Employee ID"
          value={employeeId}
          onChangeText={setEmployeeId}
          placeholder="Optional employee UUID"
        />
        <Field
          label="Contractor Name"
          value={contractorName}
          onChangeText={setContractorName}
          placeholder="Optional"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>GPS / Reporter</Text>

        <Field
          label="GPS Latitude"
          value={gpsLatitude}
          onChangeText={setGpsLatitude}
          placeholder="-12.1845000"
        />
        <Field
          label="GPS Longitude"
          value={gpsLongitude}
          onChangeText={setGpsLongitude}
          placeholder="26.3972000"
        />
        <Field
          label="Reported By"
          value={reportedBy}
          onChangeText={setReportedBy}
        />
        <Field
          label="Reporter Email"
          value={reportedByEmail}
          onChangeText={setReportedByEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.syncText}>Mobile Draft ID: {mobileDraftId}</Text>
        <Text style={styles.syncText}>Sync Status: PENDING_SYNC</Text>
      </View>

      <Pressable
        style={[styles.submitButton, submitting && styles.disabledButton]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.submitButtonText}>
          {submitting ? 'Submitting...' : 'Submit Observation'}
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
  syncText: { color: '#64748b', fontWeight: '800', marginTop: 4 },
});