import { AppShell } from '@/components/AppShell';
import { getEmployee, getEmployeeSetupLookups } from '@/lib/api';
import { EmployeeProfileTabs } from './components/EmployeeProfileTabs';

type EmployeeProfilePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EmployeeProfilePage({ params }: EmployeeProfilePageProps) {
  const { id } = await params;

  const [employee, lookups] = await Promise.all([
    getEmployee(id),
    getEmployeeSetupLookups(),
  ]);

  return (
    <AppShell>
      <EmployeeProfileTabs employee={employee} lookups={lookups} />
    </AppShell>
  );
}