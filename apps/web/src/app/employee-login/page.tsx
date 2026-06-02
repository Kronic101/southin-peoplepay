'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { employeeLogin } from '@/lib/api';

export default function EmployeeLoginPage() {
  const router = useRouter();
  const [employeeNumber, setEmployeeNumber] = useState('STH-000001');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await employeeLogin({ employeeNumber, pin });

      localStorage.setItem('peoplepay_employee_token', result.token);
      localStorage.setItem('peoplepay_employee_number', result.employee.employeeNumber);

      if (result.mustChangePin) {
        router.push('/first-login-change-pin');
      } else {
        router.push('/me');
      }
    } catch {
      setError('Invalid employee number or PIN.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Employee Login</h1>
        <p className="muted">Use your Employee Number and temporary PIN. First login will force a PIN change.</p>

        <form onSubmit={handleLogin}>
          <label>
            Employee Number
            <input
              value={employeeNumber}
              onChange={(event) => setEmployeeNumber(event.target.value)}
              placeholder="STH-000001"
              required
            />
          </label>

          <label>
            PIN
            <input
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              placeholder="Temporary PIN"
              type="password"
              required
            />
          </label>

          {error && <div className="notice">{error}</div>}

          <button className="btn" disabled={loading} type="submit">
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </section>
    </main>
  );
}