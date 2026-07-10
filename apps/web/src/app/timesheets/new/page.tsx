import { AppShell } from '@/components/AppShell';
import { PeopleOpsRequestForm } from '../../people-ops/PeopleOpsRequestForm';
import { getPeopleOpsContext } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  searchParams?: Promise<{ siteId?: string }>;
};

export default async function NewTimesheetPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const context = await getPeopleOpsContext(params?.siteId || '');

  return (
    <AppShell>
      <PeopleOpsRequestForm
        mode="timesheet"
        sites={context?.sites || []}
        employees={context?.employees || []}
        siteManagers={context?.siteManagers || []}
      />
    </AppShell>
  );
}