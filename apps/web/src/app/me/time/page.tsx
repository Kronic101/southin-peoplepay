'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { EmployeePortalShell } from '../../employees/[id]/components/EmployeePortalShell';
import {
  clearEmployeePortalToken,
  employeeAuthHeaders,
  getEmployeePortalToken,
} from '@/lib/employee-auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function formatName(employee: any) {
  return `${employee?.firstName || ''} ${employee?.middleName || ''} ${employee?.lastName || ''}`
    .replace(/\s+/g, ' ')
    .trim();
}

function formatDate(value: any) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('en-ZM', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

function displayValue(value: any, fallback = '-') {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') return value.name || value.title || value.label || value.code || fallback;
  return fallback;
}

function statusClass(value: string) {
  const status = String(value || '').toUpperCase();

  if (['APPROVED', 'PRESENT', 'VALIDATED', 'COMPLETED'].includes(status)) return 'success';
  if (['REJECTED', 'ABSENT', 'CANCELLED', 'EXCEPTION'].includes(status)) return 'danger';

  return 'warning';
}

function normalizeArray(value: any) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.records)) return value.records;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

export default function EmployeeTimePage() {
  const [employee, setEmployee] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [overtime, setOvertime] = useState<any[]>([]);
  const [leave, setLeave] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const employeeName = useMemo(() => formatName(employee), [employee]);

  useEffect(() => {
    async function loadTimeCentre() {
      setLoading(true);
      setError('');

      const token = getEmployeePortalToken();

      if (!token) {
        setError('Your employee session was not found. Please login again.');
        setLoading(false);
        return;
      }

      try {
        const [profileResponse, timeResponse, leaveResponse] = await Promise.all([
          fetch(`${API_URL}/auth/employee/me`, {
            method: 'GET',
            headers: employeeAuthHeaders(),
            cache: 'no-store',
          }),
          fetch(`${API_URL}/auth/employee/time-summary`, {
            method: 'GET',
            headers: employeeAuthHeaders(),
            cache: 'no-store',
          }),
          fetch(`${API_URL}/leave/employee/requests`, {
            method: 'GET',
            headers: employeeAuthHeaders(),
            cache: 'no-store',
          }),
        ]);

        const profileResult = await profileResponse.json().catch(() => null);
        const timeResult = await timeResponse.json().catch(() => null);
        const leaveResult = await leaveResponse.json().catch(() => null);

        if (!profileResponse.ok) {
          clearEmployeePortalToken();
          throw new Error(profileResult?.message || 'Unable to load employee profile.');
        }

        setEmployee(profileResult?.employee || profileResult);

        if (timeResponse.ok) {
          const payload = timeResult?.data || timeResult || {};

          setSummary(payload.summary || payload);
          setAttendance(normalizeArray(payload.attendance || payload.attendanceRecords));
          setTimesheets(normalizeArray(payload.timesheets || payload.timesheetRecords));
          setOvertime(normalizeArray(payload.overtime || payload.overtimeRecords));
        } else {
          setSummary(null);
          setAttendance([]);
          setTimesheets([]);
          setOvertime([]);
        }

        if (leaveResponse.ok) {
          setLeave(normalizeArray(leaveResult?.requests || leaveResult));
        } else {
          setLeave([]);
        }
      } catch (err: any) {
        setError(err?.message || 'Unable to load employee time information.');
      } finally {
        setLoading(false);
      }
    }

    loadTimeCentre();
  }, []);

  return (
    <EmployeePortalShell>
      <section className="employee-hero-card">
        <div>
          <div className="hero-kicker">My Time</div>
          <h1>Time and Attendance Centre</h1>
          <p>
            View attendance, timesheet, overtime, and leave records linked to your employee profile,
            site, and payroll period.
          </p>
        </div>

        <Link className="btn-secondary" href="/me">
          Back to Portal
        </Link>
      </section>

      {loading && <div className="notice">Loading time records...</div>}

      {error && (
        <div className="notice danger" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {!loading && employee && (
        <>
          <section className="employee-dashboard-grid">
            <div className="employee-panel">
              <h2>Employee</h2>

              <div className="mini-detail-grid">
                <Detail label="Employee No." value={employee.employeeNumber} />
                <Detail label="Employee Name" value={employeeName} />
                <Detail label="Site" value={displayValue(employee?.site || employee?.siteName)} />
                <Detail label="Pay Basis" value={employee?.payBasis || '-'} />
              </div>
            </div>

            <div className="employee-panel">
              <h2>Summary</h2>

              <div className="mini-detail-grid">
                <Detail label="Attendance Records" value={summary?.attendanceCount ?? attendance.length} />
                <Detail label="Timesheets" value={summary?.timesheetCount ?? timesheets.length} />
                <Detail label="Overtime Records" value={summary?.overtimeCount ?? overtime.length} />
                <Detail label="Leave Requests" value={summary?.leaveCount ?? leave.length} />
              </div>
            </div>

            <div className="employee-panel">
              <h2>Approved Hours</h2>

              <div className="mini-detail-grid">
                <Detail label="Normal Hours" value={summary?.approvedHours ?? 0} />
                <Detail label="Overtime Hours" value={summary?.approvedOvertimeHours ?? 0} />
                <Detail label="Pending Items" value={summary?.pendingItems ?? 0} />
                <Detail label="Exceptions" value={summary?.exceptions ?? 0} />
              </div>
            </div>
          </section>

          <RecordTable
            title="Attendance Records"
            emptyText="No attendance records found yet."
            columns={['Date', 'Site', 'Clock In', 'Clock Out', 'Status']}
            rows={attendance.map((item) => [
              formatDate(item.attendanceDate || item.date),
              displayValue(item.siteName || item.site),
              displayValue(item.clockIn),
              displayValue(item.clockOut),
              <span key="status" className={`employee-status ${statusClass(item.status)}`}>
                {displayValue(item.status, 'CAPTURED')}
              </span>,
            ])}
          />

          <RecordTable
            title="Timesheets"
            emptyText="No timesheet records found yet."
            columns={['Period', 'Site', 'Normal Hours', 'Overtime Hours', 'Status']}
            rows={timesheets.map((item) => [
              `${formatDate(item.periodStart)} - ${formatDate(item.periodEnd)}`,
              displayValue(item.siteName || item.site),
              item.normalHours ?? 0,
              item.overtimeHours ?? 0,
              <span key="status" className={`employee-status ${statusClass(item.status)}`}>
                {displayValue(item.status, 'OPEN')}
              </span>,
            ])}
          />

          <RecordTable
            title="Overtime"
            emptyText="No overtime records found yet."
            columns={['Date', 'Site', 'Hours', 'Reason', 'Status']}
            rows={overtime.map((item) => [
              formatDate(item.overtimeDate || item.date || item.createdAt),
              displayValue(item.siteName || item.site),
              item.hours ?? 0,
              displayValue(item.reason || item.description),
              <span key="status" className={`employee-status ${statusClass(item.status)}`}>
                {displayValue(item.status, 'SUBMITTED')}
              </span>,
            ])}
          />

          <RecordTable
            title="Leave Requests"
            emptyText="No leave requests found yet."
            columns={['Leave Type', 'Dates', 'Days', 'Status']}
            rows={leave.map((item) => [
              displayValue(item.leaveType).replaceAll('_', ' '),
              `${formatDate(item.startDate)} - ${formatDate(item.endDate)}`,
              item.totalDays || item.days || '-',
              <span key="status" className={`employee-status ${statusClass(item.status)}`}>
                {displayValue(item.status, 'SUBMITTED').replaceAll('_', ' ')}
              </span>,
            ])}
          />
        </>
      )}
    </EmployeePortalShell>
  );
}

function Detail({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  );
}

function RecordTable({
  title,
  columns,
  rows,
  emptyText,
}: {
  title: string;
  columns: string[];
  rows: any[][];
  emptyText: string;
}) {
  return (
    
    <section className="employee-panel" style={{ marginTop: '1rem' }}>
      <h2>{title}</h2>

      {rows.length === 0 ? (
        <div className="notice">{emptyText}</div>
      ) : (
        <div className="employee-table-wrap">
          <table className="employee-table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
    
  );
}