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

import { getFleetVehicles, submitFleetInspection } from '../../../src/api/fleet';
import { enqueueFleetInspection } from '../../../src/storage/offlineQueue';
import type { FleetInspectionPayload } from '../../../src/types/fleet';
import { useDriverIdentity } from '../../../src/hooks/useDriverIdentity';

type VehicleRecord = {
  id: string;
  registrationNo?: string | null;
  make?: string | null;
  model?: string | null;
  vehicleType?: string | null;
  status?: string | null;
  odometerCurrent?: string | number | null;
  site?: string | null;
  department?: string | null;
};

type CheckStatus = 'OKAY' | 'NOT_OKAY';

type BusinessInspectionStatus = 'PASSED' | 'PASSED_WITH_DEFECTS' | 'FAILED';

type ChecklistItem = {
  no: number;
  label: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  blocksUse: boolean;
  requiresCommentOnFail: boolean;
  status: CheckStatus;
  comments: string;
};

type ApiChecklistItem = {
  itemNo: number;
  item: string;
  no: number;
  label: string;
  status: CheckStatus;
  comments: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  blocksUse: boolean;
};

type InspectionSubmitPayload = FleetInspectionPayload & {
  vehicleNo?: string;
  employeeNo?: string;
  employeeNumber?: string;
  drivingPermitNo?: string | null;
  checklistPhase?: string;
  inspectionType?: string;
  inspectionDate?: string;
  odometerStart?: string | null;
  odometerEnd?: string | null;
  isSafeForUse?: boolean;
  overallStatus?: BusinessInspectionStatus;
  department?: string;
  site?: string;
  submittedBy?: string;
  checklist?: ApiChecklistItem[];
  failedItems?: ApiChecklistItem[];
  notes?: string | null;
};

