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

import { createFleetTrip, getFleetVehicles } from '../../../src/api/fleet';
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

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
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

export default function NewFleetTripPage() {
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [showVehicleList, setShowVehicleList] = useState(false);
  const [vehicleId, setVehicleId] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleRecord | null>(null);

  const [driverName, setDriverName] = useState('Fleet Driver');
  const [drivingPermitNo, setDrivingPermitNo] = useState('');
  const [purpose, setPurpose] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [openingOdometer, setOpeningOdometer] = useState('');
  const [notes, setNotes] = useState('');

  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'SUCCESS' | 'OFFLINE' | 'ERROR'>('IDLE');

  const { identity } = useDriverIdentity();

  useEffect(() => {
    setDriverName((current) =>
      current && current !== 'Fleet Driver' ? current : identity.driverName,
    );
    setDrivingPermitNo((current) => current || identity.drivingPermitNo);
    setOrigin((current) => current || identity.site);
  }, [identity.driverName, identity.drivingPermitNo, identity.site]);

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
      setOpeningOdometer(String(vehicle.odometerCurrent));
    }

    if (vehicle.site) {
      setOrigin(vehicle.site);
    }
  }

  function resetForm() {
    setPurpose('');
    setDestination('');
    setNotes('');
    setDrivingPermitNo('');
    setOpeningOdometer(
      selectedVehicle?.odometerCurrent ? String(selectedVehicle.odometerCurrent) : '',
    );
    setOrigin(selectedVehicle?.site || '');
  }

  function buildPayload() {
    if (!vehicleId || !selectedVehicle) {
      throw new Error('Please select a vehicle.');
    }

    if (!driverName.trim()) {
      throw new Error('Driver name is required.');
    }

    if (!purpose.trim()) {
      throw new Error('Trip purpose is required.');
    }

    if (!origin.trim()) {
      throw new Error('Origin is required.');
    }

    if (!destination.trim()) {
      throw new Error('Destination is required.');
    }

    if (asNumber(openingOdometer) <= 0) {
      throw new Error('Opening odometer is required.');
    }

    return {
      vehicleId,
      tripDate: new Date().toISOString(),
      driverName: driverName.trim() || identity.driverName,
      employeeNo: identity.employeeNo || undefined,
      employeeNumber: identity.employeeNumber || undefined,
      drivingPermitNo: drivingPermitNo.trim() || identity.drivingPermitNo || undefined,
      department: identity.department,
      site: selectedVehicle.site || identity.site,
      submittedBy: identity.submittedBy,
      purpose: purpose.trim(),
      origin: origin.trim(),
      destination: destination.trim(),
      openingOdometer: String(asNumber(openingOdometer)),
      startOdometer: String(asNumber(openingOdometer)),
      odometerStart: String(asNumber(openingOdometer)),
      status: 'PLANNED',
      notes: notes.trim() || undefined,
      submittedFrom: 'MOBILE',
    };
  }

  async function handleSubmit() {
    setSubmitting(true);
    setMessage('');
    setStatus('IDLE');

    try {
      const payload = buildPayload();
      const result: any = await createFleetTrip(payload);

      setStatus('SUCCESS');
      setMessage(`Trip ${result?.tripNo || ''} created successfully.`);
      resetForm();
    } catch (err: any) {
      try {
        if (isNetworkError(err)) {
          const payload = buildPayload();

          await enqueueOfflineRequest({
            type: 'FLEET_TRIP',
            path: '/fleet/trips',
            method: 'POST',
            payload,
          });

          setStatus('OFFLINE');
          setMessage('Trip saved offline. It will sync when signal is available.');
          resetForm();
          return;
        }

        setStatus('ERROR');
        setMessage(err?.message || 'Unable to create trip.');
      } catch (offlineErr: any) {
        setStatus('ERROR');
        setMessage(offlineErr?.message || err?.message || 'Unable to create trip.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.mobileTopBar}>
        <Text style={styles.mobileTopBarText}>fleet/trips/new</Text>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Fleet Management</Text>
        <Text style={styles.heroTitle}>Start Fleet Trip</Text>
        <Text style={styles.heroText}>
          Create a trip dispatch record with vehicle, driver, route and opening odometer. The trip
          can later be closed with the final odometer reading.
        </Text>

        <Pressable style={styles.heroSecondaryButton} onPress={() => router.push('/fleet/trips')}>
          <Text style={styles.heroSecondaryButtonText}>Trip Register</Text>
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
        <Text style={styles.sectionTitle}>Trip Details</Text>

        <Text style={styles.label}>Driver Name</Text>
        <TextInput
          style={styles.input}
          value={driverName}
          onChangeText={setDriverName}
          placeholder="Driver name"
        />

        <Text style={styles.label}>Driving Permit No.</Text>
        <TextInput
          style={styles.input}
          value={drivingPermitNo}
          onChangeText={setDrivingPermitNo}
          placeholder="Permit number"
        />

        <Text style={styles.label}>Purpose</Text>
        <TextInput
          style={styles.input}
          value={purpose}
          onChangeText={setPurpose}
          placeholder="e.g. Site delivery, inspection, staff movement"
        />

        <Text style={styles.label}>Origin</Text>
        <TextInput
          style={styles.input}
          value={origin}
          onChangeText={setOrigin}
          placeholder="Starting location"
        />

        <Text style={styles.label}>Destination</Text>
        <TextInput
          style={styles.input}
          value={destination}
          onChangeText={setDestination}
          placeholder="Destination"
        />

        <Text style={styles.label}>Opening Odometer</Text>
        <TextInput
          style={styles.input}
          value={openingOdometer}
          onChangeText={setOpeningOdometer}
          keyboardType="numeric"
          placeholder="Opening odometer"
        />

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Dispatch notes, cargo, passengers or route comments"
          multiline
        />

        <Pressable
          style={[styles.submitButton, submitting ? styles.submitButtonDisabled : null]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>Start Trip</Text>
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