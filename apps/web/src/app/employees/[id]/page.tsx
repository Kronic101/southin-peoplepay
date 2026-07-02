import { AppShell } from '@/components/AppShell';
import { EmployeeProfileTabs } from '../[id]/components/EmployeeProfileTabs';
import { getEmployee, getEmployeeSetupLookups } from '@/lib/api';

export default async function EmployeeProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const [employee, lookups] = await Promise.all([
    getEmployee(params.id),
    getEmployeeSetupLookups(),
  ]);

  return (
    <AppShell>
      <EmployeeProfileTabs employee={employee} lookups={lookups} />
    </AppShell>
  );
}