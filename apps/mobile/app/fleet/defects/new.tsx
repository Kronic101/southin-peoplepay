'use client';

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

import { createFleetDefect, getFleetVehicles } from '../../../src/api/fleet';
import { enqueueOfflineRequest } from '../../../src/storage/offlineQueue';
import { useDriverIdentity } from '../../../src/hooks/useDriverIdentity';

type VehicleRecord = {
  id: string;
  registrationNo?: string | null;
  make?: string | null;
  model?: string | null;
  site?: string | null;
  odometerCurrent?: string | number | null;
};

function normalize(value: string) {
  return value.replace(/\s+/g, '').toUpperCase();
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

export default function NewFleetDefectPage() {
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [showVehicleList, setShowVehicleList] = useState(false);
  const [vehicleId, setVehicleId] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleRecord | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [reportedBy, setReportedBy] = useState('Fleet Driver');
  const [odometer, setOdometer] = useState('');
  const [location, setLocation] = useState('');

  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'SUCCESS' | 'OFFLINE' | 'ERROR'>('IDLE');

  const { identity } = useDriverIdentity();

  useEffect(() => {
    setReportedBy((current) =>
      current && current !== 'Fleet Driver' ? current : identity.driverName,
    );
    setLocation((current) => current || identity.site);
  }, [identity.driverName, identity.site]);

  async function loadVehicles() {
    setLoadingVehicles(true);
    setMessage('');

    try {
      const result = await getFleetVehicles();
      setVehicles(result || []);
    } catch (err: any) {
      setStatus('ERROR');
      setMessage(err?.message || 'Unable to load vehicles.');
    } finally {
      setLoadingVehicles(false);
    }
  }

  useEffect(() => {
    loadVehicles();
  }, []);

  const filteredVehicles = useMemo(() => {
    const search = normalize(vehicleSearch);

    if (!search) {
      return vehicles;
    }

    return vehicles.filter((vehicle) => {
      return (
        normalize(vehicle.registrationNo || '').includes(search) ||
        normalize(vehicle.make || '').includes(search) ||
        normalize(vehicle.model || '').includes(search) ||
        normalize(vehicle.site || '').includes(search)
      );
    });
  }, [vehicleSearch, vehicles]);

  function selectVehicle(vehicle: VehicleRecord) {
    setSelectedVehicle(vehicle);
    setVehicleId(vehicle.id);
    setVehicleSearch(vehicle.registrationNo || '');
    setShowVehicleList(false);
    setStatus('IDLE');
    setMessage('');

    if (vehicle.odometerCurrent) {
      setOdometer(String(vehicle.odometerCurrent));
    }

    if (vehicle.site) {
      setLocation(vehicle.site);
    }
  }

  function resetForm() {
    setTitle('');
    setDescription('');
    setSeverity('MEDIUM');
    setOdometer(selectedVehicle?.odometerCurrent ? String(selectedVehicle.odometerCurrent) : '');
    setLocation(selectedVehicle?.site || '');
  }

  function buildPayload() {
    if (!vehicleId || !selectedVehicle) {
      throw new Error('Please select a vehicle.');
    }

    if (!title.trim()) {
      throw new Error('Please enter the defect title.');
    }

    if (!description.trim()) {
      throw new Error('Please describe the defect.');
    }

    return {
      vehicleId,
      title: title.trim(),
      description: description.trim(),
      severity,
      status: 'OPEN',
      reportedBy: reportedBy.trim() || identity.driverName,
      employeeNo: identity.employeeNo || undefined,
      employeeNumber: identity.employeeNumber || undefined,
      department: identity.department,
      site: selectedVehicle.site || identity.site,
      odometer: odometer.trim() || undefined,
      location: location.trim() || selectedVehicle.site || identity.site || undefined,
      reportedAt: new Date().toISOString(),
      submittedBy: identity.submittedBy,
      submittedFrom: 'MOBILE',
    };
  }

  async function handleSubmit() {
    setSubmitting(true);
    setMessage('');
    setStatus('IDLE');

    try {
      const payload = buildPayload();
      const result: any = await createFleetDefect(payload);

      setStatus('SUCCESS');
      setMessage(`Defect ${result?.defectNo || ''} submitted successfully.`);
      resetForm();
    } catch (err: any) {
      try {
        if (isNetworkError(err)) {
          const payload = buildPayload();

          await enqueueOfflineRequest({
            type: 'FLEET_DEFECT',
            path: '/fleet/defects',
            method: 'POST',
            payload,
          });

          setStatus('OFFLINE');
          setMessage('Defect saved offline. It will sync when signal is available.');
          resetForm();
          return;
        }

        setStatus('ERROR');
        setMessage(err?.message || 'Unable to submit defect.');
      } catch (offlineErr: any) {
        setStatus('ERROR');
        setMessage(offlineErr?.message || err?.message || 'Unable to submit defect.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.mobileTopBar}>
        <Text style={styles.mobileTopBarText}>fleet/defects/new</Text>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Fleet Management</Text>
        <Text style={styles.heroTitle}>Raise Vehicle Defect</Text>
        <Text style={styles.heroText}>
          Report vehicle issues manually. Defects can also be generated automatically from failed
          pre-start inspection items.
        </Text>

        <Pressable style={styles.heroSecondaryButton} onPress={() => router.push('/fleet/defects')}>
          <Text style={styles.heroSecondaryButtonText}>Defect Register</Text>
        </Pressable>
      </View>

      {message ? (
        <View
          style={[
            styles.statusNotice,
            status === 'SUCCESS'
              ? styles.successNotice
              : status === 'OFFLINE'
                ? styles.warningNotice
                : styles.errorNotice,
          ]}
        >
          <Text
            style={[
              styles.statusNoticeText,
              status === 'SUCCESS'
                ? styles.successText
                : status === 'OFFLINE'
                  ? styles.warningText
                  : styles.errorText,
            ]}
          >
            {message}
          </Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Vehicle Details</Text>

        <Text style={styles.label}>Vehicle No.</Text>
        <TextInput
          style={styles.input}
          value={vehicleSearch}
          onChangeText={(value) => {
            setVehicleSearch(value);
            setShowVehicleList(true);

            if (
              selectedVehicle &&
              normalize(value) !== normalize(selectedVehicle.registrationNo || '')
            ) {
              setSelectedVehicle(null);
              setVehicleId('');
            }
          }}
          onFocus={() => setShowVehicleList(true)}
          placeholder="Search or select vehicle, e.g. ALB 1234"
          autoCapitalize="characters"
        />

        <Pressable
          style={styles.dropdownButton}
          onPress={() => setShowVehicleList((current) => !current)}
        >
          <Text style={styles.dropdownButtonText}>
            {showVehicleList ? 'Hide Vehicle List' : 'Show Vehicle List'}
          </Text>
        </Pressable>

        {loadingVehicles ? (
          <View style={styles.inlineStatus}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading vehicles...</Text>
          </View>
        ) : null}

        {showVehicleList ? (
          <View style={styles.dropdownList}>
            {filteredVehicles.length === 0 ? (
              <Text style={styles.dropdownEmpty}>No vehicles found.</Text>
            ) : (
              filteredVehicles.map((vehicle) => (
                <Pressable
                  key={vehicle.id}
                  style={styles.vehicleOption}
                  onPress={() => selectVehicle(vehicle)}
                >
                  <Text style={styles.vehicleOptionTitle}>
                    {vehicle.registrationNo || 'Unknown Registration'}
                  </Text>
                  <Text style={styles.vehicleOptionMeta}>
                    {[vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Vehicle'}
                    {' • '}
                    {vehicle.site || 'No site recorded'}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        ) : null}

        {selectedVehicle ? (
          <View style={styles.vehicleMatchBox}>
            <Text style={styles.vehicleMatchTitle}>
              {selectedVehicle.registrationNo} selected successfully
            </Text>
            <Text style={styles.vehicleMatchText}>
              {[selectedVehicle.make, selectedVehicle.model].filter(Boolean).join(' ') ||
                'Vehicle'}
              {' • '}
              {selectedVehicle.site || 'No site recorded'}
            </Text>
          </View>
        ) : (
          <View style={styles.vehicleWarningBox}>
            <Text style={styles.vehicleWarningText}>Select the vehicle before submitting.</Text>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Defect Details</Text>

        <Text style={styles.label}>Severity</Text>
        <View style={styles.severityGrid}>
          {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((item) => (
            <Pressable
              key={item}
              style={[styles.severityButton, severity === item ? styles.severityActive : null]}
              onPress={() => setSeverity(item)}
            >
              <Text style={styles.severityButtonText}>{item}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Defect Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Left headlight not working"
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the issue and any safety risk"
          multiline
        />

        <Text style={styles.label}>Reported By</Text>
        <TextInput
          style={styles.input}
          value={reportedBy}
          onChangeText={setReportedBy}
          placeholder="Driver name"
        />

        <Text style={styles.label}>Odometer</Text>
        <TextInput
          style={styles.input}
          value={odometer}
          onChangeText={setOdometer}
          keyboardType="numeric"
          placeholder="Current odometer"
        />

        <Text style={styles.label}>Location</Text>
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder="Current location"
        />

        <Pressable
          style={[styles.submitButton, submitting ? styles.submitButtonDisabled : null]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Defect</Text>
          )}
        </Pressable>
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
  heroSecondaryButton: {
    backgroundColor: '#06152b',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  heroSecondaryButtonText: {
    color: '#ffffff',
    fontWeight: '900',
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
    marginBottom: 14,
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
  textArea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  dropdownButton: {
    backgroundColor: '#06152b',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  dropdownButtonText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  dropdownEmpty: {
    padding: 14,
    color: '#64748b',
    fontWeight: '700',
  },
  vehicleOption: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  vehicleOptionTitle: {
    color: '#06152b',
    fontWeight: '900',
    fontSize: 15,
  },
  vehicleOptionMeta: {
    color: '#64748b',
    marginTop: 4,
    fontWeight: '700',
  },
  inlineStatus: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginVertical: 8,
  },
  muted: {
    color: '#64748b',
  },
  vehicleMatchBox: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
    borderWidth: 1,
    padding: 12,
    borderRadius: 14,
    marginTop: 6,
  },
  vehicleMatchTitle: {
    color: '#166534',
    fontWeight: '900',
  },
  vehicleMatchText: {
    color: '#166534',
    marginTop: 3,
  },
  vehicleWarningBox: {
    backgroundColor: '#fff7ed',
    borderColor: '#fdba74',
    borderWidth: 1,
    padding: 12,
    borderRadius: 14,
    marginTop: 6,
  },
  vehicleWarningText: {
    color: '#9a3412',
    fontWeight: '800',
  },
  severityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  severityButton: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  severityActive: {
    backgroundColor: '#ffedd5',
    borderColor: '#fdba74',
  },
  severityButtonText: {
    color: '#06152b',
    fontWeight: '900',
  },
  statusNotice: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  successNotice: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },
  warningNotice: {
    backgroundColor: '#fff7ed',
    borderColor: '#fdba74',
  },
  errorNotice: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
  },
  statusNoticeText: {
    fontWeight: '900',
  },
  successText: {
    color: '#166534',
  },
  warningText: {
    color: '#9a3412',
  },
  errorText: {
    color: '#991b1b',
  },
  submitButton: {
    backgroundColor: '#f26a21',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 16,
  },
});