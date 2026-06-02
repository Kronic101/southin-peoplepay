import { AppShell } from '@/components/AppShell';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

async function getEmployee(id: string) {
  const res = await fetch(`${API_URL}/employees/${id}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to load employee');
  }

  return res.json();
}

async function createPortalAccount(id: string) {
  'use server';

  await fetch(`${API_URL}/employees/${id}/portal-account`, {
    method: 'POST',
  });
}

export default async function EmployeeProfilePage({ params }: { params: { id: string } }) {
  const employee = await getEmployee(params.id);

  return (
    <AppShell>
      <section className="card">
        <h1>
          {employee.firstName} {employee.lastName}
        </h1>
        <p className="muted">
          {employee.employeeNumber} · {employee.status}
        </p>

        <div className="table-wrap">
          <table>
            <tbody>
              <tr>
                <th>Phone</th>
                <td>{employee.phone || '-'}</td>
              </tr>
              <tr>
                <th>Email</th>
                <td>{employee.email || '-'}</td>
              </tr>
              <tr>
                <th>NRC</th>
                <td>{employee.nrcNumber || '-'}</td>
              </tr>
              <tr>
                <th>Department</th>
                <td>{employee.department?.name || '-'}</td>
              </tr>
              <tr>
                <th>Job Title</th>
                <td>{employee.jobTitle?.name || '-'}</td>
              </tr>
              <tr>
                <th>Employment Type</th>
                <td>{employee.employmentType?.name || '-'}</td>
              </tr>
              <tr>
                <th>Portal Account</th>
                <td>{employee.portalAccount ? 'Enabled' : 'Not enabled'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {!employee.portalAccount && (
          <form action={createPortalAccount.bind(null, employee.id)} className="actions">
            <button className="btn" type="submit">
              Create Employee Portal Account
            </button>
          </form>
        )}

        <div className="notice">
          Next build step: show temporary PIN to HR after portal account creation, then build first-login PIN change.
        </div>
      </section>
    </AppShell>
  );
}