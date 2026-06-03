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
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedEmployeeNumber =
      localStorage.getItem('peoplepay_employee_number') ||
      localStorage.getItem('employeeNumber') ||
      '';

    setEmployeeNumber(storedEmployeeNumber);
  }, []);

  function saveEmployeeSession(result: any) {
    const token = result?.token;
    const resolvedEmployeeNumber =
      result?.employee?.employeeNumber || employeeNumber.trim();

    if (token) {
      localStorage.setItem('peoplepay_employee_token', token);
      localStorage.setItem('peoplepay_employee_number', resolvedEmployeeNumber);

      localStorage.setItem('employeeToken', token);
      localStorage.setItem('employeeNumber', resolvedEmployeeNumber);

      localStorage.setItem('southin_peoplepay_employee_token', token);
    }
  }

  async function handleChangePin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');
    setNotice('');

    const cleanEmployeeNumber = employeeNumber.trim();
    const cleanCurrentPin = currentPin.trim();
    const cleanNewPin = newPin.trim();
    const cleanConfirmPin = confirmPin.trim();

    if (!cleanEmployeeNumber) {
      setError('Employee number was not found. Please login again.');
      return;
    }

    if (!cleanCurrentPin) {
      setError('Enter the temporary PIN that was issued to you.');
      return;
    }

    if (cleanNewPin !== cleanConfirmPin) {
      setError('New PIN and confirm PIN do not match.');
      return;
    }

    if (!/^\d{6}$/.test(cleanNewPin)) {
      setError('New PIN must be exactly 6 digits.');
      return;
    }

    if (cleanCurrentPin === cleanNewPin) {
      setError('New PIN must be different from the temporary PIN.');
      return;
    }

    setLoading(true);

    try {
      const result = await employeeChangePin({
        employeeNumber: cleanEmployeeNumber,
        currentPin: cleanCurrentPin,
        newPin: cleanNewPin,
      });

      saveEmployeeSession(result);

      setNotice('PIN changed successfully. Redirecting to your employee portal...');
      router.push('/me');
    } catch {
      setError('Failed to change PIN. Check your temporary PIN and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card wide-auth-card">
        <div className="auth-header">
          <h1>Change Temporary PIN</h1>

          <p className="muted">
            For security, you must change your temporary PIN before accessing your Southin PeoplePay employee portal.
          </p>
        </div>

        <form className="form-grid" onSubmit={handleChangePin}>
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
              placeholder="Enter temporary PIN"
              inputMode="numeric"
              maxLength={6}
              required
            />
          </label>

          <label>
            New 6-Digit PIN
            <input
              value={newPin}
              onChange={(event) => setNewPin(event.target.value)}
              type="password"
              placeholder="Enter new PIN"
              inputMode="numeric"
              maxLength={6}
              required
            />
          </label>

          <label>
            Confirm New PIN
            <input
              value={confirmPin}
              onChange={(event) => setConfirmPin(event.target.value)}
              type="password"
              placeholder="Confirm new PIN"
              inputMode="numeric"
              maxLength={6}
              required
            />
          </label>

          {error && <div className="notice">{error}</div>}
          {notice && <div className="notice">{notice}</div>}

          <button className="btn" disabled={loading} type="submit">
            {loading ? 'Updating PIN...' : 'Change PIN'}
          </button>
        </form>
      </section>
    </main>
  );
}