const baseChecklist: ChecklistItem[] = [
  {
    no: 1,
    label: 'Foot & hand brake operations',
    severity: 'CRITICAL',
    blocksUse: true,
    requiresCommentOnFail: true,
    status: 'OKAY',
    comments: '',
  },
  {
    no: 2,
    label: 'All lights',
    severity: 'HIGH',
    blocksUse: true,
    requiresCommentOnFail: true,
    status: 'OKAY',
    comments: '',
  },
  {
    no: 3,
    label: 'Horn',
    severity: 'HIGH',
    blocksUse: true,
    requiresCommentOnFail: true,
    status: 'OKAY',
    comments: '',
  },
  {
    no: 4,
    label: 'Seat belt working',
    severity: 'CRITICAL',
    blocksUse: true,
    requiresCommentOnFail: true,
    status: 'OKAY',
    comments: '',
  },
  {
    no: 5,
    label: 'Fire extinguisher & condition',
    severity: 'HIGH',
    blocksUse: true,
    requiresCommentOnFail: true,
    status: 'OKAY',
    comments: '',
  },
  {
    no: 6,
    label: 'Oil & water leaks',
    severity: 'HIGH',
    blocksUse: true,
    requiresCommentOnFail: true,
    status: 'OKAY',
    comments: '',
  },
  {
    no: 7,
    label: 'Oil level',
    severity: 'CRITICAL',
    blocksUse: true,
    requiresCommentOnFail: true,
    status: 'OKAY',
    comments: '',
  },
  {
    no: 8,
    label: 'Radiator coolant level',
    severity: 'HIGH',
    blocksUse: true,
    requiresCommentOnFail: true,
    status: 'OKAY',
    comments: '',
  },
  {
    no: 9,
    label: 'Visually tyre condition & tread',
    severity: 'CRITICAL',
    blocksUse: true,
    requiresCommentOnFail: true,
    status: 'OKAY',
    comments: '',
  },
  {
    no: 10,
    label: 'Condition & position of rear mirror',
    severity: 'MEDIUM',
    blocksUse: false,
    requiresCommentOnFail: true,
    status: 'OKAY',
    comments: '',
  },
  {
    no: 11,
    label: 'Brake & clutch fluid level',
    severity: 'CRITICAL',
    blocksUse: true,
    requiresCommentOnFail: true,
    status: 'OKAY',
    comments: '',
  },
  {
    no: 12,
    label: 'Loose V-belts',
    severity: 'HIGH',
    blocksUse: true,
    requiresCommentOnFail: true,
    status: 'OKAY',
    comments: '',
  },
  {
    no: 13,
    label: 'Ensure registration plates are secure',
    severity: 'MEDIUM',
    blocksUse: false,
    requiresCommentOnFail: true,
    status: 'OKAY',
    comments: '',
  },
  {
    no: 14,
    label: 'Ensure road tax is valid',
    severity: 'CRITICAL',
    blocksUse: true,
    requiresCommentOnFail: true,
    status: 'OKAY',
    comments: '',
  },
  {
    no: 15,
    label: 'Ensure fitness is valid',
    severity: 'CRITICAL',
    blocksUse: true,
    requiresCommentOnFail: true,
    status: 'OKAY',
    comments: '',
  },
  {
    no: 16,
    label: 'Condition of side view mirrors',
    severity: 'HIGH',
    blocksUse: true,
    requiresCommentOnFail: true,
    status: 'OKAY',
    comments: '',
  },
  {
    no: 17,
    label: 'Wiper effectiveness',
    severity: 'MEDIUM',
    blocksUse: false,
    requiresCommentOnFail: true,
    status: 'OKAY',
    comments: '',
  },
  {
    no: 18,
    label: 'Wipers spray condition',
    severity: 'MEDIUM',
    blocksUse: false,
    requiresCommentOnFail: true,
    status: 'OKAY',
    comments: '',
  },
  {
    no: 19,
    label: 'Body works damage',
    severity: 'MEDIUM',
    blocksUse: false,
    requiresCommentOnFail: true,
    status: 'OKAY',
    comments: '',
  },
  {
    no: 20,
    label: 'Instruments & controls',
    severity: 'MEDIUM',
    blocksUse: false,
    requiresCommentOnFail: true,
    status: 'OKAY',
    comments: '',
  },
  {
    no: 21,
    label: 'Traffic triangles available',
    severity: 'MEDIUM',
    blocksUse: false,
    requiresCommentOnFail: true,
    status: 'OKAY',
    comments: '',
  },
  {
    no: 22,
    label: 'Wheel nuts',
    severity: 'CRITICAL',
    blocksUse: true,
    requiresCommentOnFail: true,
    status: 'OKAY',
    comments: '',
  },
  {
    no: 23,
    label: 'Housekeeping inside and out',
    severity: 'LOW',
    blocksUse: false,
    requiresCommentOnFail: true,
    status: 'OKAY',
    comments: '',
  },
];

