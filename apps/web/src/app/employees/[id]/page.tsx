import { AppShell } from '@/components/AppShell';
import { EmployeeProfileTabs } from '../[id]/components/EmployeeProfileTabs';
import { getEmployee, getOperationalSites } from '@/lib/api';

type EmployeeProfilePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EmployeeProfilePage({
  params,
}: EmployeeProfilePageProps) {
  const { id } = await params;

  const [employee, sites] = await Promise.all([
    getEmployee(id),
    getOperationalSites(),
  ]);

  const lookups = {
    departments: [],
    jobTitles: [],
    sites,
    employmentTypes: [],
    contractTypes: [],
    serviceConditionTemplates: [],
  };

  return (
    <AppShell>
      <EmployeeProfileTabs employee={employee} lookups={lookups} />
    </AppShell>
  );
}