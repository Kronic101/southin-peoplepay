import { AppShell } from '@/components/AppShell';
import { getStatutorySettings } from '@/lib/api';
import { StatutorySettingsClient } from './components/StatutorySettingsClient';

export default async function StatutoryPage() {
  const settings = await getStatutorySettings();

  return (
    <AppShell>
      <StatutorySettingsClient settings={settings} />
    </AppShell>
  );
}