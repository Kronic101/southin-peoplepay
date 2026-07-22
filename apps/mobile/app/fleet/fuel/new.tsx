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

import {
  createFleetFuelLog,
  getFleetMobileContext,
} from '../../../src/api/fleet';
import { enqueueOfflineRequest } from '../../../src/storage/offlineQueue';
import { useDriverIdentity } from '../../../src/hooks/useDriverIdentity';

type VehicleRecord = {
  id: string;
  registrationNo?: string | null;
  assetId?: string | null;

  make?: string | null;
  model?: string | null;
  year?: number | null;
  vehicleType?: string | null;
  status?: string | null;

  odometerCurrent?: string | number | null;

  site?: string | null;
  siteName?: string | null;
  department?: string | null;
  isPoolVehicle?: boolean;

  activeDriver?: {
    id: string;
    employeeId?: string | null;
    employeeNumber?: string | null;
    driverName?: string | null;
    licenceNo?: string | null;
    licenceClass?: string | null;
    licenceExpiry?: string | null;
    department?: string | null;
    site?: string | null;
    branch?: string | null;
    status?: string | null;
  } | null;
};

function normalize(value: string) {
  return value.replace(/\s+/g, '').toUpperCase();
}

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function vehicleSite(vehicle?: VehicleRecord | null, fallback = 'No site recorded') {
  return vehicle?.siteName || vehicle?.site || fallback;
}

