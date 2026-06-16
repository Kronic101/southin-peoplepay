'use client';

import { APP_BRAND } from '@/lib/app-branding';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type StaffRole =
  | 'PAYROLL_OFFICER'
  | 'HR_MANAGER'
  | 'FINANCE_MANAGER'
  | 'DIRECTOR'
  | 'ADMIN'
  | 'LINE_MANAGER'
  | 'SUPERVISOR'
  | 'ASSET_MANAGER'
  | 'STORES_OFFICER'
  | 'PROCUREMENT_OFFICER'
  | '';

type NavItem = {
  label: string;
  href: string;
  roles: StaffRole[];
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const ROLE_KEYS = [
  'southinDevRole',
  'southin-dev-role',
  'southin_dev_role',
  'devRole',
  'role',
  'x-user-role',
];

function normaliseRole(value: unknown): StaffRole {
  const role = String(value || '')
    .trim()
    .toUpperCase()
    .replaceAll(' ', '_')
    .replaceAll('-', '_');

  if (role === 'HR' || role === 'HUMAN_RESOURCES' || role === 'HR_MANAGER') return 'HR_MANAGER';
  if (role === 'PAYROLL' || role === 'PAYROLL_OFFICER') return 'PAYROLL_OFFICER';
  if (role === 'FINANCE' || role === 'FINANCE_MANAGER') return 'FINANCE_MANAGER';
  if (role === 'DIRECTOR' || role === 'EXECUTIVE') return 'DIRECTOR';
  if (role === 'ADMIN' || role === 'SYSTEM_ADMIN' || role === 'SYSTEM_ADMINISTRATOR') return 'ADMIN';
  if (role === 'LINE_MANAGER') return 'LINE_MANAGER';
  if (role === 'SUPERVISOR') return 'SUPERVISOR';

  if (
    role === 'ASSET' ||
    role === 'ASSET_MANAGER' ||
    role === 'ASSET_OFFICER' ||
    role === 'ASSET_CONTROLLER'
  ) {
    return 'ASSET_MANAGER';
  }

  if (role === 'STORES' || role === 'STORE_OFFICER' || role === 'STORES_OFFICER') {
    return 'STORES_OFFICER';
  }

  if (
    role === 'PROCUREMENT' ||
    role === 'PROCUREMENT_OFFICER' ||
    role === 'PROCUREMENT_MANAGER'
  ) {
    return 'PROCUREMENT_OFFICER';
  }

  return '';
}

function getStoredRole(): StaffRole {
  if (typeof window === 'undefined') return '';

  for (const key of ROLE_KEYS) {
    const role = normaliseRole(localStorage.getItem(key));
    if (role) return role;
  }

  return '';
}

function roleCanSee(item: NavItem, role: StaffRole) {
  if (role === 'ADMIN') return true;
  if (item.roles.includes('')) return true;
  if (!role) return item.roles.includes('');
  return item.roles.includes(role);
}

const navSections: NavSection[] = [
  {
    title: 'Core',
    items: [
      {
        label: 'Workbench',
        href: '/workbench',
        roles: [
          '',
          'HR_MANAGER',
          'PAYROLL_OFFICER',
          'FINANCE_MANAGER',
          'DIRECTOR',
          'ADMIN',
          'LINE_MANAGER',
          'SUPERVISOR',
          'ASSET_MANAGER',
          'STORES_OFFICER',
          'PROCUREMENT_OFFICER',
        ],
      },
      {
        label: 'Demo Guide',
        href: '/demo',
        roles: [
          '',
          'HR_MANAGER',
          'PAYROLL_OFFICER',
          'FINANCE_MANAGER',
          'DIRECTOR',
          'ADMIN',
          'LINE_MANAGER',
          'SUPERVISOR',
          'ASSET_MANAGER',
          'STORES_OFFICER',
          'PROCUREMENT_OFFICER',
        ],
      },
      {
        label: 'Dashboard',
        href: '/dashboard',
        roles: ['HR_MANAGER', 'PAYROLL_OFFICER', 'FINANCE_MANAGER', 'DIRECTOR', 'ADMIN'],
      },
    ],
  },
  {
    title: 'Human Resources',
    items: [
      { label: 'HR Dashboard', href: '/hr/dashboard', roles: ['HR_MANAGER', 'DIRECTOR', 'ADMIN'] },
      {
        label: 'Employees',
        href: '/employees',
        roles: ['HR_MANAGER', 'PAYROLL_OFFICER', 'FINANCE_MANAGER', 'DIRECTOR', 'ADMIN'],
      },
      {
        label: 'Leave Dashboard',
        href: '/hr/leave-dashboard',
        roles: ['HR_MANAGER', 'DIRECTOR', 'ADMIN', 'LINE_MANAGER', 'SUPERVISOR'],
      },
      {
        label: 'Leave Approvals',
        href: '/hr/leave-approvals',
        roles: ['HR_MANAGER', 'DIRECTOR', 'ADMIN', 'LINE_MANAGER', 'SUPERVISOR'],
      },
      {
        label: 'Payroll Readiness',
        href: '/hr/payroll-readiness',
        roles: ['HR_MANAGER', 'PAYROLL_OFFICER', 'FINANCE_MANAGER', 'DIRECTOR', 'ADMIN'],
      },
      {
        label: 'Readiness Gates',
        href: '/hr/payroll-readiness-gates',
        roles: ['HR_MANAGER', 'PAYROLL_OFFICER', 'FINANCE_MANAGER', 'DIRECTOR', 'ADMIN'],
      },
    ],
  },
  {
    title: 'People Operations',
    items: [
      {
        label: 'Attendance',
        href: '/attendance',
        roles: [
          'HR_MANAGER',
          'PAYROLL_OFFICER',
          'DIRECTOR',
          'ADMIN',
          'LINE_MANAGER',
          'SUPERVISOR',
        ],
      },
      {
        label: 'Leave',
        href: '/leave',
        roles: ['HR_MANAGER', 'DIRECTOR', 'ADMIN', 'LINE_MANAGER', 'SUPERVISOR'],
      },
      {
        label: 'Overtime',
        href: '/overtime',
        roles: [
          'HR_MANAGER',
          'PAYROLL_OFFICER',
          'FINANCE_MANAGER',
          'DIRECTOR',
          'ADMIN',
          'LINE_MANAGER',
          'SUPERVISOR',
        ],
      },
      {
        label: 'Timesheets',
        href: '/timesheets',
        roles: [
          'HR_MANAGER',
          'PAYROLL_OFFICER',
          'DIRECTOR',
          'ADMIN',
          'LINE_MANAGER',
          'SUPERVISOR',
        ],
      },
    ],
  },
  {
    title: 'Payroll',
    items: [
      {
        label: 'Payroll',
        href: '/payroll',
        roles: ['PAYROLL_OFFICER', 'FINANCE_MANAGER', 'HR_MANAGER', 'DIRECTOR', 'ADMIN'],
      },
      {
        label: 'Payroll Runs',
        href: '/payroll/runs',
        roles: ['PAYROLL_OFFICER', 'FINANCE_MANAGER', 'HR_MANAGER', 'DIRECTOR', 'ADMIN'],
      },
      {
        label: 'Payroll Audit',
        href: '/reports/payroll-audit',
        roles: ['PAYROLL_OFFICER', 'FINANCE_MANAGER', 'HR_MANAGER', 'DIRECTOR', 'ADMIN'],
      },
      {
        label: 'Statutory',
        href: '/statutory',
        roles: ['PAYROLL_OFFICER', 'FINANCE_MANAGER', 'HR_MANAGER', 'DIRECTOR', 'ADMIN'],
      },
    ],
  },
  {
    title: 'Finance',
    items: [
      {
        label: 'Finance Dashboard',
        href: '/finance/dashboard',
        roles: ['FINANCE_MANAGER', 'DIRECTOR', 'ADMIN'],
      },
      {
        label: 'Finance Reports',
        href: '/finance/reports',
        roles: ['FINANCE_MANAGER', 'DIRECTOR', 'ADMIN'],
      },
      {
        label: 'Bank Payment Prep',
        href: '/reports/bank-payment-preparation',
        roles: ['FINANCE_MANAGER', 'DIRECTOR', 'ADMIN'],
      },
      {
        label: 'Payment Batches',
        href: '/reports/payment-batches',
        roles: ['FINANCE_MANAGER', 'DIRECTOR', 'ADMIN'],
      },
      {
        label: 'Payroll Audit',
        href: '/reports/payroll-audit',
        roles: ['FINANCE_MANAGER', 'DIRECTOR', 'ADMIN'],
      },
      {
        label: 'Finance Evidence',
        href: '/finance/approval-evidence',
        roles: ['FINANCE_MANAGER', 'DIRECTOR', 'ADMIN'],
      },
      {
        label: 'Procurement Tracker',
        href: '/finance/procurement-tracker',
        roles: ['FINANCE_MANAGER', 'DIRECTOR', 'ADMIN', 'PROCUREMENT_OFFICER'],
      },
      {
        label: 'Expense Approvals',
        href: '/finance/expenses',
        roles: ['FINANCE_MANAGER', 'DIRECTOR', 'ADMIN'],
      },
      {
        label: 'Asset Integration',
        href: '/finance/asset-management-integration',
        roles: ['FINANCE_MANAGER', 'DIRECTOR', 'ADMIN', 'ASSET_MANAGER'],
      },
      {
        label: 'SharePoint Package',
        href: '/finance/sharepoint-package',
        roles: ['FINANCE_MANAGER', 'DIRECTOR', 'ADMIN'],
      },
    ],
  },
  {
    title: 'Asset Management',
    items: [
      {
        label: 'Asset Dashboard',
        href: '/assets/dashboard',
        roles: ['DIRECTOR', 'ADMIN', 'FINANCE_MANAGER', 'ASSET_MANAGER', 'STORES_OFFICER'],
      },
      {
        label: 'Stores & Stock',
        href: '/assets/stock',
        roles: ['DIRECTOR', 'ADMIN', 'FINANCE_MANAGER', 'ASSET_MANAGER', 'STORES_OFFICER'],
      },
      {
        label: 'Stock Movements',
        href: '/assets/movements',
        roles: ['DIRECTOR', 'ADMIN', 'FINANCE_MANAGER', 'ASSET_MANAGER', 'STORES_OFFICER'],
      },
      {
        label: 'Scaffolds',
        href: '/assets/scaffolds',
        roles: ['DIRECTOR', 'ADMIN', 'FINANCE_MANAGER', 'ASSET_MANAGER', 'STORES_OFFICER'],
      },
      {
        label: 'QR Scan Centre',
        href: '/assets/qr-scan',
        roles: ['DIRECTOR', 'ADMIN', 'FINANCE_MANAGER', 'ASSET_MANAGER', 'STORES_OFFICER'],
      },
      { label: 'Omni Core Import', 
        href: '/assets/import-preview', 
        roles: ['DIRECTOR', 'ADMIN', 'ASSET_MANAGER', 'STORES_OFFICER'] 
      },
    ],
  },
  {
    title: 'Executive',
    items: [
      {
        label: 'Executive Dashboard',
        href: '/executive/dashboard',
        roles: ['DIRECTOR', 'ADMIN'],
      },
      {
        label: 'Reports Centre',
        href: '/reports',
        roles: ['DIRECTOR', 'ADMIN'],
      },
      {
        label: 'Public Summary',
        href: '/reports/public-summary',
        roles: ['DIRECTOR', 'ADMIN'],
      },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        label: 'SharePoint Integration',
        href: '/admin/sharepoint-integration',
        roles: ['ADMIN', 'DIRECTOR'],
      },
      {
        label: 'Graph Setup Guide',
        href: '/admin/sharepoint-graph-setup',
        roles: ['ADMIN'],
      },
      {
        label: 'Admin',
        href: '/admin',
        roles: ['ADMIN'],
      },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [role, setRole] = useState<StaffRole>('');

  useEffect(() => {
    function refreshRole() {
      setRole(getStoredRole());
    }

    refreshRole();

    const interval = window.setInterval(refreshRole, 700);
    window.addEventListener('storage', refreshRole);
    window.addEventListener('focus', refreshRole);
    window.addEventListener('click', refreshRole);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('storage', refreshRole);
      window.removeEventListener('focus', refreshRole);
      window.removeEventListener('click', refreshRole);
    };
  }, []);

  const visibleSections = useMemo(() => {
    return navSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => roleCanSee(item, role)),
      }))
      .filter((section) => section.items.length > 0);
  }, [role]);

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Link className="app-brand" href="/workbench">
          <span className="app-brand-mark">SP</span>
          <span>
            <strong>{APP_BRAND.platformName}</strong>
            <span>{APP_BRAND.peoplePayModuleName} · HR & Payroll</span>
          </span>
        </Link>

        <div className="sidebar-role-box">
          <span>Current Staff Role</span>
          <strong>{role ? role.replaceAll('_', ' ') : 'No role selected'}</strong>
        </div>

        <nav className="app-nav">
          {visibleSections.map((section) => (
            <div className="app-nav-section" key={section.title}>
              <span className="app-nav-heading">{section.title}</span>

              {section.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== '/workbench' && pathname.startsWith(item.href));

                return (
                  <Link
                    className={active ? 'app-nav-link active' : 'app-nav-link'}
                    href={item.href}
                    key={item.href}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="employee-only-note">
          <strong>Employee access</strong>
          <span>Employees use employee login only and do not use this staff ribbon.</span>
          <Link href="/employee-login">Open Employee Login</Link>
        </div>
      </aside>

      <main className="app-main">
        <div className="app-main-inner">{children}</div>
      </main>
    </div>
  );
}

export default AppShell;