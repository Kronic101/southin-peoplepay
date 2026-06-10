'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearEmployeePortalToken, saveEmployeePortalToken } from '@/lib/employee-auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function getEmployeeToken(result: any) {
  return (
    result?.token ||
    result?.accessToken ||
    result?.employeeToken ||
    result?.employeePortalToken ||
    result?.data?.token ||
    result?.data?.accessToken ||
    null
  );
}

function getEmployeeProfile(result: any) {
  return result?.employee || result?.profile || result?.user || result?.data?.employee || null;
}

export default function EmployeeLoginPage() {
  const router = useRouter();

  const [employeeNumber, setEmployeeNumber] = useState('STH-000002');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage('');
    setError('');

    try {
      clearEmployeePortalToken();

      const response = await fetch(`${API_URL}/auth/employee/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeNumber: employeeNumber.trim(),
          pin,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.message || 'Employee login failed.');
      }

      const token = getEmployeeToken(result);
      const employee = getEmployeeProfile(result);

      if (!token) {
        throw new Error('Employee login succeeded but no employee portal token was returned.');
      }

      saveEmployeePortalToken(token);

      if (employee) {
        localStorage.setItem('employee', JSON.stringify(employee));
      }

      setMessage('Login successful.');

      if (result?.mustChangePin || result?.data?.mustChangePin) {
        router.push('/employee-change-pin');
        return;
      }

      router.push('/me');
    } catch (err: any) {
      clearEmployeePortalToken();
      setError(err?.message || 'Employee login failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="hero-kicker">Employee Portal</div>

        <h1>Employee Login</h1>

        <p>
          Sign in using your employee number and PIN to view your profile, payslips, and
          self-service information.
        </p>

        {error && <div className="notice danger">{error}</div>}
        {message && <div className="notice success">{message}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Employee Number
            <input
              value={employeeNumber}
              onChange={(event) => setEmployeeNumber(event.target.value)}
              placeholder="Example: STH-000002"
              autoComplete="username"
              required
            />
          </label>

          <label>
            PIN
            <input
              type="password"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              placeholder="Enter your PIN"
              autoComplete="current-password"
              required
            />
          </label>

          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <div className="auth-footer">
          <Link href="/">Back home</Link>
          <Link href="/forgot-pin">Forgot PIN?</Link>
        </div>
      </section>
    </main>
  );
}