function vehicleLabel(vehicle?: VehicleRecord | null) {
  if (!vehicle) return 'Vehicle';

  return [vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Vehicle';
}

function formatMoney(value: unknown) {
  return new Intl.NumberFormat('en-ZM', {
    style: 'currency',
    currency: 'ZMW',
    minimumFractionDigits: 2,
  }).format(asNumber(value));
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

export default function NewFleetFuelPage() {
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [showVehicleList, setShowVehicleList] = useState(false);
  const [vehicleId, setVehicleId] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleRecord | null>(null);

  const [fuelType, setFuelType] = useState('DIESEL');
  const [litres, setLitres] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [odometer, setOdometer] = useState('');
  const [stationName, setStationName] = useState('');
  const [receiptNo, setReceiptNo] = useState('');
  const [driverName, setDriverName] = useState('Fleet Driver');

  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'SUCCESS' | 'OFFLINE' | 'ERROR'>('IDLE');

  const { identity } = useDriverIdentity();

  useEffect(() => {
    setDriverName((current) =>
      current && current !== 'Fleet Driver' ? current : identity.driverName,
    );
  }, [identity.driverName]);

  async function loadVehicles() {
    setLoadingVehicles(true);
    setMessage('');

    try {
      const result: any = await getFleetMobileContext();
      setVehicles(result?.vehicles || []);
    } catch (err: any) {
      setStatus('ERROR');
      setMessage(err?.message || 'Unable to load mobile fleet context.');
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
        normalize(vehicleSite(vehicle, '')).includes(search)
      );
    });
  }, [vehicleSearch, vehicles]);

  const calculatedAmount = useMemo(() => {
    return asNumber(litres) * asNumber(unitPrice);
  }, [litres, unitPrice]);

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
  }

  function resetForm() {
    setLitres('');
    setUnitPrice('');
    setStationName('');
    setReceiptNo('');
    setFuelType('DIESEL');
    setOdometer(selectedVehicle?.odometerCurrent ? String(selectedVehicle.odometerCurrent) : '');
  }

  function buildPayload() {
    if (!vehicleId || !selectedVehicle) {
      throw new Error('Please select a vehicle.');
    }

    if (asNumber(litres) <= 0) {
      throw new Error('Litres must be greater than zero.');
    }

    if (asNumber(unitPrice) <= 0) {
      throw new Error('Unit price must be greater than zero.');
    }

    if (asNumber(odometer) <= 0) {
      throw new Error('Odometer is required.');
    }

    if (!stationName.trim()) {
      throw new Error('Station name is required.');
    }

    return {
      vehicleId,
      fuelType,
      litres: String(asNumber(litres)),
      unitPrice: String(asNumber(unitPrice)),
      amount: String(calculatedAmount),
      odometer: String(asNumber(odometer)),
      stationName: stationName.trim(),
      receiptNo: receiptNo.trim() || undefined,
      receiptDocumentId: receiptNo.trim() || undefined,
      driverName: driverName.trim() || identity.driverName,
      employeeNo: identity.employeeNo || undefined,
      employeeNumber: identity.employeeNumber || undefined,
      department: identity.department,
      registrationNo: selectedVehicle.registrationNo || vehicleSearch,
      assetId: selectedVehicle.assetId || undefined,
      isPoolVehicle: selectedVehicle.isPoolVehicle || false,
      site: vehicleSite(selectedVehicle, identity.site),
      submittedBy: identity.submittedBy,
      fuelDate: new Date().toISOString(),
      submittedFrom: 'MOBILE',
    };
  }

  async function handleSubmit() {
    setSubmitting(true);
    setMessage('');
    setStatus('IDLE');

    try {
      const payload = buildPayload();
      await createFleetFuelLog(payload);

      setStatus('SUCCESS');
      setMessage('Fuel log submitted successfully.');
      resetForm();
    } catch (err: any) {
      try {
        if (isNetworkError(err)) {
          const payload = buildPayload();

          await enqueueOfflineRequest({
            type: 'FLEET_FUEL',
            path: '/fleet/fuel',
            method: 'POST',
            payload,
          });

          setStatus('OFFLINE');
          setMessage('Fuel log saved offline. It will sync when signal is available.');
          resetForm();
          return;
        }

        setStatus('ERROR');
        setMessage(err?.message || 'Unable to submit fuel log.');
      } catch (offlineErr: any) {
        setStatus('ERROR');
        setMessage(offlineErr?.message || err?.message || 'Unable to submit fuel log.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.mobileTopBar}>
        <Text style={styles.mobileTopBarText}>fleet/fuel/new</Text>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Fleet Management</Text>
        <Text style={styles.heroTitle}>Capture Fuel Log</Text>
        <Text style={styles.heroText}>
          Record fuel litres, price, odometer, station and receipt reference. The submitted record
          feeds the Fleet cost review process.
        </Text>

        <Pressable style={styles.heroSecondaryButton} onPress={() => router.push('/fleet/fuel')}>
          <Text style={styles.heroSecondaryButtonText}>Fuel Register</Text>
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
                  <Text style={styles.vehicleMatchText}>
                    {vehicleLabel(selectedVehicle)}
                    {' - '}
                    {vehicleSite(selectedVehicle)}
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
              {vehicleSite(selectedVehicle)}
            </Text>
          </View>
        ) : (
          <View style={styles.vehicleWarningBox}>
            <Text style={styles.vehicleWarningText}>Select the vehicle before submitting.</Text>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Fuel Details</Text>

        <Text style={styles.label}>Fuel Type</Text>
        <View style={styles.fuelTypeGrid}>
          {['DIESEL', 'PETROL'].map((item) => (
            <Pressable
              key={item}
              style={[styles.fuelTypeButton, fuelType === item ? styles.fuelTypeActive : null]}
              onPress={() => setFuelType(item)}
            >
              <Text style={styles.fuelTypeText}>{item}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Driver Name</Text>
        <TextInput
          style={styles.input}
          value={driverName}
          onChangeText={setDriverName}
          placeholder="Driver name"
        />

        <Text style={styles.label}>Litres</Text>
        <TextInput
          style={styles.input}
          value={litres}
          onChangeText={setLitres}
          keyboardType="decimal-pad"
          placeholder="e.g. 65"
        />

        <Text style={styles.label}>Unit Price</Text>
        <TextInput
          style={styles.input}
          value={unitPrice}
          onChangeText={setUnitPrice}
          keyboardType="decimal-pad"
          placeholder="e.g. 32"
        />

        <Text style={styles.label}>Calculated Amount</Text>
        <View style={styles.calculatedBox}>
          <Text style={styles.calculatedText}>{formatMoney(calculatedAmount)}</Text>
        </View>

        <Text style={styles.label}>Current Odometer</Text>
        <TextInput
          style={styles.input}
          value={odometer}
          onChangeText={setOdometer}
          keyboardType="numeric"
          placeholder="Current odometer"
        />

        <Text style={styles.label}>Station Name</Text>
        <TextInput
          style={styles.input}
          value={stationName}
          onChangeText={setStationName}
          placeholder="e.g. TotalEnergies Kitwe"
        />

        <Text style={styles.label}>Receipt No.</Text>
        <TextInput
          style={styles.input}
          value={receiptNo}
          onChangeText={setReceiptNo}
          placeholder="e.g. FUEL-001"
        />

        <Pressable
          style={[styles.submitButton, submitting ? styles.submitButtonDisabled : null]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Fuel Log</Text>
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
  fuelTypeGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  fuelTypeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  fuelTypeActive: {
    backgroundColor: '#ffedd5',
    borderColor: '#fdba74',
  },
  fuelTypeText: {
    color: '#06152b',
    fontWeight: '900',
  },
  calculatedBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  calculatedText: {
    color: '#06152b',
    fontSize: 18,
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

