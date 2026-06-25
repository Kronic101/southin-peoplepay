import { Link } from 'expo-router';
import { SafeAreaView, ScrollView, StyleSheet, Text } from 'react-native';

import AppCard from '../../../src/components/AppCard';

export default function Page() {
  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppCard>
          <Text style={styles.eyebrow}>Fleet Management</Text>
          <Text style={styles.title}>Fuel Logs</Text>
          <Text style={styles.muted}>View mobile fuel logs submitted by drivers and dispatch.</Text>
        </AppCard>

        <Link href="/fleet/fuel/new" style={styles.button}>
          Capture Fuel Log
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#eef4f8' },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  eyebrow: {
    color: '#f97316',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  title: {
    color: '#020617',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
  },
  muted: {
    color: '#475569',
    lineHeight: 21,
  },
  button: {
    backgroundColor: '#071426',
    color: '#ffffff',
    textAlign: 'center',
    paddingVertical: 14,
    borderRadius: 15,
    overflow: 'hidden',
    fontWeight: '900',
  },
});