function normalize(value: string) {
  return value.replace(/\s+/g, '').toUpperCase();
}

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cloneChecklist() {
  return baseChecklist.map((item) => ({ ...item }));
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

export default function NewFleetInspectionPage() {
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [showVehicleList, setShowVehicleList] = useState(false);

  const [vehicleId, setVehicleId] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleRecord | null>(null);

  const [driverName, setDriverName] = useState('Fleet Driver');
  const [permitNo, setPermitNo] = useState('');
  const [odometerStart, setOdometerStart] = useState('');
  const [odometerEnd, setOdometerEnd] = useState('');
  const [comments, setComments] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>(cloneChecklist());

  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState('');
  const [submitStatus, setSubmitStatus] = useState<'IDLE' | 'SUCCESS' | 'OFFLINE' | 'ERROR'>(
    'IDLE',
  );

  const { identity } = useDriverIdentity();

  useEffect(() => {
    setDriverName((current) =>
      current && current !== 'Fleet Driver' ? current : identity.driverName,
    );
    setPermitNo((current) => current || identity.drivingPermitNo);
  }, [identity.driverName, identity.drivingPermitNo]);

  async function loadVehicles() {
    setLoadingVehicles(true);
    setMessage('');

    try {
      const result = await getFleetVehicles();
      const list = result || [];

      setVehicles(list);

      if (list.length === 1 && !selectedVehicle) {
        selectVehicle(list[0]);
      }
    } catch (err: any) {
      setSubmitStatus('ERROR');
      setMessage(
        err?.message || 'Unable to load vehicle list. Confirm API is reachable from the phone.',
      );
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
      const registration = normalize(vehicle.registrationNo || '');
      const make = normalize(vehicle.make || '');
      const model = normalize(vehicle.model || '');
      const site = normalize(vehicle.site || '');

      return (
        registration.includes(search) ||
        make.includes(search) ||
        model.includes(search) ||
        site.includes(search)
      );
    });
  }, [vehicleSearch, vehicles]);

  const failedItems = useMemo(() => {
    return checklist.filter((item) => item.status === 'NOT_OKAY');
  }, [checklist]);

  const blockingFailedItems = useMemo(() => {
    return failedItems.filter((item) => item.blocksUse);
  }, [failedItems]);

  const nonBlockingFailedItems = useMemo(() => {
    return failedItems.filter((item) => !item.blocksUse);
  }, [failedItems]);

  const safeForUse = blockingFailedItems.length === 0;

  const overallStatus: BusinessInspectionStatus =
    blockingFailedItems.length > 0
      ? 'FAILED'
      : failedItems.length > 0
        ? 'PASSED_WITH_DEFECTS'
        : 'PASSED';

  function selectVehicle(vehicle: VehicleRecord) {
    const odometer = String(vehicle.odometerCurrent || '');

    setSelectedVehicle(vehicle);
    setVehicleId(vehicle.id);
    setVehicleSearch(vehicle.registrationNo || '');
    setShowVehicleList(false);
    setMessage('');
    setSubmitStatus('IDLE');

    if (odometer) {
      setOdometerStart(odometer);
    }
  }

  function updateItemStatus(no: number, status: CheckStatus) {
    setChecklist((current) =>
      current.map((item) =>
        item.no === no
          ? {
              ...item,
              status,
              comments: status === 'OKAY' ? '' : item.comments,
            }
          : item,
      ),
    );
  }

  function updateItemComments(no: number, value: string) {
    setChecklist((current) =>
      current.map((item) =>
        item.no === no
          ? {
              ...item,
              comments: value,
            }
          : item,
      ),
    );
  }

  function resetChecklistOnly() {
    setChecklist(cloneChecklist());
    setComments('');
    setOdometerEnd('');

    if (selectedVehicle?.odometerCurrent) {
      setOdometerStart(String(selectedVehicle.odometerCurrent));
    }
  }

  function buildPayload(): InspectionSubmitPayload {
    if (!selectedVehicle || !vehicleId) {
      throw new Error('Please select a vehicle from the vehicle list.');
    }

    if (!driverName.trim()) {
      throw new Error('Please enter the driver name.');
    }

    const finalOdometer = odometerEnd || odometerStart;

    if (asNumber(finalOdometer) <= 0) {
      throw new Error('Please enter a valid odometer reading.');
    }

    const failedWithoutComments = checklist.filter(
      (item) =>
        item.status === 'NOT_OKAY' &&
        item.requiresCommentOnFail &&
        !item.comments.trim(),
    );

    if (failedWithoutComments.length > 0) {
      throw new Error(
        `Please describe the issue for: ${failedWithoutComments
          .map((item) => item.label)
          .join(', ')}`,
      );
    }

    const apiSafeForUse: 'YES' | 'NO' = safeForUse ? 'YES' : 'NO';
    const apiOverallStatus: BusinessInspectionStatus = overallStatus;

    const checklistPayload: ApiChecklistItem[] = checklist.map((item) => ({
      itemNo: item.no,
      item: item.label,
      no: item.no,
      label: item.label,
      status: item.status,
      comments: item.comments,
      severity: item.severity,
      blocksUse: item.blocksUse,
    }));

    const failedItemsPayload: ApiChecklistItem[] = failedItems.map((item) => ({
      itemNo: item.no,
      item: item.label,
      no: item.no,
      label: item.label,
      status: item.status,
      comments: item.comments,
      severity: item.severity,
      blocksUse: item.blocksUse,
    }));

    return {
      vehicleId,
      vehicleNo: selectedVehicle.registrationNo || vehicleSearch,
      driverName: driverName.trim() || identity.driverName,
      employeeNo: identity.employeeNo || undefined,
      employeeNumber: identity.employeeNumber || undefined,
      drivingPermitNo: permitNo.trim() || identity.drivingPermitNo || null,
      department: identity.department,
      site: selectedVehicle.site || identity.site,
      submittedBy: identity.submittedBy,

      checklistPhase: 'PRE_START',
      inspectionType: 'PRE_START',
      inspectionDate: new Date().toISOString(),

      odometer: String(finalOdometer),
      odometerStart: odometerStart || null,
      odometerEnd: odometerEnd || null,

      safeForUse: apiSafeForUse,
      isSafeForUse: safeForUse,
      overallStatus: apiOverallStatus,

      notes: comments.trim() || null,

      checklist: checklistPayload,
      failedItems: failedItemsPayload,
    };
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitStatus('IDLE');
    setMessage('');

    try {
      const payload = buildPayload();
      const result: any = await submitFleetInspection(payload);

      const resultStatus =
        result?.overallStatus ||
        result?.inspection?.payload?.businessStatus ||
        result?.inspection?.overallStatus ||
        overallStatus;

      setSubmitStatus('SUCCESS');
      setMessage(`Inspection submitted successfully. Result: ${resultStatus}.`);

      resetChecklistOnly();
      await loadVehicles();
    } catch (err: any) {
      try {
        if (isNetworkError(err)) {
          const payload = buildPayload();

          await enqueueFleetInspection(payload);

          setSubmitStatus('OFFLINE');
          setMessage(
            'Inspection saved offline. It will sync automatically when network is available.',
          );

          resetChecklistOnly();
          return;
        }

        setSubmitStatus('ERROR');
        setMessage(err?.message || 'Unable to submit inspection.');
      } catch (offlineErr: any) {
        setSubmitStatus('ERROR');
        setMessage(offlineErr?.message || err?.message || 'Unable to submit inspection.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.mobileTopBar}>
        <Text style={styles.mobileTopBarText}>fleet/inspections/new</Text>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Fleet Management</Text>
        <Text style={styles.heroTitle}>Vehicle Pre-Start Inspection</Text>
        <Text style={styles.heroText}>
          Driver checklist before driving. Critical failures block vehicle use. Non-critical
          failures create defects but may still allow operation.
        </Text>

        <Pressable
          style={styles.heroSecondaryButton}
          onPress={() => router.push('/fleet/inspections')}
        >
          <Text style={styles.heroSecondaryButtonText}>Inspection History</Text>
        </Pressable>
      </View>

      {message ? (
        <View
          style={[
            styles.statusNotice,
            submitStatus === 'SUCCESS'
              ? styles.successNotice
              : submitStatus === 'OFFLINE'
                ? styles.warningNotice
                : styles.errorNotice,
          ]}
        >
          <Text
            style={[
              styles.statusNoticeText,
              submitStatus === 'SUCCESS'
                ? styles.successText
                : submitStatus === 'OFFLINE'
                  ? styles.warningText
                  : styles.errorText,
            ]}
          >
            {message}
          </Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Vehicle & Driver Details</Text>

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
            <Text style={styles.vehicleWarningText}>
              Select the vehicle before submitting the inspection.
            </Text>
          </View>
        )}

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
          value={permitNo}
          onChangeText={setPermitNo}
          placeholder="Permit number"
        />

        <Text style={styles.label}>Odometer Start</Text>
        <TextInput
          style={styles.input}
          value={odometerStart}
          onChangeText={setOdometerStart}
          keyboardType="numeric"
          placeholder="Start odometer"
        />

        <Text style={styles.label}>Odometer End</Text>
        <TextInput
          style={styles.input}
          value={odometerEnd}
          onChangeText={setOdometerEnd}
          keyboardType="numeric"
          placeholder="Optional for pre-start"
        />
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Check Before Driving</Text>

          <View
            style={[
              styles.resultPill,
              overallStatus === 'FAILED'
                ? styles.resultDanger
                : overallStatus === 'PASSED_WITH_DEFECTS'
                  ? styles.resultWarning
                  : styles.resultSuccess,
            ]}
          >
            <Text style={styles.resultPillText}>{overallStatus}</Text>
          </View>
        </View>

        {checklist.map((item) => (
          <View key={item.no} style={styles.checkItem}>
            <View style={styles.checkHeader}>
              <View style={styles.checkNoCircle}>
                <Text style={styles.checkNo}>{item.no}</Text>
              </View>

              <View style={styles.checkTitleWrap}>
                <Text style={styles.checkTitle}>{item.label}</Text>
                <Text style={styles.checkMeta}>
                  {item.severity}
                  {item.blocksUse ? ' • Blocks vehicle use' : ' • Advisory defect'}
                </Text>
              </View>
            </View>

            <View style={styles.choiceRow}>
              <Pressable
                style={[
                  styles.choiceButton,
                  item.status === 'OKAY' ? styles.okayButtonActive : null,
                ]}
                onPress={() => updateItemStatus(item.no, 'OKAY')}
              >
                <Text style={styles.choiceText}>Okay</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.choiceButton,
                  item.status === 'NOT_OKAY' ? styles.notOkayButtonActive : null,
                ]}
                onPress={() => updateItemStatus(item.no, 'NOT_OKAY')}
              >
                <Text style={styles.choiceText}>Not Okay</Text>
              </Pressable>
            </View>

            {item.status === 'NOT_OKAY' ? (
              <TextInput
                style={styles.input}
                value={item.comments}
                onChangeText={(value) => updateItemComments(item.no, value)}
                placeholder="Describe the issue"
                multiline
              />
            ) : null}
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Final Safety Confirmation</Text>

        <View style={safeForUse ? styles.safeBox : styles.unsafeBox}>
          <Text style={styles.safetyTitle}>
            Is the vehicle safe for use? {safeForUse ? 'YES' : 'NO'}
          </Text>

          <Text style={styles.safetyText}>
            {failedItems.length === 0
              ? 'All checklist items are okay.'
              : safeForUse
                ? `${nonBlockingFailedItems.length} non-critical item(s) marked Not Okay. Defect record will be raised.`
                : `${blockingFailedItems.length} critical item(s) marked Not Okay. Vehicle must not be used until cleared.`}
          </Text>
        </View>

        <Text style={styles.label}>General Comments</Text>
        <TextInput
          style={[styles.input, styles.commentsInput]}
          value={comments}
          onChangeText={setComments}
          placeholder="General comments"
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
            <Text style={styles.submitButtonText}>Submit Inspection</Text>
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
  sectionHeaderRow: {
    gap: 10,
    marginBottom: 6,
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
  commentsInput: {
    minHeight: 100,
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
  checkItem: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 14,
    marginTop: 12,
  },
  checkHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  checkNoCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkNo: {
    color: '#06152b',
    fontWeight: '900',
  },
  checkTitleWrap: {
    flex: 1,
  },
  checkTitle: {
    color: '#06152b',
    fontSize: 16,
    fontWeight: '900',
  },
  checkMeta: {
    color: '#64748b',
    marginTop: 3,
    fontSize: 12,
    fontWeight: '700',
  },
  choiceRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  choiceButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  okayButtonActive: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },
  notOkayButtonActive: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
  },
  choiceText: {
    color: '#06152b',
    fontWeight: '900',
  },
  resultPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  resultSuccess: {
    backgroundColor: '#dcfce7',
  },
  resultWarning: {
    backgroundColor: '#ffedd5',
  },
  resultDanger: {
    backgroundColor: '#fee2e2',
  },
  resultPillText: {
    color: '#06152b',
    fontWeight: '900',
    fontSize: 12,
  },
  safeBox: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
    borderWidth: 1,
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  unsafeBox: {
    backgroundColor: '#fff7ed',
    borderColor: '#fdba74',
    borderWidth: 1,
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  safetyTitle: {
    color: '#06152b',
    fontWeight: '900',
    fontSize: 17,
    marginBottom: 4,
  },
  safetyText: {
    color: '#334155',
    fontWeight: '700',
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