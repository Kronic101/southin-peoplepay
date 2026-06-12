'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/ui/PageHeader';
import { Notice } from '@/components/ui/Notice';

type AttendanceStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

type AttendanceRecord = {
  id: string;
  employeeNumber: string;
  employeeName: string;
  department: string;
  site: string;
  attendanceDate: string;
  shift: string;
  attendanceType: string;
  hoursWorked: number;
  overtimeHours: number;
  supervisorName: string;
  supervisorEmail: string;
  notes: string;
  status: AttendanceStatus;
  capturedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewComment?: string;
};

const STORAGE_KEY = 'southin_peoplepay_attendance_records';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value?: string) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('en-ZM', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

function loadStoredRecords(): AttendanceRecord[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredRecords(records: AttendanceRecord[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function statusClass(status: AttendanceStatus) {
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED') return 'danger';
  if (status === 'SUBMITTED') return 'warning';
  return 'neutral';
}

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [reviewComment, setReviewComment] = useState('');

  const [form, setForm] = useState({
    employeeNumber: 'STH-000002',
    employeeName: 'Mary Test',
    department: 'Procurement',
    site: 'Project Site',
    attendanceDate: todayIso(),
    shift: 'Day Shift',
    attendanceType: 'Present',
    hoursWorked: '8',
    overtimeHours: '0',
    supervisorName: 'Line Manager',
    supervisorEmail: 'supervisor@southincon.com',
    notes: '',
  });

  useEffect(() => {
    setRecords(loadStoredRecords());
  }, []);

  function updateRecords(nextRecords: AttendanceRecord[]) {
    setRecords(nextRecords);
    saveStoredRecords(nextRecords);
  }

  const summary = useMemo(() => {
    return {
      total: records.length,
      submitted: records.filter((record) => record.status === 'SUBMITTED').length,
      approved: records.filter((record) => record.status === 'APPROVED').length,
      rejected: records.filter((record) => record.status === 'REJECTED').length,
      totalHours: records
        .filter((record) => record.status === 'APPROVED')
        .reduce((sum, record) => sum + Number(record.hoursWorked || 0), 0),
      overtimeHours: records
        .filter((record) => record.status === 'APPROVED')
        .reduce((sum, record) => sum + Number(record.overtimeHours || 0), 0),
    };
  }, [records]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextRecord: AttendanceRecord = {
      id: crypto.randomUUID(),
      employeeNumber: form.employeeNumber.trim(),
      employeeName: form.employeeName.trim(),
      department: form.department.trim(),
      site: form.site.trim(),
      attendanceDate: form.attendanceDate,
      shift: form.shift,
      attendanceType: form.attendanceType,
      hoursWorked: Number(form.hoursWorked || 0),
      overtimeHours: Number(form.overtimeHours || 0),
      supervisorName: form.supervisorName.trim(),
      supervisorEmail: form.supervisorEmail.trim(),
      notes: form.notes.trim(),
      status: 'SUBMITTED',
      capturedAt: new Date().toISOString(),
    };

    updateRecords([nextRecord, ...records]);

    setForm((current) => ({
      ...current,
      attendanceDate: todayIso(),
      hoursWorked: '8',
      overtimeHours: '0',
      notes: '',
    }));
  }

  function reviewRecord(action: 'APPROVED' | 'REJECTED') {
    if (!selectedRecord) return;

    const nextRecords = records.map((record) => {
      if (record.id !== selectedRecord.id) return record;

      return {
        ...record,
        status: action,
        reviewedAt: new Date().toISOString(),
        reviewedBy: selectedRecord.supervisorEmail,
        reviewComment,
      };
    });

    updateRecords(nextRecords);
    setSelectedRecord(null);
    setReviewComment('');
  }

  function seedDemoRecords() {
    const demoRecords: AttendanceRecord[] = [
      {
        id: crypto.randomUUID(),
        employeeNumber: 'STH-000002',
        employeeName: 'Mary Test',
        department: 'Procurement',
        site: 'Project Site',
        attendanceDate: todayIso(),
        shift: 'Day Shift',
        attendanceType: 'Present',
        hoursWorked: 8,
        overtimeHours: 0,
        supervisorName: 'Line Manager',
        supervisorEmail: 'supervisor@southincon.com',
        notes: 'Normal attendance.',
        status: 'SUBMITTED',
        capturedAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        employeeNumber: 'STH-000001',
        employeeName: 'John Test',
        department: 'Operations',
        site: 'Project Site',
        attendanceDate: todayIso(),
        shift: 'Day Shift',
        attendanceType: 'Present',
        hoursWorked: 8,
        overtimeHours: 2,
        supervisorName: 'Line Manager',
        supervisorEmail: 'supervisor@southincon.com',
        notes: 'Worked additional overtime.',
        status: 'APPROVED',
        capturedAt: new Date().toISOString(),
        reviewedAt: new Date().toISOString(),
        reviewedBy: 'supervisor@southincon.com',
        reviewComment: 'Approved for payroll review.',
      },
    ];

    updateRecords([...demoRecords, ...records]);
  }

  function clearDemoRecords() {
    updateRecords([]);
    setSelectedRecord(null);
    setReviewComment('');
  }

  return (
    <AppShell>
      <section className="card">
        <PageHeader
          eyebrow="People Operations"
          title="Time & Attendance"
          description="Capture attendance, absences, shifts, overtime hours, and supervisor approval status before payroll processing."
        />

        <Notice>
          This is the local MVP attendance module. It stores records in the browser for now. The next
          phase will move these records into the API and Supabase database so HR, supervisors, and
          payroll can use the same live attendance data.
        </Notice>

        <div className="action-row" style={{ marginBottom: '1rem', justifyContent: 'flex-end' }}>
          <button className="btn" type="button" onClick={seedDemoRecords}>
            Add Demo Attendance
          </button>

          <button className="btn-secondary" type="button" onClick={clearDemoRecords}>
            Clear Local Attendance
          </button>

          <Link className="btn-secondary" href="/workbench">
            Back to Workbench
          </Link>
        </div>

        <section className="employee-dashboard-grid" style={{ marginTop: '1rem' }}>
          <Summary title="Total Records" label="Captured records" value={summary.total} />
          <Summary title="Submitted" label="Awaiting approval" value={summary.submitted} />
          <Summary title="Approved" label="Ready for payroll" value={summary.approved} />
          <Summary title="Rejected" label="Returned records" value={summary.rejected} />
          <Summary title="Approved Hours" label="Payroll hours" value={summary.totalHours} />
          <Summary title="Overtime Hours" label="Approved overtime" value={summary.overtimeHours} />
        </section>

        <section className="employee-panel" style={{ marginTop: '1rem' }}>
          <h2>Capture Attendance</h2>

          <form className="employee-form-grid" onSubmit={handleSubmit}>
            <label>
              Employee Number
              <input
                value={form.employeeNumber}
                onChange={(event) =>
                  setForm((current) => ({ ...current, employeeNumber: event.target.value }))
                }
                required
              />
            </label>

            <label>
              Employee Name
              <input
                value={form.employeeName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, employeeName: event.target.value }))
                }
                required
              />
            </label>

            <label>
              Department
              <input
                value={form.department}
                onChange={(event) =>
                  setForm((current) => ({ ...current, department: event.target.value }))
                }
              />
            </label>

            <label>
              Site
              <input
                value={form.site}
                onChange={(event) =>
                  setForm((current) => ({ ...current, site: event.target.value }))
                }
              />
            </label>

            <label>
              Attendance Date
              <input
                type="date"
                value={form.attendanceDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, attendanceDate: event.target.value }))
                }
                required
              />
            </label>

            <label>
              Shift
              <select
                value={form.shift}
                onChange={(event) =>
                  setForm((current) => ({ ...current, shift: event.target.value }))
                }
              >
                <option>Day Shift</option>
                <option>Night Shift</option>
                <option>Weekend Shift</option>
                <option>Public Holiday</option>
              </select>
            </label>

            <label>
              Attendance Type
              <select
                value={form.attendanceType}
                onChange={(event) =>
                  setForm((current) => ({ ...current, attendanceType: event.target.value }))
                }
              >
                <option>Present</option>
                <option>Absent</option>
                <option>Sick</option>
                <option>Leave</option>
                <option>Training</option>
                <option>Suspended</option>
              </select>
            </label>

            <label>
              Hours Worked
              <input
                type="number"
                min="0"
                max="24"
                step="0.5"
                value={form.hoursWorked}
                onChange={(event) =>
                  setForm((current) => ({ ...current, hoursWorked: event.target.value }))
                }
              />
            </label>

            <label>
              Overtime Hours
              <input
                type="number"
                min="0"
                max="24"
                step="0.5"
                value={form.overtimeHours}
                onChange={(event) =>
                  setForm((current) => ({ ...current, overtimeHours: event.target.value }))
                }
              />
            </label>

            <label>
              Supervisor Name
              <input
                value={form.supervisorName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, supervisorName: event.target.value }))
                }
              />
            </label>

            <label>
              Supervisor Email
              <input
                type="email"
                value={form.supervisorEmail}
                onChange={(event) =>
                  setForm((current) => ({ ...current, supervisorEmail: event.target.value }))
                }
              />
            </label>

            <label style={{ gridColumn: '1 / -1' }}>
              Notes
              <textarea
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({ ...current, notes: event.target.value }))
                }
                placeholder="Add attendance notes, absence reason, or overtime justification"
                rows={3}
              />
            </label>

            <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
              <button className="btn" type="submit">
                Submit Attendance
              </button>
            </div>
          </form>
        </section>

        <section className="employee-panel" style={{ marginTop: '1rem' }}>
          <h2>Attendance Register</h2>

          {records.length === 0 ? (
            <div className="notice">No attendance records captured yet.</div>
          ) : (
            <div className="employee-table-wrap">
              <table className="employee-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Shift</th>
                    <th>Type</th>
                    <th>Hours</th>
                    <th>Overtime</th>
                    <th>Supervisor</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td>
                        <strong>{record.employeeName}</strong>
                        <br />
                        <span className="muted">{record.employeeNumber}</span>
                      </td>

                      <td>{formatDate(record.attendanceDate)}</td>
                      <td>{record.shift}</td>
                      <td>{record.attendanceType}</td>
                      <td>{record.hoursWorked}</td>
                      <td>{record.overtimeHours}</td>

                      <td>
                        {record.supervisorName}
                        <br />
                        <span className="muted">{record.supervisorEmail}</span>
                      </td>

                      <td>
                        <span className={`employee-status ${statusClass(record.status)}`}>
                          {record.status}
                        </span>
                      </td>

                      <td>
                        <button
                          className="btn-secondary"
                          type="button"
                          onClick={() => {
                            setSelectedRecord(record);
                            setReviewComment(record.reviewComment || '');
                          }}
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {selectedRecord && (
          <section className="employee-panel" style={{ marginTop: '1rem' }}>
            <div className="page-header">
              <div>
                <h2>Review Attendance Record</h2>
                <p className="muted">
                  Approve or reject attendance before the record is used for payroll review.
                </p>
              </div>

              <button
                className="btn-secondary"
                type="button"
                onClick={() => {
                  setSelectedRecord(null);
                  setReviewComment('');
                }}
              >
                Close Review
              </button>
            </div>

            <div className="mini-detail-grid">
              <div>
                <span>Employee</span>
                <strong>{selectedRecord.employeeName}</strong>
              </div>

              <div>
                <span>Employee No.</span>
                <strong>{selectedRecord.employeeNumber}</strong>
              </div>

              <div>
                <span>Date</span>
                <strong>{formatDate(selectedRecord.attendanceDate)}</strong>
              </div>

              <div>
                <span>Shift</span>
                <strong>{selectedRecord.shift}</strong>
              </div>

              <div>
                <span>Hours</span>
                <strong>{selectedRecord.hoursWorked}</strong>
              </div>

              <div>
                <span>Overtime</span>
                <strong>{selectedRecord.overtimeHours}</strong>
              </div>

              <div>
                <span>Status</span>
                <strong>{selectedRecord.status}</strong>
              </div>

              <div>
                <span>Supervisor</span>
                <strong>{selectedRecord.supervisorEmail}</strong>
              </div>
            </div>

            <div className="notice" style={{ marginTop: '1rem' }}>
              <strong>Notes:</strong> {selectedRecord.notes || '-'}
            </div>

            <div className="employee-form-grid" style={{ marginTop: '1rem' }}>
              <label style={{ gridColumn: '1 / -1' }}>
                Review Comment
                <textarea
                  value={reviewComment}
                  onChange={(event) => setReviewComment(event.target.value)}
                  placeholder="Add supervisor review comment"
                  rows={3}
                />
              </label>
            </div>

            {selectedRecord.status === 'SUBMITTED' ? (
              <div className="action-row" style={{ marginTop: '1rem' }}>
                <button className="btn" type="button" onClick={() => reviewRecord('APPROVED')}>
                  Approve Attendance
                </button>

                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => reviewRecord('REJECTED')}
                >
                  Reject Attendance
                </button>
              </div>
            ) : (
              <div className="notice" style={{ marginTop: '1rem' }}>
                This attendance record has already been reviewed and is locked for local audit
                reference.
              </div>
            )}
          </section>
        )}
      </section>
    </AppShell>
  );
}

function Summary({ title, label, value }: { title: string; label: string; value: number }) {
  return (
    <div className="employee-panel">
      <h2>{title}</h2>
      <div className="leave-summary-card">
        <div>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      </div>
    </div>
  );
}