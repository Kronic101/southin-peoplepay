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
  createSafetyIncident,
  getSafetySites,
} from '../../../src/api/safety';
import {
  makeMobileId,
  SAFETY_INCIDENT_TYPES,
  SAFETY_RISK_LEVELS,
  todayIso,
} from '../../../src/constants/safety';
import { SafetySite } from '../../../src/types/safety';

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

export default function NewMobileSafetyIncidentPage() {
  const [sites, setSites] = useState<SafetySite[]>([]);
  const [loadingSites, setLoadingSites] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [siteId, setSiteId] = useState('');
  const [branch, setBranch] = useState('Solwezi');
  const [department, setDepartment] = useState('Operations');
  const [exactLocation, setExactLocation] = useState('');
  const [incidentDate, setIncidentDate] = useState(todayDateOnly());
  const [incidentType, setIncidentType] = useState('NEAR_MISS');
  const [severity, setSeverity] = useState('MEDIUM');
  const [description, setDescription] = useState('');
  const [immediateAction, setImmediateAction] = useState('');
  const [injuredPersonName, setInjuredPersonName] = useState('');
  const [injuredEmployeeId, setInjuredEmployeeId] = useState('');
  const [contractorCompany, setContractorCompany] = useState('');
  const [injuryType, setInjuryType] = useState('');
  const [bodyPart, setBodyPart] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [investigationNotes, setInvestigationNotes] = useState('');
  const [gpsLatitude, setGpsLatitude] = useState('');
  const [gpsLongitude, setGpsLongitude] = useState('');
  const [reportedBy, setReportedBy] = useState('Chongo Mwesa');
  const [reportedByEmail, setReportedByEmail] = useState(
    'chongomwesa@southincon.com',
  );

  const mobileDraftId = useMemo(() => makeMobileId('LOCAL-INC'), []);
  const idempotencyKey = useMemo(() => makeMobileId('MOBILE-INC'), []);

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
      await createSafetyIncident({
        siteId: selectedSite.id,
        siteName: selectedSite.name,
        branch: branch.trim() || null,
        department: department.trim() || null,
        exactLocation: exactLocation.trim(),

        incidentDate,
        incidentType,
        severity,

        description: description.trim(),
        immediateAction: immediateAction.trim() || null,

        injuredPersonName: injuredPersonName.trim() || null,
        injuredEmployeeId: injuredEmployeeId.trim() || null,
        contractorCompany: contractorCompany.trim() || null,
        injuryType: injuryType.trim() || null,
        bodyPart: bodyPart.trim() || null,

        rootCause: rootCause.trim() || null,
        investigationNotes: investigationNotes.trim() || null,

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
      setError(err?.message || 'Failed to submit safety incident.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Mobile Safety</Text>
        <Text style={styles.title}>Report Incident / Near Miss</Text>
        <Text style={styles.subtitle}>
          Capture incidents, near misses, injuries, property damage, and
          environmental events.
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
          placeholder="Laydown area, workshop, site office..."
        />
        <Field
          label="Incident Date"
          value={incidentDate}
          onChangeText={setIncidentDate}
          placeholder="YYYY-MM-DD"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Incident Details</Text>

        <Text style={styles.label}>Incident Type</Text>
        <View style={styles.optionWrap}>
          {SAFETY_INCIDENT_TYPES.map((item) => {
            const selected = item.value === incidentType;

            return (
              <Pressable
                key={item.value}
                style={[styles.optionButton, selected && styles.optionSelected]}
                onPress={() => setIncidentType(item.value)}
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

        <Text style={styles.label}>Severity</Text>
        <View style={styles.optionWrap}>
          {SAFETY_RISK_LEVELS.map((item) => {
            const selected = item.value === severity;

            return (
              <Pressable
                key={item.value}
                style={[styles.optionButton, selected && styles.optionSelected]}
                onPress={() => setSeverity(item.value)}
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
          placeholder="Describe what happened."
        />

        <Field
          label="Immediate Action Taken"
          value={immediateAction}
          onChangeText={setImmediateAction}
          multiline
          placeholder="What was done immediately to control the risk?"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Injury / Contractor Details</Text>

        <Field
          label="Injured Person"
          value={injuredPersonName}
          onChangeText={setInjuredPersonName}
          placeholder="Optional"
        />
        <Field
          label="Injured Employee ID"
          value={injuredEmployeeId}
          onChangeText={setInjuredEmployeeId}
          placeholder="Optional employee UUID"
        />
        <Field
          label="Contractor Company"
          value={contractorCompany}
          onChangeText={setContractorCompany}
          placeholder="Optional"
        />
        <Field
          label="Injury Type"
          value={injuryType}
          onChangeText={setInjuryType}
          placeholder="Optional"
        />
        <Field
          label="Body Part"
          value={bodyPart}
          onChangeText={setBodyPart}
          placeholder="Optional"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Investigation Notes</Text>

        <Field
          label="Root Cause / Initial Cause"
          value={rootCause}
          onChangeText={setRootCause}
          multiline
          placeholder="Optional at reporting stage."
        />

        <Field
          label="Investigation Notes"
          value={investigationNotes}
          onChangeText={setInvestigationNotes}
          multiline
          placeholder="Optional at reporting stage."
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
          {submitting ? 'Submitting...' : 'Submit Incident'}
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