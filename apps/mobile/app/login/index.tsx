import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AppButton from '../../src/components/AppButton';
import AppCard from '../../src/components/AppCard';
import AppInput from '../../src/components/AppInput';
import { useAuth } from '../../src/hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();

  const [employeeNo, setEmployeeNo] = useState('');
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleLogin() {
    if (!employeeNo.trim()) {
      Alert.alert('Employee number required', 'Please enter your employee number.');
      return;
    }

    if (!pin.trim()) {
      Alert.alert('PIN required', 'Please enter your mobile PIN.');
      return;
    }

    setSaving(true);

    try {
      await auth.login(employeeNo, pin);
      router.replace('/dashboard');
    } catch (error: any) {
      Alert.alert('Login failed', error?.message || 'Unable to login.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.brandCard}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>SP</Text>
        </View>

        <View>
          <Text style={styles.brandTitle}>Southin Operations Hub</Text>
          <Text style={styles.brandSubTitle}>Mobile Field Operations</Text>
        </View>
      </View>

      <AppCard>
        <Text style={styles.eyebrow}>Secure Mobile Login</Text>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.muted}>
          Use your employee number and mobile PIN to submit field records.
        </Text>

        <AppInput
          label="Employee Number"
          value={employeeNo}
          onChangeText={setEmployeeNo}
          placeholder="e.g. EMP-0001"
          autoCapitalize="characters"
        />

        <AppInput
          label="Mobile PIN"
          value={pin}
          onChangeText={setPin}
          placeholder="Enter PIN"
          secureTextEntry
          keyboardType="number-pad"
        />

        <AppButton
          title={saving ? 'Signing in...' : 'Sign In'}
          onPress={handleLogin}
          disabled={saving}
        />
      </AppCard>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#eef4f8',
    padding: 18,
    justifyContent: 'center',
  },
  brandCard: {
    backgroundColor: '#071426',
    borderRadius: 24,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  brandTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  brandSubTitle: {
    color: '#cbd5e1',
    marginTop: 2,
  },
  eyebrow: {
    color: '#f97316',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#020617',
    marginBottom: 8,
  },
  muted: {
    color: '#475569',
    marginBottom: 18,
    lineHeight: 21,
  },
});