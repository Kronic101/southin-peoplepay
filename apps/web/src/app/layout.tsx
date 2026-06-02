import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Southin PeoplePay',
  description: 'HR and Payroll Management System for Southin Contracting Limited'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
