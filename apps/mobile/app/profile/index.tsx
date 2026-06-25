import { useRouter } from 'expo-router';
import { SafeAreaView, StyleSheet, Text } from 'react-native';

import AppButton from '../../src/components/AppButton';
import AppCard from '../../src/components/AppCard';
import { useAuth } from '../../src/hooks/useAuth';

export default function ProfilePage() {
  const router = useRouter();
  const auth = useAuth();

  async function handleLogout() {
    await auth.logout();
    router.replace('/login');
  }

  return (
    <SafeAreaView style={styles.page}>
      <AppCard>
        <Text style={styles.eyebrow}>Profile</Text>
        <Text style={styles.title}>{auth.session?.displayName || 'Mobile User'}</Text>
        <Text style={styles.muted}>Role: {auth.session?.role || '-'}</Text>
        <Text style={styles.muted}>Employee No: {auth.session?.employeeNo || '-'}</Text>
      </AppCard>

      <AppButton title="Logout" variant="danger" onPress={handleLogout} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#eef4f8',
    padding: 16,
  },
  eyebrow: {
    color: '#f97316',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  title: {
    color: '#020617',
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 8,
  },
  muted: {
    color: '#475569',
    marginBottom: 6,
  },
});