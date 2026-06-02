'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { createEmployee } from '@/lib/api';

export default function NewEmployeePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');

    const formData = new FormData(event.currentTarget);

    try {
      await createEmployee({
        firstName: String(formData.get('firstName') || ''),
        middleName: String(formData.get('middleName') || ''),
        lastName: String(formData.get('lastName') || ''),
        gender: String(formData.get('gender') || ''),
        nrcNumber: String(formData.get('nrcNumber') || ''),
        email: String(formData.get('email') || ''),
        phone: String(formData.get('phone') || ''),
        startDate: String(formData.get('startDate') || ''),
      });

      router.push('/employees');
      router.refresh();
    } catch (err) {
      setError('Failed to create employee. Check that the API is running.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <section className="card">
        <h1>Add Employee</h1>
        <p className="muted">
          Capture the basic employee record. Statutory details, bank details, contracts, and conditions of service will be added in the next screens.
        </p>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            First Name
            <input name="firstName" required />
          </label>

          <label>
            Middle Name
            <input name="middleName" />
          </label>

          <label>
            Last Name
            <input name="lastName" required />
          </label>

          <label>
            Gender
            <select name="gender" defaultValue="">
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </label>

          <label>
            NRC Number
            <input name="nrcNumber" placeholder="000000/00/0" />
          </label>

          <label>
            Phone
            <input name="phone" placeholder="0977000000" />
          </label>

          <label>
            Email
            <input name="email" type="email" />
          </label>

          <label>
            Start Date
            <input name="startDate" type="date" />
          </label>

          {error && <div className="notice">{error}</div>}

          <div className="actions">
            <button className="btn" disabled={saving} type="submit">
              {saving ? 'Saving...' : 'Save Employee'}
            </button>
          </div>
        </form>
      </section>
    </AppShell>
  );
}