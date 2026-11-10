import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

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

export default function ChangePinPage() {
  const router =
    useRouter();

  const params =
    useLocalSearchParams<{
      employeeNumber?: string;
    }>();

  const auth =
    useAuth();

  const employeeNumber =
    String(
      params.employeeNumber ||
        auth.session
          ?.employeeNo ||
        '',
    )
      .trim()
      .toUpperCase();

  const [
    currentPin,
    setCurrentPin,
  ] = useState('');

  const [
    newPin,
    setNewPin,
  ] = useState('');

  const [
    confirmPin,
    setConfirmPin,
  ] = useState('');

  const [
    saving,
    setSaving,
  ] = useState(false);

  async function handleChangePin() {
    if (!employeeNumber) {
      Alert.alert(
        'Employee number missing',
        'Please return to login and sign in again.',
      );

      return;
    }

    if (!currentPin.trim()) {
      Alert.alert(
        'Current PIN required',
        'Enter your temporary/current PIN.',
      );

      return;
    }

    if (
      newPin.trim().length < 4
    ) {
      Alert.alert(
        'Invalid new PIN',
        'Your new PIN must be at least 4 characters.',
      );

      return;
    }

    if (
      newPin.trim() !==
      confirmPin.trim()
    ) {
      Alert.alert(
        'PINs do not match',
        'Please re-enter your new PIN.',
      );

      return;
    }

    if (
      newPin.trim() ===
      currentPin.trim()
    ) {
      Alert.alert(
        'Choose a new PIN',
        'Your new PIN must be different from the temporary PIN.',
      );

      return;
    }

    setSaving(true);

    try {
      await auth.changePin(
        employeeNumber,
        currentPin,
        newPin,
      );

      Alert.alert(
        'PIN updated',
        'Your new mobile PIN has been saved.',
        [
          {
            text: 'Continue',
            onPress: () =>
              router.replace(
                '/dashboard',
              ),
          },
        ],
      );
    } catch (error: any) {
      Alert.alert(
        'Unable to change PIN',
        error?.message ||
          'PIN change failed.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView
      style={styles.page}
    >
      <View
        style={
          styles.brandCard
        }
      >
        <View
          style={styles.logo}
        >
          <Text
            style={
              styles.logoText
            }
          >
            SP
          </Text>
        </View>

        <View>
          <Text
            style={
              styles.brandTitle
            }
          >
            Southin Operations Hub
          </Text>

          <Text
            style={
              styles.brandSubTitle
            }
          >
            First Login Security
          </Text>
        </View>
      </View>

      <AppCard>
        <Text
          style={styles.eyebrow}
        >
          PIN CHANGE REQUIRED
        </Text>

        <Text
          style={styles.title}
        >
          Set Your PIN
        </Text>

        <Text
          style={styles.muted}
        >
          Your temporary PIN must
          be changed before you can
          use Southin mobile
          operations.
        </Text>

        <Text
          style={
            styles.employee
          }
        >
          {employeeNumber}
        </Text>

        <AppInput
          label="Current / Temporary PIN"
          value={currentPin}
          onChangeText={
            setCurrentPin
          }
          secureTextEntry
          keyboardType="number-pad"
        />

        <AppInput
          label="New PIN"
          value={newPin}
          onChangeText={
            setNewPin
          }
          secureTextEntry
          keyboardType="number-pad"
        />

        <AppInput
          label="Confirm New PIN"
          value={confirmPin}
          onChangeText={
            setConfirmPin
          }
          secureTextEntry
          keyboardType="number-pad"
        />

        <AppButton
          title={
            saving
              ? 'Updating PIN...'
              : 'Change PIN & Continue'
          }
          onPress={
            handleChangePin
          }
          disabled={saving}
        />
      </AppCard>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor:
        '#eef4f8',
      padding: 18,
      justifyContent:
        'center',
    },

    brandCard: {
      backgroundColor:
        '#071426',
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
      backgroundColor:
        '#f97316',
      alignItems: 'center',
      justifyContent:
        'center',
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
      marginBottom: 14,
      lineHeight: 21,
    },

    employee: {
      color: '#071426',
      fontWeight: '900',
      marginBottom: 16,
    },
  });