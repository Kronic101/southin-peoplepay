import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { getEmployees } from '@/lib/api';

function displayValue(value: any, fallback = '-') {
  if (value === null || value === undefined || value === '') return fallback;

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'object') {
    return value.name || value.title || value.label || value.code || fallback;
  }

  return fallback;
}

function formatRate(value: any) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return '';
  return amount.toLocaleString('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default async function EmployeesPage() {
  const employees = await getEmployees();

  return (
    <AppShell>
      <section className="card">
        <div className="page-header">
          <div>
            <h1>Employees</h1>
            <p className="muted">
              Employee register, profile, contracts, documents, statutory details, and portal access.
            </p>
          </div>

          <Link className="btn" href="/employees/new">
            Add Employee
          </Link>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee No.</th>
                <th>Name</th>
                <th>Site</th>
                <th>Phone</th>
                <th>Employment / Pay</th>
                <th>Status</th>
                <th>Portal</th>
              </tr>
            </thead>

            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={7}>No employees captured yet.</td>
                </tr>
              ) : (
                employees.map((employee: any) => {
                  const portalEnabled = Boolean(employee.portalAccount?.isActive);
                  const portalProfile = employee.portalAccount?.accessProfile || '';

                  const siteLabel =
                    employee.siteName ||
                    employee.site?.name ||
                    displayValue(employee.site, '');

                  const employmentTypeLabel = displayValue(employee.employmentType);
                  const payBasis = displayValue(employee.payBasis);

                  return (
                    <tr className="employee-row" key={employee.id}>
                      <td>{employee.employeeNumber}</td>

                      <td>
                        <Link className="employee-link" href={`/employees/${employee.id}`}>
                          {employee.firstName} {employee.lastName}
                        </Link>
                        <span className="portal-profile">Click to open employee profile</span>
                      </td>

                      <td>{siteLabel || '-'}</td>
                      <td>{employee.phone || '-'}</td>

                      <td>
                        <strong>{employmentTypeLabel}</strong>
                        <br />
                        <span className="muted">
                          {payBasis}
                          {employee.payBasis === 'HOURLY' && employee.hourlyRate
                            ? ` @ K ${formatRate(employee.hourlyRate)}/hr`
                            : ''}
                          {employee.payBasis === 'DAILY' && employee.dailyRate
                            ? ` @ K ${formatRate(employee.dailyRate)}/day`
                            : ''}
                          {employee.payBasis === 'MONTHLY' && employee.monthlyRate
                            ? ` @ K ${formatRate(employee.monthlyRate)}/month`
                            : ''}
                        </span>
                      </td>

                      <td>{displayValue(employee.status)}</td>

                      <td>
                        <span className={portalEnabled ? 'portal-badge enabled' : 'portal-badge disabled'}>
                          {portalEnabled ? 'Enabled' : 'Not enabled'}
                        </span>

                        {portalProfile ? (
                          <span className="portal-profile">{portalProfile}</span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}