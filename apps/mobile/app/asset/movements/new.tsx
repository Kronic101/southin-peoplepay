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
  AssetLocationRecord,
  AssetStockItemRecord,
  createAssetMovement,
  getAssetLocations,
  getAssetStockItems,
} from '../../../src/api/assets';
import { useDriverIdentity } from '../../../src/hooks/useDriverIdentity';
import { enqueueOfflineRequest } from '../../../src/storage/offlineQueue';

function clean(value: unknown) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

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

export default function NewAssetMovementPage() {
  const { identity } = useDriverIdentity();

  const [stockItems, setStockItems] = useState<AssetStockItemRecord[]>([]);
  const [locations, setLocations] = useState<AssetLocationRecord[]>([]);

  const [movementType, setMovementType] = useState('ISSUE');
  const [stockSearch, setStockSearch] = useState('');
  const [showStockList, setShowStockList] = useState(false);
  const [stockItemId, setStockItemId] = useState('');
  const [selectedStockItem, setSelectedStockItem] = useState<AssetStockItemRecord | null>(null);

  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [referenceNo, setReferenceNo] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const [loadingSetup, setLoadingSetup] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'SUCCESS' | 'OFFLINE' | 'ERROR'>('IDLE');

  const filteredStockItems = useMemo(() => {
    const search = normalize(stockSearch);

    if (!search) {
      return stockItems.slice(0, 25);
    }

    return stockItems
      .filter((item) => {
        return (
          normalize(item.itemCode || '').includes(search) ||
          normalize(item.itemName || '').includes(search) ||
          normalize(item.category || '').includes(search)
        );
      })
      .slice(0, 25);
  }, [stockItems, stockSearch]);

  async function loadSetup() {
    setLoadingSetup(true);
    setMessage('');

    try {
      const [itemResult, locationResult] = await Promise.all([
        getAssetStockItems(),
        getAssetLocations(),
      ]);

      setStockItems(itemResult || []);
      setLocations(locationResult || []);

      if (!fromLocationId && locationResult?.[0]?.id) {
        setFromLocationId(locationResult[0].id);
      }

      if (!toLocationId && locationResult?.[1]?.id) {
        setToLocationId(locationResult[1].id);
      }
    } catch (err: any) {
      setStatus('ERROR');
      setMessage(err?.message || 'Unable to load stock items and locations.');
    } finally {
      setLoadingSetup(false);
    }
  }

  useEffect(() => {
    loadSetup();
  }, []);

  function selectStockItem(item: AssetStockItemRecord) {
    setSelectedStockItem(item);
    setStockItemId(item.id);
    setStockSearch(`${item.itemCode || ''} ${item.itemName || ''}`.trim());
    setShowStockList(false);
    setStatus('IDLE');
    setMessage('');
  }

  function resetForm() {
    setQuantity('1');
    setReferenceNo('');
    setReason('');
    setNotes('');
    setStockSearch('');
    setStockItemId('');
    setSelectedStockItem(null);
    setShowStockList(false);
  }

  function buildPayload() {
    if (!stockItemId || !selectedStockItem) {
      throw new Error('Please select a stock item.');
    }

    if (asNumber(quantity) <= 0) {
      throw new Error('Quantity must be greater than zero.');
    }

    if (!fromLocationId && movementType !== 'RECEIPT') {
      throw new Error('From location is required.');
    }

    if (!toLocationId && movementType !== 'ISSUE') {
      throw new Error('To location is required.');
    }

    const selectedFromLocation = locations.find((item) => item.id === fromLocationId);
    const selectedToLocation = locations.find((item) => item.id === toLocationId);

    return {
      movementType,
      referenceNo: clean(referenceNo) || undefined,
      referenceId: clean(referenceNo) || undefined,
      reason: clean(reason) || `${movementType} created from mobile.`,
      notes: clean(notes) || undefined,

      fromLocationId: fromLocationId || undefined,
      toLocationId: toLocationId || undefined,
      fromLocationName: selectedFromLocation?.locationName || undefined,
      toLocationName: selectedToLocation?.locationName || undefined,

      requestedBy: identity.submittedBy || identity.driverName,
      createdBy: identity.submittedBy || identity.driverName,
      employeeNo: identity.employeeNo || undefined,
      employeeNumber: identity.employeeNumber || undefined,
      department: identity.department || 'Operations',
      site: selectedToLocation?.site || selectedFromLocation?.site || identity.site,

      submittedFrom: 'MOBILE',

      lines: [
        {
          stockItemId,
          itemCode: selectedStockItem.itemCode || undefined,
          itemName: selectedStockItem.itemName || undefined,
          quantity: String(asNumber(quantity)),
          requestedQuantity: String(asNumber(quantity)),
          unitOfMeasure: selectedStockItem.unitOfMeasure || undefined,
          notes: clean(notes) || undefined,
        },
      ],
    };
  }

  async function handleSubmit() {
    setSubmitting(true);
    setMessage('');
    setStatus('IDLE');

    try {
      const payload = buildPayload();

      try {
        const result: any = await createAssetMovement(payload);

        setStatus('SUCCESS');
        setMessage(`Asset movement ${result?.movementNo || ''} created successfully.`);
        resetForm();
      } catch (err: any) {
        if (isNetworkError(err)) {
          await enqueueOfflineRequest({
            type: 'ASSET_MOVEMENT',
            path: '/assets/movements',
            method: 'POST',
            payload,
          });

          setStatus('OFFLINE');
          setMessage('Asset movement saved offline. It will sync when signal is available.');
          resetForm();
          return;
        }

        throw err;
      }
    } catch (err: any) {
      setStatus('ERROR');
      setMessage(err?.message || 'Unable to create asset movement.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.mobileTopBar}>
        <Text style={styles.mobileTopBarText}>asset/movements/new</Text>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Asset Management</Text>
        <Text style={styles.heroTitle}>New Asset Movement</Text>
        <Text style={styles.heroText}>
          Create mobile stock movement requests for issuing, returning, transferring or receiving
          operational stock. Final approval and posting remains in the web app.
        </Text>

        <Pressable style={styles.heroSecondaryButton} onPress={() => router.push('/asset/movements')}>
          <Text style={styles.heroSecondaryButtonText}>Movement Register</Text>
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
        <Text style={styles.sectionTitle}>Movement Details</Text>

        <Text style={styles.label}>Movement Type</Text>
        <View style={styles.typeGrid}>
          {['ISSUE', 'RETURN', 'TRANSFER', 'RECEIPT'].map((type) => (
            <Pressable
              key={type}
              style={[styles.typeButton, movementType === type ? styles.typeButtonActive : null]}
              onPress={() => setMovementType(type)}
            >
              <Text style={styles.typeButtonText}>{type}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Reference No.</Text>
        <TextInput
          style={styles.input}
          value={referenceNo}
          onChangeText={setReferenceNo}
          placeholder="e.g. SITE-REQ-001"
          autoCapitalize="characters"
        />

        <Text style={styles.label}>Reason</Text>
        <TextInput
          style={styles.input}
          value={reason}
          onChangeText={setReason}
          placeholder="Reason for movement"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Stock Item</Text>

        <Text style={styles.label}>Search Stock Item</Text>
        <TextInput
          style={styles.input}
          value={stockSearch}
          onChangeText={(value) => {
            setStockSearch(value);
            setShowStockList(true);

            if (
              selectedStockItem &&
              !normalize(value).includes(normalize(selectedStockItem.itemCode || '')) &&
              !normalize(value).includes(normalize(selectedStockItem.itemName || ''))
            ) {
              setSelectedStockItem(null);
              setStockItemId('');
            }
          }}
          onFocus={() => setShowStockList(true)}
          placeholder="Search item code, name or category"
          autoCapitalize="characters"
        />

        <Pressable
          style={styles.dropdownButton}
          onPress={() => setShowStockList((current) => !current)}
        >
          <Text style={styles.dropdownButtonText}>
            {showStockList ? 'Hide Stock List' : 'Show Stock List'}
          </Text>
        </Pressable>

        {loadingSetup ? (
          <View style={styles.inlineStatus}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading setup data...</Text>
          </View>
        ) : null}

        {showStockList ? (
          <View style={styles.dropdownList}>
            {filteredStockItems.length === 0 ? (
              <Text style={styles.dropdownEmpty}>No stock items found.</Text>
            ) : (
              filteredStockItems.map((item) => (
                <Pressable key={item.id} style={styles.stockOption} onPress={() => selectStockItem(item)}>
                  <Text style={styles.stockOptionTitle}>{item.itemCode || '-'}</Text>
                  <Text style={styles.stockOptionMeta}>
                    {item.itemName || 'Stock Item'} • {item.category || 'No category'}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        ) : null}

        {selectedStockItem ? (
          <View style={styles.selectedBox}>
            <Text style={styles.selectedTitle}>
              {selectedStockItem.itemCode || selectedStockItem.itemName} selected
            </Text>
            <Text style={styles.selectedText}>
              {selectedStockItem.itemName || '-'} • {selectedStockItem.unitOfMeasure || 'unit'}
            </Text>
          </View>
        ) : (
          <View style={styles.warningBox}>
            <Text style={styles.warningBoxText}>Select a stock item before submitting.</Text>
          </View>
        )}

        <Text style={styles.label}>Quantity</Text>
        <TextInput
          style={styles.input}
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="decimal-pad"
          placeholder="Quantity"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Locations</Text>

        <Text style={styles.label}>From Location</Text>
        <View style={styles.locationList}>
          {locations.map((location) => (
            <Pressable
              key={location.id}
              style={[
                styles.locationOption,
                fromLocationId === location.id ? styles.locationOptionActive : null,
              ]}
              onPress={() => setFromLocationId(location.id)}
            >
              <Text style={styles.locationTitle}>{location.locationName || location.site || '-'}</Text>
              <Text style={styles.locationMeta}>{location.site || location.locationType || '-'}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>To Location</Text>
        <View style={styles.locationList}>
          {locations.map((location) => (
            <Pressable
              key={location.id}
              style={[
                styles.locationOption,
                toLocationId === location.id ? styles.locationOptionActive : null,
              ]}
              onPress={() => setToLocationId(location.id)}
            >
              <Text style={styles.locationTitle}>{location.locationName || location.site || '-'}</Text>
              <Text style={styles.locationMeta}>{location.site || location.locationType || '-'}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional movement notes"
          multiline
        />

        <Pressable
          style={[styles.submitButton, submitting ? styles.disabledButton : null]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Movement</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#eaf1f7' },
  content: { paddingBottom: 32 },
  mobileTopBar: {
    backgroundColor: '#06152b',
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  mobileTopBarText: { color: '#ffffff', fontWeight: '900', fontSize: 18 },
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
  heroSecondaryButtonText: { color: '#ffffff', fontWeight: '900' },
  eyebrow: {
    color: '#f26a21',
    textTransform: 'uppercase',
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
  },
  heroTitle: { color: '#06152b', fontSize: 28, fontWeight: '900', marginBottom: 8 },
  heroText: { color: '#475569', fontSize: 15, lineHeight: 22 },
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ccd8e5',
  },
  sectionTitle: { color: '#06152b', fontSize: 21, fontWeight: '900', marginBottom: 14 },
  label: { color: '#06152b', fontWeight: '900', marginBottom: 8, marginTop: 10 },
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
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  typeButton: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  typeButtonActive: { backgroundColor: '#ffedd5', borderColor: '#fdba74' },
  typeButtonText: { color: '#06152b', fontWeight: '900' },
  dropdownButton: {
    backgroundColor: '#06152b',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  dropdownButtonText: { color: '#ffffff', fontWeight: '900' },
  dropdownList: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  dropdownEmpty: { padding: 14, color: '#64748b', fontWeight: '700' },
  stockOption: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  stockOptionTitle: { color: '#06152b', fontWeight: '900', fontSize: 15 },
  stockOptionMeta: { color: '#64748b', marginTop: 4, fontWeight: '700' },
  inlineStatus: { flexDirection: 'row', gap: 10, alignItems: 'center', marginVertical: 8 },
  muted: { color: '#64748b' },
  selectedBox: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
    borderWidth: 1,
    padding: 12,
    borderRadius: 14,
    marginTop: 6,
  },
  selectedTitle: { color: '#166534', fontWeight: '900' },
  selectedText: { color: '#166534', marginTop: 3 },
  warningBox: {
    backgroundColor: '#fff7ed',
    borderColor: '#fdba74',
    borderWidth: 1,
    padding: 12,
    borderRadius: 14,
    marginTop: 6,
  },
  warningBoxText: { color: '#9a3412', fontWeight: '800' },
  locationList: { gap: 10, marginBottom: 10 },
  locationOption: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#d7e1ed',
    borderRadius: 14,
    padding: 12,
  },
  locationOptionActive: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },
  locationTitle: { color: '#06152b', fontWeight: '900' },
  locationMeta: { color: '#64748b', fontWeight: '700', marginTop: 3 },
  statusNotice: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  successNotice: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  warningNotice: { backgroundColor: '#fff7ed', borderColor: '#fdba74' },
  errorNotice: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  statusNoticeText: { fontWeight: '900' },
  successText: { color: '#166534' },
  warningText: { color: '#9a3412' },
  errorText: { color: '#991b1b' },
  submitButton: {
    backgroundColor: '#f26a21',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  disabledButton: { opacity: 0.7 },
  submitButtonText: { color: '#ffffff', fontWeight: '900', fontSize: 16 },
});