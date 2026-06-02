import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { getEmployees } from '@/lib/api';

export default async function EmployeesPage() {
  const employees = await getEmployees();

  return (
    <AppShell>
      <section className="card">
        <div className="page-header">
          <div>
            <h1>Employees</h1>
            <p className="muted">Employee register, profile, contracts, documents, and statutory details.</p>
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
                <th>Phone</th>
                <th>Status</th>
                <th>Portal</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={5}>No employees captured yet.</td>
                </tr>
              ) : (
                employees.map((employee) => (
                  <tr key={employee.id}>
                    <td>{employee.employeeNumber}</td>
                    <td>
                      <Link href={`/employees/${employee.id}`}>
                        {employee.firstName} {employee.lastName}
                      </Link>
                    </td>
                    <td>{employee.phone || '-'}</td>
                    <td>{employee.status}</td>
                    <td>{employee.portalAccount ? 'Enabled' : 'Not enabled'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}