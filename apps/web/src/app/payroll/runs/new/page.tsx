import { getPayrollPeriods } from '@/lib/api';
import NewPayrollRunForm from './NewPayrollRunForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function NewPayrollRunPage() {
  const data = await getPayrollPeriods();
  const periods = data?.periods || data || [];

  return <NewPayrollRunForm periods={periods} />;
}