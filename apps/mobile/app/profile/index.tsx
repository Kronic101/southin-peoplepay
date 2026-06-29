'use client';

import { router } from 'expo-router';
import { useEffect, useState } from 'react';
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
  DriverProfile,
  clearDriverProfile,
  defaultDriverProfile,
  getDriverProfile,
  saveDriverProfile,
} from '../../src/storage/driverProfile';

export default function ProfilePage() {
  const [profile, setProfile] = useState<DriverProfile>(defaultDriverProfile);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadProfile() {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const result = await getDriverProfile();
      setProfile(result);
    } catch (err: any) {
      setError(err?.message || 'Unable to load profile.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage('');
    setError('');

    try {
      if (!profile.driverName.trim()) {
        throw new Error('Driver name is required.');
      }

      const saved = await saveDriverProfile({
        ...profile,
        driverName: profile.driverName.trim(),
        employeeNo: profile.employeeNo.trim(),
        drivingPermitNo: profile.drivingPermitNo.trim(),
        phone: profile.phone.trim(),
        role: profile.role.trim() || 'DRIVER',
        site: profile.site.trim() || 'Kitwe Main Distribution Centre',
        department: profile.department.trim() || 'Operations',
      });

      setProfile(saved);
      setMessage('Profile saved successfully.');
    } catch (err: any) {
      setError(err?.message || 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setSaving(true);
    setMessage('');
    setError('');

    try {
      await clearDriverProfile();
      setProfile(defaultDriverProfile);
      setMessage('Profile reset to default.');
    } catch (err: any) {
      setError(err?.message || 'Unable to reset profile.');
    } finally {
      setSaving(false);
    }
  }

  function updateField(field: keyof DriverProfile, value: string) {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));
  }

  useEffect(() => {
    loadProfile();
  }, []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.mobileTopBar}>
        <Text style={styles.mobileTopBarText}>profile</Text>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Southin Operations Hub</Text>
        <Text style={styles.heroTitle}>Mobile Profile</Text>
        <Text style={styles.heroText}>
          Store the driver and field-user details used by inspections, defects, trips, fuel logs
          and offline submissions.
        </Text>

        <View style={styles.heroActions}>
          <Pressable style={styles.darkButton} onPress={() => router.push('/dashboard')}>
            <Text style={styles.darkButtonText}>Dashboard</Text>
          </Pressable>

          <Pressable style={styles.lightButton} onPress={loadProfile}>
            <Text style={styles.lightButtonText}>Refresh</Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={styles.notice}>
          <ActivityIndicator />
          <Text style={styles.noticeText}>Loading profile...</Text>
        </View>
      ) : null}

      {message ? (
        <View style={styles.successNotice}>
          <Text style={styles.successText}>{message}</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorNotice}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Driver Details</Text>

        <Text style={styles.label}>Driver Name</Text>
        <TextInput
          style={styles.input}
          value={profile.driverName}
          onChangeText={(value) => updateField('driverName', value)}
          placeholder="e.g. Mark Mando"
        />

        <Text style={styles.label}>Employee No.</Text>
        <TextInput
          style={styles.input}
          value={profile.employeeNo}
          onChangeText={(value) => updateField('employeeNo', value)}
          placeholder="Employee number"
          autoCapitalize="characters"
        />

        <Text style={styles.label}>Driving Permit No.</Text>
        <TextInput
          style={styles.input}
          value={profile.drivingPermitNo}
          onChangeText={(value) => updateField('drivingPermitNo', value)}
          placeholder="Permit number"
          autoCapitalize="characters"
        />

        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          value={profile.phone}
          onChangeText={(value) => updateField('phone', value)}
          placeholder="Mobile number"
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Work Details</Text>

        <Text style={styles.label}>Role</Text>
        <TextInput
          style={styles.input}
          value={profile.role}
          onChangeText={(value) => updateField('role', value)}
          placeholder="DRIVER"
          autoCapitalize="characters"
        />

        <Text style={styles.label}>Department</Text>
        <TextInput
          style={styles.input}
          value={profile.department}
          onChangeText={(value) => updateField('department', value)}
          placeholder="Operations"
        />

        <Text style={styles.label}>Default Site</Text>
        <TextInput
          style={styles.input}
          value={profile.site}
          onChangeText={(value) => updateField('site', value)}
          placeholder="Kitwe Main Distribution Centre"
        />

        <View style={styles.profileSummary}>
          <Text style={styles.profileSummaryTitle}>Current Profile</Text>
          <Text style={styles.profileSummaryText}>Name: {profile.driverName || '-'}</Text>
          <Text style={styles.profileSummaryText}>Permit: {profile.drivingPermitNo || '-'}</Text>
          <Text style={styles.profileSummaryText}>Role: {profile.role || '-'}</Text>
          <Text style={styles.profileSummaryText}>Site: {profile.site || '-'}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Profile Actions</Text>

        <Pressable
          style={[styles.submitButton, saving ? styles.disabledButton : null]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>Save Profile</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={handleReset}
          disabled={saving}
        >
          <Text style={styles.secondaryButtonText}>Reset Profile</Text>
        </Pressable>
      </View>

      <View style={styles.footerCard}>
        <Text style={styles.footerTitle}>Next Authentication Step</Text>
        <Text style={styles.footerText}>
          This local profile is temporary for field capture. The next phase will add Driver PIN
          login and then Microsoft Authentication for office/admin users.
        </Text>

        <Pressable style={styles.profileButton} onPress={() => router.push('/login')}>
          <Text style={styles.profileButtonText}>Go to Login</Text>
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
  heroActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  darkButton: {
    flex: 1,
    backgroundColor: '#06152b',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  darkButtonText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  lightButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  lightButtonText: {
    color: '#06152b',
    fontWeight: '900',
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
  notice: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  noticeText: {
    color: '#64748b',
    fontWeight: '800',
  },
  successNotice: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },
  successText: {
    color: '#166534',
    fontWeight: '900',
  },
  errorNotice: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
  },
  errorText: {
    color: '#991b1b',
    fontWeight: '900',
  },
  profileSummary: {
    backgroundColor: '#f8fafc',
    borderColor: '#d7e1ed',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
  },
  profileSummaryTitle: {
    color: '#06152b',
    fontWeight: '900',
    fontSize: 16,
    marginBottom: 8,
  },
  profileSummaryText: {
    color: '#475569',
    fontWeight: '800',
    marginBottom: 4,
  },
  submitButton: {
    backgroundColor: '#f26a21',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  secondaryButtonText: {
    color: '#06152b',
    fontWeight: '900',
    fontSize: 16,
  },
  footerCard: {
    backgroundColor: '#06152b',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 18,
    borderRadius: 18,
  },
  footerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
  },
  footerText: {
    color: '#cbd5e1',
    fontWeight: '700',
    lineHeight: 20,
  },
  profileButton: {
    backgroundColor: '#f26a21',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 14,
  },
  profileButtonText: {
    color: '#ffffff',
    fontWeight: '900',
  },
});
