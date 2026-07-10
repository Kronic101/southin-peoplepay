'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  createAttendanceRecord,
  createLeaveRequestRecord,
  createOvertimeRequestRecord,
  createTimesheetRecord,
} from '@/lib/api';

type Mode = 'attendance' | 'timesheet' | 'leave' | 'overtime';

type Props = {
  mode: Mode;
  sites: any[];
  employees: any[];
  siteManagers: any[];
};

function employeeName(employee: any) {
  return (
    employee?.name ||
    `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim() ||
    employee?.employeeNumber ||
    'Employee'
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function PeopleOpsRequestForm({
  mode,
  sites,
  employees,
  siteManagers,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialSiteId = searchParams.get('siteId') || '';
  const [siteId, setSiteId] = useState(initialSiteId);
  const [employeeId, setEmployeeId] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const selectedSite = useMemo(
    () => sites.find((site) => site.id === siteId),
    [sites, siteId],
  );

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === employeeId),
    [employees, employeeId],
  );

  const primaryManager = siteManagers?.[0] || null;

  const titleByMode: Record<Mode, string> = {
    attendance: 'Capture Attendance',
    timesheet: 'New Timesheet',
    leave: 'New Leave Request',
    overtime: 'New Overtime Request',
  };

  const backHref: Record<Mode, string> = {
    attendance: '/attendance',
    timesheet: '/timesheets',
    leave: '/leave',
    overtime: '/overtime',
  };

  async function submit(formData: FormData) {
    setStatus('');
    setError('');

    if (!employeeId) {
      setError('Select an employee before submitting.');
      return;
    }

    const payload: Record<string, any> = {
      employeeId,
      siteId,
      siteName: selectedSite?.name || selectedEmployee?.siteName || null,
      siteManagerName: primaryManager?.managerName || primaryManager?.name || null,
      siteManagerEmail: primaryManager?.managerEmail || primaryManager?.email || null,
      notes: String(formData.get('notes') || ''),
    };

    try {
      if (mode === 'attendance') {
        await createAttendanceRecord({
          ...payload,
          attendanceDate: formData.get('attendanceDate'),
          shift: formData.get('shift'),
          status: formData.get('attendanceStatus') || 'CAPTURED',
        });
      }

      if (mode === 'timesheet') {
        await createTimesheetRecord({
          ...payload,
          periodStart: formData.get('periodStart'),
          periodEnd: formData.get('periodEnd'),
          normalHours: formData.get('normalHours'),
          overtimeHours: formData.get('overtimeHours'),
        });
      }

      if (mode === 'leave') {
        await createLeaveRequestRecord({
          ...payload,
          leaveType: formData.get('leaveType'),
          startDate: formData.get('startDate'),
          endDate: formData.get('endDate'),
          totalDays: formData.get('totalDays'),
          reason: formData.get('reason'),
        });
      }

      if (mode === 'overtime') {
        await createOvertimeRequestRecord({
          ...payload,
          overtimeDate: formData.get('overtimeDate'),
          requestedHours: formData.get('requestedHours'),
          hourlyRate: formData.get('hourlyRate'),
          reason: formData.get('reason'),
        });
      }

      setStatus(`${titleByMode[mode]} submitted successfully.`);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Request failed.');
    }
  }

  return (
    <section className="ops-form-shell">
      <div className="card">
        <div className="page-header">
          <div>
            <p className="eyebrow">People Operations</p>
            <h1>{titleByMode[mode]}</h1>
            <p>
              Select the correct site and employee before submitting. The site
              manager shown here is used for operational accountability.
            </p>
          </div>

          <Link className="btn-secondary" href={backHref[mode]}>
            Back
          </Link>
        </div>

        {status ? <div className="notice success">{status}</div> : null}
        {error ? <div className="notice danger">{error}</div> : null}

        <form action={submit} className="form-grid">
          <label>
            Site / Location
            <select
              value={siteId}
              onChange={(event) => {
                const nextSiteId = event.target.value;
                setSiteId(nextSiteId);
                setEmployeeId('');
                router.push(
                  nextSiteId ? `${backHref[mode]}/new?siteId=${nextSiteId}` : `${backHref[mode]}/new`,
                );
              }}
            >
              <option value="">Select site</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.code ? `${site.code} - ` : ''}
                  {site.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Employee
            <select
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
            >
              <option value="">Select employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.employeeNumber} - {employeeName(employee)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Responsible Manager
            <input
              value={primaryManager?.managerName || primaryManager?.name || '-'}
              readOnly
            />
          </label>

          <label>
            Manager Email
            <input
              value={primaryManager?.managerEmail || primaryManager?.email || '-'}
              readOnly
            />
          </label>

          {mode === 'attendance' ? (
            <>
              <label>
                Attendance Date
                <input name="attendanceDate" type="date" defaultValue={today()} required />
              </label>

              <label>
                Shift
                <select name="shift" defaultValue="DAY">
                  <option value="DAY">Day Shift</option>
                  <option value="NIGHT">Night Shift</option>
                  <option value="GENERAL">General Shift</option>
                </select>
              </label>

              <label>
                Attendance Status
                <select name="attendanceStatus" defaultValue="PRESENT">
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="LATE">Late</option>
                  <option value="SICK">Sick</option>
                  <option value="OFF">Off</option>
                </select>
              </label>
            </>
          ) : null}

          {mode === 'timesheet' ? (
            <>
              <label>
                Period Start
                <input name="periodStart" type="date" required />
              </label>

              <label>
                Period End
                <input name="periodEnd" type="date" required />
              </label>

              <label>
                Normal Hours
                <input name="normalHours" type="number" step="0.01" min="0" defaultValue="0" />
              </label>

              <label>
                Overtime Hours
                <input name="overtimeHours" type="number" step="0.01" min="0" defaultValue="0" />
              </label>
            </>
          ) : null}

          {mode === 'leave' ? (
            <>
              <label>
                Leave Type
                <select name="leaveType" defaultValue="ANNUAL">
                  <option value="ANNUAL">Annual Leave</option>
                  <option value="SICK">Sick Leave</option>
                  <option value="MATERNITY">Maternity Leave</option>
                  <option value="COMPASSIONATE">Compassionate Leave</option>
                  <option value="UNPAID">Unpaid Leave</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>

              <label>
                Start Date
                <input name="startDate" type="date" required />
              </label>

              <label>
                End Date
                <input name="endDate" type="date" required />
              </label>

              <label>
                Requested Days
                <input name="totalDays" type="number" min="1" defaultValue="1" required />
              </label>

              <label className="form-wide">
                Reason
                <textarea name="reason" rows={4} />
              </label>
            </>
          ) : null}

          {mode === 'overtime' ? (
            <>
              <label>
                Overtime Date
                <input name="overtimeDate" type="date" defaultValue={today()} required />
              </label>

              <label>
                Requested Hours
                <input name="requestedHours" type="number" step="0.01" min="0" required />
              </label>

              <label>
                Hourly Rate
                <input name="hourlyRate" type="number" step="0.01" min="0" />
              </label>

              <label className="form-wide">
                Reason
                <textarea name="reason" rows={4} />
              </label>
            </>
          ) : null}

          {mode !== 'leave' && mode !== 'overtime' ? (
            <label className="form-wide">
              Notes
              <textarea name="notes" rows={4} />
            </label>
          ) : null}

          <div className="form-actions form-wide">
            <button className="btn" type="submit">
              Submit
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}