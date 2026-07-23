import type { Metadata } from 'next';
import './globals.css';
import FloatingDevRoleSelector from '@/components/FloatingDevRoleSelector';
import Providers from "./providers";

export const metadata = {
  title: 'Southin Hub',
  description: 'Southin Operations, People, Fleet, Safety and Asset Control Centre',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}