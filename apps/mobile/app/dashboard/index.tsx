import { Link } from 'expo-router';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AppCard from '../../src/components/AppCard';

const modules = [
  {
    title: 'Vehicle Inspection',
    description: 'Daily pre-start vehicle checklist.',
    href: '/fleet/inspections/new',
  },
  {
    title: 'Defect Report',
    description: 'Report vehicle defects from the field.',
    href: '/fleet/defects/new',
  },
  {
    title: 'Trip Capture',
    description: 'Start and close dispatch trips.',
    href: '/fleet/trips/new',
  },
  {
    title: 'Fuel Log',
    description: 'Capture fuel receipts and odometer readings.',
    href: '/fleet/fuel/new',
  },
  {
    title: 'Asset Scanner',
    description: 'Scan asset QR tags for lookup and stock movement.',
    href: '/assets/scanner',
  },
  {
    title: 'Stock Count',
    description: 'Capture physical stock counts from site.',
    href: '/assets/stock-counts/new',
  },
];

export default function DashboardPage() {
  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppCard>
          <Text style={styles.eyebrow}>Southin Mobile</Text>
          <Text style={styles.title}>Field Dashboard</Text>
          <Text style={styles.muted}>
            Mobile capture for Fleet and Asset Management. Web users review, approve and post records from the Southin Operations Hub.
          </Text>
        </AppCard>

        <View style={styles.grid}>
          {modules.map((module) => (
            <Link key={module.href} href={module.href as any} style={styles.moduleCard}>
              <Text style={styles.moduleTitle}>{module.title}</Text>
              <Text style={styles.moduleText}>{module.description}</Text>
            </Link>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#eef4f8',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
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
    lineHeight: 21,
  },
  grid: {
    gap: 12,
  },
  moduleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 18,
    textDecorationLine: 'none',
  },
  moduleTitle: {
    color: '#020617',
    fontWeight: '900',
    fontSize: 17,
    marginBottom: 6,
  },
  moduleText: {
    color: '#475569',
    lineHeight: 20,
  },
});