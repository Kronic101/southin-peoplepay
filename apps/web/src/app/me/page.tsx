'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EmployeePortalShell } from '@/components/EmployeePortalShell';
import { employeeAuthHeaders, getEmployeePortalToken } from '@/lib/employee-auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function formatDate(value?: string | null) {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return '-';
  }
}

function formatMoney(value: unknown) {
  return `K ${Number(value || 0).toFixed(2)}`;
}

function getEmployeeName(employee: any) {
  const firstName = employee?.firstName || '';
  const lastName = employee?.lastName || '';
  const name = `${firstName} ${lastName}`.trim();

  return name || employee?.name || 'Employee';
}

function getInitials(name: string) {
  const parts = name.split(' ').filter(Boolean);

  if (parts.length === 0) return 'E';

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function normalizeEmployeeProfile(data: any) {
  return data?.employee || data?.profile || data?.user || data || null;
}

function normalizePayslips(data: any) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.payslips)) return data.payslips;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

export default function EmployeePortalHomePage() {
  const router = useRouter();

  const [employee, setEmployee] = useState<any>(null);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function loadPortalData() {
      setLoading(true);
      setMessage('');

      try {
        const token = getEmployeePortalToken();

        if (!token) {
          router.push('/employee-login');
          return;
        }

        const profileResponse = await fetch(`${API_URL}/auth/employee/me`, {
          headers: employeeAuthHeaders(),
          cache: 'no-store',
        });

        if (!profileResponse.ok) {
          const text = await profileResponse.text();
          throw new Error(text || 'Unable to load employee profile.');
        }

        const profileData = await profileResponse.json();
        const employeeProfile = normalizeEmployeeProfile(profileData);

        const payslipsResponse = await fetch(`${API_URL}/auth/employee/payslips`, {
          headers: employeeAuthHeaders(),
          cache: 'no-store',
        });

        const payslipData = payslipsResponse.ok ? await payslipsResponse.json() : [];

        setEmployee(employeeProfile);
        setPayslips(normalizePayslips(payslipData));
      } catch (error: any) {
        setMessage(error?.message || 'Unable to load employee portal.');
      } finally {
        setLoading(false);
      }
    }

    loadPortalData();
  }, [router]);

  const employeeName = useMemo(() => getEmployeeName(employee), [employee]);
  const initials = useMemo(() => getInitials(employeeName), [employeeName]);

  const latestPayslip = payslips?.[0] || null;

  const standardLeaveDays = 2;
  const mothersDayLeave = String(employee?.gender || '').toLowerCase() === 'female' ? 1 : 0;
  const totalLeaveEntitlement = standardLeaveDays + mothersDayLeave;

  return (
    <EmployeePortalShell>
      <section className="employee-home">
        {loading && <div className="notice">Loading your employee portal...</div>}

        {message && (
          <div className="notice danger">
            {message}
            <div style={{ marginTop: 10 }}>
              <Link className="btn-secondary" href="/employee-login">
                Return to Employee Login
              </Link>
            </div>
          </div>
        )}

        {!loading && employee && (
          <>
            <div className="employee-hero-card">
              <div>
                <span className="eyebrow">Employee Self-Service</span>
                <h1>Welcome back, {employeeName}</h1>
                <p>
                  View your profile, leave entitlement, payslips, tax certificates, and employee
                  self-service information from one secure portal.
                </p>
              </div>

              <div className="employee-profile-card">
                <div className="employee-avatar">{initials}</div>
                <strong>{employeeName}</strong>
                <span>{employee?.employeeNumber || '-'}</span>
              </div>
            </div>

            <div className="employee-portal-grid">
              <article className="employee-panel employee-identity-panel">
                <div className="employee-panel-header">
                  <h2>{employeeName}</h2>
                  <span>{employee?.jobTitle?.name || employee?.jobTitle || 'Employee'}</span>
                </div>

                <div className="employee-person-icon">👤</div>

                <div className="employee-action-list">
                  <Link href="/me/details">View My Details</Link>
                  <Link href="/me/payslips">View Payslips</Link>
                  <Link href="/me/tax-certificates">View Tax Certificates</Link>
                  <Link href="/me/leave">View Leave Balances</Link>
                </div>
              </article>

              <article className="employee-panel">
                <div className="employee-panel-title-row">
                  <h2>My Details</h2>
                  <span className="mini-badge">Profile</span>
                </div>

                <div className="employee-info-list">
                  <div>
                    <span>Employee No.</span>
                    <strong>{employee?.employeeNumber || '-'}</strong>
                  </div>

                  <div>
                    <span>Department</span>
                    <strong>{employee?.department?.name || '-'}</strong>
                  </div>

                  <div>
                    <span>Job Title</span>
                    <strong>{employee?.jobTitle?.name || '-'}</strong>
                  </div>

                  <div>
                    <span>Site</span>
                    <strong>{employee?.site?.name || '-'}</strong>
                  </div>
                </div>
              </article>

              <article className="employee-panel">
                <div className="employee-panel-title-row">
                  <h2>My Leave</h2>
                  <span className="mini-badge">Balance</span>
                </div>

                <div className="leave-balance-visual">
                  <strong>{totalLeaveEntitlement}</strong>
                  <span>available days</span>
                </div>

                <div className="employee-info-list compact">
                  <div>
                    <span>Monthly entitlement</span>
                    <strong>{standardLeaveDays} days</strong>
                  </div>

                  <div>
                    <span>Mother’s Day</span>
                    <strong>{mothersDayLeave} day{mothersDayLeave === 1 ? '' : 's'}</strong>
                  </div>
                </div>

                <Link className="employee-panel-link" href="/me/leave">
                  Open Leave
                </Link>
              </article>

              <article className="employee-panel">
                <div className="employee-panel-title-row">
                  <h2>My Payslips</h2>
                  <span className="mini-badge">Payroll</span>
                </div>

                {latestPayslip ? (
                  <>
                    <p className="employee-muted">Latest payslip</p>

                    <div className="latest-payslip-card">
                      <div>
                        <strong>
                          {latestPayslip?.payrollPeriod?.periodName ||
                            latestPayslip?.payrollRun?.payrollPeriod?.periodName ||
                            'Payslip'}
                        </strong>
                        <span>
                          Pay date:{' '}
                          {formatDate(
                            latestPayslip?.payrollPeriod?.payDate ||
                              latestPayslip?.payrollRun?.payrollPeriod?.payDate,
                          )}
                        </span>
                      </div>

                      <div>
                        <span>Net Pay</span>
                        <strong>{formatMoney(latestPayslip?.netPay)}</strong>
                      </div>
                    </div>

                    <Link className="employee-panel-link" href="/me/payslips">
                      View Payslips
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="employee-muted">No generated payslips are available yet.</p>
                    <Link className="employee-panel-link" href="/me/payslips">
                      Check Payslips
                    </Link>
                  </>
                )}
              </article>

              <article className="employee-panel">
                <div className="employee-panel-title-row">
                  <h2>My Tax Certificates</h2>
                  <span className="mini-badge">Tax</span>
                </div>

                <p className="employee-muted">
                  Tax certificates will appear once Finance publishes annual tax records.
                </p>

                <div className="tax-placeholder">
                  <strong>Latest tax certificate</strong>
                  <span>None available</span>
                </div>

                <Link className="employee-panel-link" href="/me/tax-certificates">
                  Open Tax Certificates
                </Link>
              </article>

              <article className="employee-panel">
                <div className="employee-panel-title-row">
                  <h2>My Submitted Items</h2>
                  <span className="mini-badge">Requests</span>
                </div>

                <div className="submitted-items-grid">
                  <div>
                    <span>Leave</span>
                    <strong>0</strong>
                  </div>

                  <div>
                    <span>Claims</span>
                    <strong>0</strong>
                  </div>

                  <div>
                    <span>Profile Updates</span>
                    <strong>0</strong>
                  </div>
                </div>
              </article>

              <article className="employee-panel">
                <div className="employee-panel-title-row">
                  <h2>Upcoming Birthdays</h2>
                  <span className="mini-badge">Team</span>
                </div>

                <div className="birthday-row">
                  <span>{employeeName}</span>
                  <strong>{employee?.dateOfBirth ? formatDate(employee?.dateOfBirth) : '-'}</strong>
                </div>

                <p className="employee-muted">
                  Birthday reminders can later be connected to the HR calendar.
                </p>
              </article>
            </div>
          </>
        )}
      </section>
    </EmployeePortalShell>
  );
}