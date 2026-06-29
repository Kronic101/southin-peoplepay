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
  createAssetStockCount,
  getAssetLocations,
  getAssetStockItems,
} from '../../../src/api/assets';
import { useDriverIdentity } from '../../../src/hooks/useDriverIdentity';
import { enqueueOfflineRequest } from '../../../src/storage/offlineQueue';

type CountLine = {
  localId: string;
  stockItemId: string;
  itemCode?: string | null;
  itemName?: string | null;
  unitOfMeasure?: string | null;
  countedQuantity: string;
  notes: string;
};

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

function createLocalId() {
  return `line-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function NewAssetStockCountPage() {
  const { identity } = useDriverIdentity();

  const [stockItems, setStockItems] = useState<AssetStockItemRecord[]>([]);
  const [locations, setLocations] = useState<AssetLocationRecord[]>([]);

  const [locationId, setLocationId] = useState('');
  const [stockSearch, setStockSearch] = useState('');
  const [showStockList, setShowStockList] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState<AssetStockItemRecord | null>(null);
  const [countedQuantity, setCountedQuantity] = useState('0');
  const [lineNotes, setLineNotes] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [lines, setLines] = useState<CountLine[]>([]);

  const [loadingSetup, setLoadingSetup] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'SUCCESS' | 'OFFLINE' | 'ERROR'>('IDLE');

  const selectedLocation = useMemo(() => {
    return locations.find((item) => item.id === locationId) || null;
  }, [locations, locationId]);

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
    setStatus('IDLE');

    try {
      const [itemResult, locationResult] = await Promise.all([
        getAssetStockItems(),
        getAssetLocations(),
      ]);

      setStockItems(itemResult || []);
      setLocations(locationResult || []);

      if (!locationId && locationResult?.[0]?.id) {
        setLocationId(locationResult[0].id);
      }
    } catch (err: any) {
      setStatus('ERROR');
      setMessage(err?.message || 'Unable to load stock count setup data.');
    } finally {
      setLoadingSetup(false);
    }
  }

  useEffect(() => {
    loadSetup();
  }, []);

  function selectStockItem(item: AssetStockItemRecord) {
    setSelectedStockItem(item);
    setStockSearch(`${item.itemCode || ''} ${item.itemName || ''}`.trim());
    setShowStockList(false);
    setStatus('IDLE');
    setMessage('');
  }

  function addLine() {
    setMessage('');
    setStatus('IDLE');

    if (!selectedStockItem) {
      setStatus('ERROR');
      setMessage('Select a stock item before adding a count line.');
      return;
    }

    if (asNumber(countedQuantity) < 0) {
      setStatus('ERROR');
      setMessage('Counted quantity cannot be negative.');
      return;
    }

    setLines((current) => [
      ...current,
      {
        localId: createLocalId(),
        stockItemId: selectedStockItem.id,
        itemCode: selectedStockItem.itemCode,
        itemName: selectedStockItem.itemName,
        unitOfMeasure: selectedStockItem.unitOfMeasure,
        countedQuantity: String(asNumber(countedQuantity)),
        notes: clean(lineNotes),
      },
    ]);

    setSelectedStockItem(null);
    setStockSearch('');
    setCountedQuantity('0');
    setLineNotes('');
    setShowStockList(false);
  }

  function removeLine(localId: string) {
    setLines((current) => current.filter((line) => line.localId !== localId));
  }

  function buildPayload() {
    if (!locationId) {
      throw new Error('Select the stock count location.');
    }

    if (lines.length === 0) {
      throw new Error('Add at least one stock count line.');
    }

    return {
      locationId,
      locationName: selectedLocation?.locationName || selectedLocation?.site || undefined,
      site: selectedLocation?.site || identity.site,
      branch: selectedLocation?.branch || undefined,
      department: selectedLocation?.department || identity.department || 'Operations',

      countDate: new Date().toISOString(),
      countedBy: identity.submittedBy || identity.driverName,
      createdBy: identity.submittedBy || identity.driverName,
      employeeNo: identity.employeeNo || undefined,
      employeeNumber: identity.employeeNumber || undefined,
      submittedFrom: 'MOBILE',
      status: 'SUBMITTED',
      notes: clean(sessionNotes) || undefined,

      lines: lines.map((line) => ({
        stockItemId: line.stockItemId,
        locationId,
        itemCode: line.itemCode || undefined,
        itemName: line.itemName || undefined,
        countedQuantity: String(asNumber(line.countedQuantity)),
        physicalQuantity: String(asNumber(line.countedQuantity)),
        quantityCounted: String(asNumber(line.countedQuantity)),
        unitOfMeasure: line.unitOfMeasure || undefined,
        notes: clean(line.notes) || undefined,
      })),
    };
  }

  async function handleSubmit() {
    setSubmitting(true);
    setMessage('');
    setStatus('IDLE');

    try {
      const payload = buildPayload();

      try {
        const result: any = await createAssetStockCount(payload);

        setStatus('SUCCESS');
        setMessage(`Stock count ${result?.countNo || result?.sessionNo || ''} submitted successfully.`);
        setLines([]);
        setSessionNotes('');
      } catch (err: any) {
        if (isNetworkError(err)) {
          await enqueueOfflineRequest({
            type: 'ASSET_STOCK_COUNT',
            path: '/assets/stock-counts',
            method: 'POST',
            payload,
          });

          setStatus('OFFLINE');
          setMessage('Stock count saved offline. It will sync when signal is available.');
          setLines([]);
          setSessionNotes('');
          return;
        }

        throw err;
      }
    } catch (err: any) {
      setStatus('ERROR');
      setMessage(err?.message || 'Unable to submit stock count.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.mobileTopBar}>
        <Text style={styles.mobileTopBarText}>asset/stock-counts/new</Text>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Asset Management</Text>
        <Text style={styles.heroTitle}>New Stock Count</Text>
        <Text style={styles.heroText}>
          Capture physical stock counts by location. Any variance review and approval should remain
          with the Asset Manager on the web app.
        </Text>

        <Pressable style={styles.heroSecondaryButton} onPress={() => router.push('/asset/stock-counts')}>
          <Text style={styles.heroSecondaryButtonText}>Stock Count Register</Text>
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
        <Text style={styles.sectionTitle}>Count Location</Text>

        {loadingSetup ? (
          <View style={styles.inlineStatus}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading stock items and locations...</Text>
          </View>
        ) : null}

        <View style={styles.locationList}>
          {locations.map((location) => (
            <Pressable
              key={location.id}
              style={[
                styles.locationOption,
                locationId === location.id ? styles.locationOptionActive : null,
              ]}
              onPress={() => setLocationId(location.id)}
            >
              <Text style={styles.locationTitle}>{location.locationName || location.site || '-'}</Text>
              <Text style={styles.locationMeta}>
                {location.locationCode || location.site || location.locationType || '-'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Add Count Line</Text>

        <Text style={styles.label}>Search Stock Item</Text>
        <TextInput
          style={styles.input}
          value={stockSearch}
          onChangeText={(value) => {
            setStockSearch(value);
            setShowStockList(true);
            setSelectedStockItem(null);
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
            <Text style={styles.warningBoxText}>Select a stock item before adding a line.</Text>
          </View>
        )}

        <Text style={styles.label}>Counted Quantity</Text>
        <TextInput
          style={styles.input}
          value={countedQuantity}
          onChangeText={setCountedQuantity}
          keyboardType="decimal-pad"
          placeholder="Physical quantity counted"
        />

        <Text style={styles.label}>Line Notes</Text>
        <TextInput
          style={styles.input}
          value={lineNotes}
          onChangeText={setLineNotes}
          placeholder="Optional line note"
        />

        <Pressable style={styles.darkFullButton} onPress={addLine}>
          <Text style={styles.darkFullButtonText}>Add Line</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Count Lines</Text>

        {lines.length === 0 ? (
          <Text style={styles.emptyText}>No count lines added yet.</Text>
        ) : null}

        {lines.map((line) => (
          <View key={line.localId} style={styles.lineRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.lineTitle}>{line.itemCode || line.itemName || '-'}</Text>
              <Text style={styles.lineMeta}>
                {line.itemName || 'Stock item'} • Qty {line.countedQuantity}{' '}
                {line.unitOfMeasure || ''}
              </Text>
              {line.notes ? <Text style={styles.lineNote}>{line.notes}</Text> : null}
            </View>

            <Pressable style={styles.removeButton} onPress={() => removeLine(line.localId)}>
              <Text style={styles.removeButtonText}>Remove</Text>
            </Pressable>
          </View>
        ))}

        <Text style={styles.label}>Session Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={sessionNotes}
          onChangeText={setSessionNotes}
          placeholder="General stock count notes"
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
            <Text style={styles.submitButtonText}>Submit Stock Count</Text>
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
  locationList: { gap: 10 },
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
  inlineStatus: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 12 },
  muted: { color: '#64748b' },
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
  darkFullButton: {
    backgroundColor: '#06152b',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  darkFullButtonText: { color: '#ffffff', fontWeight: '900' },
  lineRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d7e1ed',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  lineTitle: { color: '#06152b', fontWeight: '900', fontSize: 15 },
  lineMeta: { color: '#64748b', fontWeight: '700', marginTop: 3 },
  lineNote: { color: '#334155', fontWeight: '700', marginTop: 4 },
  removeButton: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  removeButtonText: { color: '#991b1b', fontWeight: '900' },
  emptyText: { color: '#64748b', fontWeight: '800', paddingVertical: 12 },
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