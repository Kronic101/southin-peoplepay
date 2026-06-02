'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { createPayrollPeriod } from '@/lib/api';

export default function NewPayrollPeriodPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);

    const formData = new FormData(event.currentTarget);

    try {
      await createPayrollPeriod({
        periodName: String(formData.get('periodName') || ''),
        startDate: String(formData.get('startDate') || ''),
        endDate: String(formData.get('endDate') || ''),
        payDate: String(formData.get('payDate') || ''),
      });

      router.push('/payroll');
      router.refresh();
    } catch {
      setError('Failed to create payroll period.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <section className="card">
        <h1>New Payroll Period</h1>
        <p className="muted">Create the payroll calendar period before opening a payroll run.</p>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Period Name
            <input name="periodName" placeholder="June 2026 Payroll" required />
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
            Pay Date
            <input name="payDate" type="date" required />
          </label>

          {error && <div className="notice">{error}</div>}

          <button className="btn" disabled={saving} type="submit">
            {saving ? 'Saving...' : 'Create Period'}
          </button>
        </form>
      </section>
    </AppShell>
  );
}