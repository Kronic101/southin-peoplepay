'use client';

import { APP_BRAND } from '@/lib/app-branding';
import { isDemoEnabledForBrowser } from '@/lib/demo';
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
  | 'ASSET_OFFICER'
  | 'STORES_OFFICER'
  | 'PROCUREMENT_OFFICER'
  | 'FLEET_MANAGER'
  | 'FLEET_DISPATCH_OFFICER'
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

  if (
    role === 'FLEET' ||
    role === 'FLEET_MANAGER' ||
    role === 'TRANSPORT_MANAGER' ||
    role === 'VEHICLE_MANAGER'
  ) {
    return 'FLEET_MANAGER';
  }

  if (
    role === 'FLEET_DISPATCH' ||
    role === 'FLEET_DISPATCH_OFFICER' ||
    role === 'DISPATCH_OFFICER' ||
    role === 'TRANSPORT_OFFICER'
  ) {
    return 'FLEET_DISPATCH_OFFICER';
  }

  return '';
}

function getStoredRole(demoEnabled: boolean): StaffRole {
  if (typeof window === 'undefined') return 'ADMIN';

  if (!demoEnabled) {
    return 'ADMIN';
  }

  for (const key of ROLE_KEYS) {
    const role = normaliseRole(localStorage.getItem(key));
    if (role) return role;
  }

  return 'ADMIN';
}

function roleCanSee(item: NavItem, role: StaffRole) {
  if (role === 'ADMIN') return true;
  if (item.roles.includes('')) return true;
  if (!role) return item.roles.includes('');
  return item.roles.includes(role);
}

const demoNavItems: NavItem[] = [
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
      'ASSET_OFFICER',
      'STORES_OFFICER',
      'PROCUREMENT_OFFICER',
      'FLEET_MANAGER',
      'FLEET_DISPATCH_OFFICER',
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
      'ASSET_OFFICER',
      'STORES_OFFICER',
      'PROCUREMENT_OFFICER',
      'FLEET_MANAGER',
      'FLEET_DISPATCH_OFFICER',
    ],
  },
];

const navSections: NavSection[] = [
  {
    title: 'Core',
    items: [
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
        label: 'Stock Ledger',
        href: '/assets/ledger',
        roles: ['DIRECTOR', 'ADMIN', 'FINANCE_MANAGER', 'ASSET_MANAGER', 'STORES_OFFICER'],
      },
      {
        label: 'Stock Counts',
        href: '/assets/stock-counts',
        roles: ['DIRECTOR', 'ADMIN', 'FINANCE_MANAGER', 'ASSET_MANAGER', 'STORES_OFFICER'],
      },
      {
        label: 'Custody',
        href: '/assets/custody',
        roles: ['DIRECTOR', 'ADMIN', 'FINANCE_MANAGER', 'ASSET_MANAGER', 'STORES_OFFICER'],
      },
      {
        label: 'Deployments',
        href: '/assets/deployments',
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
      {
        label: 'Import',
        href: '/assets/import-preview',
        roles: ['DIRECTOR', 'ADMIN', 'FINANCE_MANAGER', 'ASSET_MANAGER', 'STORES_OFFICER'],
      },
    ],
  },
  {
    title: 'Fleet Management',
    items: [
      {
        label: 'Fleet Dashboard',
        href: '/fleet/dashboard',
        roles: ['FLEET_MANAGER', 'FLEET_DISPATCH_OFFICER', 'FINANCE_MANAGER', 'DIRECTOR', 'ADMIN'],
      },
      {
        label: 'Vehicle Register',
        href: '/fleet/vehicles',
        roles: ['FLEET_MANAGER', 'FLEET_DISPATCH_OFFICER', 'FINANCE_MANAGER', 'DIRECTOR', 'ADMIN'],
      },
      {
        label: 'Fuel Logs',
        href: '/fleet/fuel',
        roles: ['FLEET_MANAGER', 'FLEET_DISPATCH_OFFICER', 'FINANCE_MANAGER', 'DIRECTOR', 'ADMIN'],
      },
      {
        label: 'Trips',
        href: '/fleet/trips',
        roles: ['FLEET_MANAGER', 'FLEET_DISPATCH_OFFICER', 'FINANCE_MANAGER', 'DIRECTOR', 'ADMIN'],
      },
      {
        label: 'Defects',
        href: '/fleet/defects',
        roles: ['FLEET_MANAGER', 'FLEET_DISPATCH_OFFICER', 'DIRECTOR', 'ADMIN'],
      },
      {
        label: 'Workshop',
        href: '/fleet/workshop',
        roles: ['FLEET_MANAGER', 'FINANCE_MANAGER', 'DIRECTOR', 'ADMIN'],
      },
      {
        label: 'Fleet Reports',
        href: '/fleet/reports',
        roles: ['FLEET_MANAGER', 'FINANCE_MANAGER', 'DIRECTOR', 'ADMIN'],
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
      {
        label: 'Approval Matrix',
        href: '/admin/approval-matrix',
        roles: ['ADMIN', 'DIRECTOR'],
      },
      {
        label: 'Approver Assignments',
        href: '/admin/approval-assignments',
        roles: ['ADMIN', 'DIRECTOR'],
      },
      {
        label: 'Approval Delegations',
        href: '/admin/approval-delegations',
        roles: ['ADMIN', 'DIRECTOR'],
      },
      {
        label: 'Approval Inbox',
        href: '/approvals/inbox',
        roles: ['ADMIN', 'DIRECTOR', 'FINANCE_MANAGER', 'HR_MANAGER', 'LINE_MANAGER','SUPERVISOR', 'ASSET_MANAGER', 'FLEET_MANAGER', 'FLEET_DISPATCH_OFFICER'],
      },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const [demoEnabled, setDemoEnabled] = useState(false);
  const [role, setRole] = useState<StaffRole>('ADMIN');

  useEffect(() => {
    const enabled = isDemoEnabledForBrowser();

    setDemoEnabled(enabled);
    setRole(getStoredRole(enabled));

    function refreshRole() {
      setRole(getStoredRole(enabled));
    }

    window.addEventListener('storage', refreshRole);
    window.addEventListener('focus', refreshRole);

    return () => {
      window.removeEventListener('storage', refreshRole);
      window.removeEventListener('focus', refreshRole);
    };
  }, []);

  const visibleSections = useMemo(() => {
    const sections = navSections.map((section) => {
      if (section.title === 'Core' && demoEnabled) {
        return {
          ...section,
          items: [...demoNavItems, ...section.items],
        };
      }

      return section;
    });

    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => roleCanSee(item, role)),
      }))
      .filter((section) => section.items.length > 0);
  }, [role]);

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Link className="app-brand" href={demoEnabled ? '/workbench' : '/dashboard'}>
          <span className="app-brand-mark">SP</span>
          <span>
            <strong>{APP_BRAND.platformName}</strong>
            <span>{APP_BRAND.peoplePayModuleName} · HR & Payroll</span>
          </span>
        </Link>

        {demoEnabled ? (
          <div className="sidebar-role-box">
            <span>Current Staff Role</span>
            <strong>{role ? role.replaceAll('_', ' ') : 'No role selected'}</strong>
          </div>
        ) : null}

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
          <span>Employees use employee login only and do not use the staff ribbon.</span>
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