import { AppShell } from '@/components/AppShell';
import { EmployeeProfileTabs } from '../[id]/components/EmployeeProfileTabs';
import {
  getEmployee,
  getEmployeeSetupLookups,
  getOperationsMasterData,
} from '@/lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EmployeeProfilePage({ params }: PageProps) {
  const { id } = await params;

  const [employee, setupLookups, operationsMasterData] = await Promise.all([
    getEmployee(id),
    getEmployeeSetupLookups().catch(() => ({
      departments: [],
      jobTitles: [],
      employmentTypes: [],
      contractTypes: [],
      serviceConditionTemplates: [],
    })),
    getOperationsMasterData(),
  ]);

  const lookups = {
    ...(setupLookups || {}),

    // New operational sites from the clean master-data endpoint
    sites: operationsMasterData?.sites || [],

    // Keep this available for later stock/stores/asset screens
    stockLocations: operationsMasterData?.stockLocations || [],
    warehouseLocations: operationsMasterData?.warehouseLocations || [],
    siteStockLocations: operationsMasterData?.siteStockLocations || [],
    containerLocations: operationsMasterData?.containerLocations || [],
  };

  return (
    <AppShell>
      <section className="card">
        <EmployeeProfileTabs employee={employee} lookups={lookups} />
      </section>
    </AppShell>
  );
}