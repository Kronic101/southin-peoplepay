import { AppShell } from '@/components/AppShell';
import { getOperationalSites } from '@/lib/api';

export default async function SitesPage() {
  const sites = await getOperationalSites();

  return (
    <AppShell>
      <section className="card">
        <div className="page-header">
          <div>
            <h1>Sites & Locations</h1>
            <p className="muted">
              Manage operational sites used for employees, stores requisitions, assets and stock balances.
            </p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Site</th>
                <th>Location</th>
                <th>Site Managers</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {!sites.length ? (
                <tr>
                  <td colSpan={5}>No sites created yet.</td>
                </tr>
              ) : (
                sites.map((site) => (
                  <tr key={site.id}>
                    <td>{site.code}</td>
                    <td>
                      <strong>{site.name}</strong>
                      <br />
                      <span className="muted">{site.description || '-'}</span>
                    </td>
                    <td>{site.location || '-'}</td>
                    <td>
                      {site.siteManagers?.length
                        ? site.siteManagers.map((manager) => (
                            <div key={manager.id}>
                              <strong>{manager.managerName}</strong>
                              <br />
                              <span className="muted">{manager.managerEmail}</span>
                            </div>
                          ))
                        : '-'}
                    </td>
                    <td>{site.isActive ? 'Active' : 'Inactive'}</td>
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