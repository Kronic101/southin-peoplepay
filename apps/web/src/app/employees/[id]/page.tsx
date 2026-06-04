import Link from 'next/link';
import { getEmployee } from '@/lib/api';
import { EmployeeEditor } from './components/EmployeeEditor';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function formatDate(value?: string | null) {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return '-';
  }
}

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const employee = await getEmployee(id);

  return (
    <section className="card">
      <div className="page-header">
        <div>
          <h1>
            {employee.firstName} {employee.lastName}
          </h1>
          <p className="muted">
            {employee.employeeNumber} · {employee.status}
          </p>
        </div>

        <div className="action-row">
          <Link className="btn-secondary" href="/employees">
            Employees
          </Link>

          <Link className="btn-secondary" href="/hr/payroll-readiness">
            Payroll Readiness
          </Link>

          <Link className="btn" href="/payroll">
            Payroll
          </Link>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">Department</span>
          <strong>{employee.department?.name || '-'}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Job Title</span>
          <strong>{employee.jobTitle?.name || '-'}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Site</span>
          <strong>{employee.site?.name || '-'}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Employment Type</span>
          <strong>{employee.employmentType?.name || '-'}</strong>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">Email</span>
          <strong>{employee.email || '-'}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Phone</span>
          <strong>{employee.phone || '-'}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Start Date</span>
          <strong>{formatDate(employee.startDate)}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Bank Status</span>
          <strong>{employee.bankDetailsStatus || 'PENDING_VALIDATION'}</strong>
        </div>
      </div>

      <div className="notice">
        Finance must validate employee bank details before payment batches can move to final payment
        preparation.
      </div>

      <EmployeeEditor employee={employee} />
    </section>
  );
}