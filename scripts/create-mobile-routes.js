const fs = require('fs');
const path = require('path');

const routes = [
  ['apps/mobile/app/fleet/inspections/index.tsx', 'Fleet Management', 'Vehicle Inspections', 'View submitted vehicle inspections and start a new daily pre-start checklist.', '/fleet/inspections/new', 'Start New Inspection'],
  ['apps/mobile/app/fleet/inspections/new.tsx', 'Fleet Management', 'New Vehicle Inspection', 'Complete the full pre-start checklist before driving.', '/dashboard', 'Back to Dashboard'],

  ['apps/mobile/app/fleet/defects/index.tsx', 'Fleet Management', 'Defect Reports', 'View field-reported vehicle defects and escalate critical defects to workshop.', '/fleet/defects/new', 'Raise Defect'],
  ['apps/mobile/app/fleet/defects/new.tsx', 'Fleet Management', 'New Defect Report', 'Capture vehicle defect, severity, odometer, location and comments.', '/fleet/defects', 'Back to Defects'],

  ['apps/mobile/app/fleet/trips/index.tsx', 'Fleet Management', 'Fleet Trips', 'View trip records captured by dispatch and drivers.', '/fleet/trips/new', 'Create Trip'],
  ['apps/mobile/app/fleet/trips/new.tsx', 'Fleet Management', 'New Trip', 'Capture trip purpose, origin, destination and opening odometer.', '/fleet/trips', 'Back to Trips'],

  ['apps/mobile/app/fleet/fuel/index.tsx', 'Fleet Management', 'Fuel Logs', 'View mobile fuel logs submitted by drivers and dispatch.', '/fleet/fuel/new', 'Capture Fuel Log'],
  ['apps/mobile/app/fleet/fuel/new.tsx', 'Fleet Management', 'New Fuel Log', 'Capture fuel litres, amount, station, receipt and odometer reading.', '/fleet/fuel', 'Back to Fuel Logs'],

  ['apps/mobile/app/assets/scanner/index.tsx', 'Asset Management', 'QR Scanner', 'Scan asset and stock QR tags for lookup, movement, custody and stock-count support.', '/dashboard', 'Back to Dashboard'],

  ['apps/mobile/app/assets/movements/index.tsx', 'Asset Management', 'Asset Movements', 'View asset and stores movement requests captured from the field.', '/assets/movements/new', 'Create Movement'],
  ['apps/mobile/app/assets/movements/new.tsx', 'Asset Management', 'New Asset Movement', 'Capture stock issue, return, transfer or field asset movement request.', '/assets/movements', 'Back to Movements'],

  ['apps/mobile/app/assets/stock-counts/index.tsx', 'Asset Management', 'Stock Counts', 'View physical stock count sessions captured by field teams.', '/assets/stock-counts/new', 'Create Stock Count'],
  ['apps/mobile/app/assets/stock-counts/new.tsx', 'Asset Management', 'New Stock Count', 'Start a site physical count and capture counted quantities.', '/assets/stock-counts', 'Back to Stock Counts'],
];

function pageTemplate(eyebrow, title, description, actionHref, actionLabel) {
  return `import { Link } from 'expo-router';
import { SafeAreaView, ScrollView, StyleSheet, Text } from 'react-native';

import AppCard from '../../../src/components/AppCard';

export default function Page() {
  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppCard>
          <Text style={styles.eyebrow}>${eyebrow}</Text>
          <Text style={styles.title}>${title}</Text>
          <Text style={styles.muted}>${description}</Text>
        </AppCard>

        <Link href="${actionHref}" style={styles.button}>
          ${actionLabel}
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
`;
}

for (const [filePath, eyebrow, title, description, actionHref, actionLabel] of routes) {
  const absolutePath = path.resolve(filePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(
    absolutePath,
    pageTemplate(eyebrow, title, description, actionHref, actionLabel),
    'utf8',
  );

  console.log(`Created: ${filePath}`);
}

console.log('Mobile route pages created successfully.');