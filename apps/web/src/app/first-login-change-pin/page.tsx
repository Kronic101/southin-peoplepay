'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { employeeChangePin } from '@/lib/api';

export default function FirstLoginChangePinPage() {
  const router = useRouter();
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedEmployeeNumber = localStorage.getItem('peoplepay_employee_number') || '';
    setEmployeeNumber(storedEmployeeNumber);
  }, []);

  async function handleChangePin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (newPin !== confirmPin) {
      setError('New PIN and confirm PIN do not match.');
      return;
    }

    if (!/^\d{6}$/.test(newPin)) {
      setError('New PIN must be exactly 6 digits.');
      return;
    }

    setLoading(true);

    try {
      const result = await employeeChangePin({
        employeeNumber,
        currentPin,
        newPin,
      });

      localStorage.setItem('peoplepay_employee_token', result.token);
      localStorage.setItem('peoplepay_employee_number', result.employee.employeeNumber);

      router.push('/me');
    } catch {
      setError('Failed to change PIN. Check your temporary PIN and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Change Temporary PIN</h1>
        <p className="muted">For security, you must change your temporary PIN before accessing your portal.</p>

        <form onSubmit={handleChangePin}>
          <label>
            Employee Number
            <input value={employeeNumber} readOnly />
          </label>

          <label>
            Temporary PIN
            <input
              value={currentPin}
              onChange={(event) => setCurrentPin(event.target.value)}
              type="password"
              required
            />
          </label>

          <label>
            New 6-Digit PIN
            <input
              value={newPin}
              onChange={(event) => setNewPin(event.target.value)}
              type="password"
              required
            />
          </label>

          <label>
            Confirm New PIN
            <input
              value={confirmPin}
              onChange={(event) => setConfirmPin(event.target.value)}
              type="password"
              required
            />
          </label>

          {error && <div className="notice">{error}</div>}

          <button className="btn" disabled={loading} type="submit">
            {loading ? 'Updating...' : 'Change PIN'}
          </button>
        </form>
      </section>
    </main>
  );
}