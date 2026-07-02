import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

type StaffRole =
  | 'ADMIN'
  | 'DIRECTOR'
  | 'FINANCE_MANAGER'
  | 'FINANCE_OFFICER'
  | 'HR_MANAGER'
  | 'HR_OFFICER'
  | 'LINE_MANAGER'
  | 'SUPERVISOR'
  | 'ASSET_MANAGER'
  | 'ASSET_OFFICER'
  | 'FLEET_MANAGER'
  | 'FLEET_DISPATCH_OFFICER'
  | 'PAYROLL_OFFICER'
  | 'PROCUREMENT_OFFICER'
  | 'STORES_OFFICER'
  | 'AUDITOR';

const routeAccess: { prefix: string; roles: StaffRole[] }[] = [
  {
    prefix: '/admin',
    roles: ['ADMIN'],
  },
  {
    prefix: '/approvals',
    roles: [
      'ADMIN',
      'DIRECTOR',
      'FINANCE_MANAGER',
      'HR_MANAGER',
      'LINE_MANAGER',
      'SUPERVISOR',
      'ASSET_MANAGER',
      'FLEET_MANAGER',
      'PAYROLL_OFFICER',
      'PROCUREMENT_OFFICER',
      'STORES_OFFICER',
    ],
  },
  {
    prefix: '/finance',
    roles: ['ADMIN', 'FINANCE_MANAGER', 'FINANCE_OFFICER', 'DIRECTOR', 'PROCUREMENT_OFFICER'],
  },
  {
    prefix: '/payroll',
    roles: ['ADMIN', 'PAYROLL_OFFICER', 'HR_MANAGER', 'FINANCE_MANAGER', 'DIRECTOR', 'AUDITOR'],
  },
  {
    prefix: '/hr',
    roles: ['ADMIN', 'HR_MANAGER', 'HR_OFFICER', 'DIRECTOR'],
  },
  {
    prefix: '/employees',
    roles: ['ADMIN', 'HR_MANAGER', 'HR_OFFICER', 'PAYROLL_OFFICER'],
  },
  {
    prefix: '/assets',
    roles: ['ADMIN', 'ASSET_MANAGER', 'ASSET_OFFICER', 'FINANCE_MANAGER', 'DIRECTOR'],
  },
  {
    prefix: '/fleet',
    roles: ['ADMIN', 'FLEET_MANAGER', 'FLEET_DISPATCH_OFFICER', 'DIRECTOR'],
  },
  {
    prefix: '/stores',
    roles: ['ADMIN', 'STORES_OFFICER', 'PROCUREMENT_OFFICER', 'FINANCE_MANAGER'],
  },
  {
    prefix: '/executive',
    roles: ['ADMIN', 'DIRECTOR', 'FINANCE_MANAGER', 'HR_MANAGER'],
  },
];

function getRouteRule(pathname: string) {
  return routeAccess.find((rule) => pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const routeRule = getRouteRule(pathname);

  if (!routeRule) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.email) {
    const signInUrl = new URL('/api/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', request.nextUrl.href);
    return NextResponse.redirect(signInUrl);
  }

  const role = String((token as any).staffRole || '').toUpperCase() as StaffRole;

  if (role === 'ADMIN') {
    return NextResponse.next();
  }

  if (!role || !routeRule.roles.includes(role)) {
    const deniedUrl = new URL('/access-denied', request.url);
    deniedUrl.searchParams.set('required', routeRule.roles.join(','));
    deniedUrl.searchParams.set('detected', role || 'NONE');
    return NextResponse.redirect(deniedUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/approvals/:path*',
    '/finance/:path*',
    '/payroll/:path*',
    '/hr/:path*',
    '/employees/:path*',
    '/assets/:path*',
    '/fleet/:path*',
    '/stores/:path*',
    '/executive/:path*',
  ],
};