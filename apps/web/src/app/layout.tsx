import type { Metadata } from 'next';
import './globals.css';
import FloatingDevRoleSelector from '@/components/FloatingDevRoleSelector';

export const metadata: Metadata = {
  title: 'Southin PeoplePay',
  description: 'Southin HR, payroll, finance, and employee self-service platform.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <FloatingDevRoleSelector />
      </body>
    </html>
  );
}