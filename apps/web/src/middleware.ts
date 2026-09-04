import {
  NextResponse,
} from 'next/server';

import type {
  NextRequest,
} from 'next/server';

import {
  getToken,
} from 'next-auth/jwt';

import {
  getRolesFromGroups,
  mergeStaffRoles,
  type StaffRole,
} from '@/lib/staff-roles';

const routeAccess: {
  prefix: string;
  roles: StaffRole[];
}[] = [
  {
    prefix: '/admin',
    roles: [
      'ADMIN',
    ],
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
    roles: [
      'ADMIN',
      'FINANCE_MANAGER',
      'FINANCE_OFFICER',
      'DIRECTOR',

      /**
       * Procurement Tracker lives
       * under /finance.
       */
      'PROCUREMENT_OFFICER',
    ],
  },

  {
    prefix: '/payroll',
    roles: [
      'ADMIN',
      'PAYROLL_OFFICER',
      'HR_MANAGER',
      'FINANCE_MANAGER',
      'DIRECTOR',
      'AUDITOR',
    ],
  },

  {
    prefix: '/hr',
    roles: [
      'ADMIN',
      'HR_MANAGER',
      'HR_OFFICER',
      'DIRECTOR',
    ],
  },

  {
    prefix: '/employees',
    roles: [
      'ADMIN',
      'HR_MANAGER',
      'HR_OFFICER',
      'PAYROLL_OFFICER',
    ],
  },

  {
    prefix: '/assets',
    roles: [
      'ADMIN',
      'ASSET_MANAGER',
      'ASSET_OFFICER',
      'FINANCE_MANAGER',
      'DIRECTOR',
    ],
  },

  {
    prefix: '/fleet',
    roles: [
      'ADMIN',
      'FLEET_MANAGER',
      'FLEET_DISPATCH_OFFICER',
      'DIRECTOR',
    ],
  },

  {
    prefix: '/stores',
    roles: [
      'ADMIN',
      'STORES_OFFICER',
      'PROCUREMENT_OFFICER',
      'FINANCE_MANAGER',
    ],
  },

  {
    prefix: '/executive',
    roles: [
      'ADMIN',
      'DIRECTOR',
      'FINANCE_MANAGER',
      'HR_MANAGER',
    ],
  },
];

function getRouteRule(
  pathname: string,
) {
  return routeAccess.find(
    (rule) =>
      pathname ===
        rule.prefix ||
      pathname.startsWith(
        `${rule.prefix}/`,
      ),
  );
}

export async function middleware(
  request: NextRequest,
) {
  const { pathname } =
    request.nextUrl;

  const routeRule =
    getRouteRule(pathname);

  /**
   * Route doesn't have an explicit
   * middleware access rule.
   */
  if (!routeRule) {
    return NextResponse.next();
  }

  const token =
    await getToken({
      req: request,
      secret:
        process.env
          .NEXTAUTH_SECRET,
    });

  /**
   * Not authenticated.
   */
  if (!token?.email) {
    const signInUrl =
      new URL(
        '/api/auth/signin',
        request.url,
      );

    signInUrl.searchParams.set(
      'callbackUrl',
      request.nextUrl.href,
    );

    return NextResponse.redirect(
      signInUrl,
    );
  }

  /**
   * Resolve ALL authorization roles.
   *
   * This supports:
   * - new staffRoles[]
   * - existing entraGroups JWTs
   * - legacy staffRole
   */
  const roles =
    mergeStaffRoles(
      token.staffRoles,

      getRolesFromGroups(
        token.entraGroups,
      ),

      token.staffRole,
    );

  /**
   * Admin always has access.
   */
  if (roles.includes('ADMIN')) {
    return NextResponse.next();
  }

  /**
   * Union-of-role authorization.
   *
   * The user needs ANY one of the
   * permitted route roles.
   */
  const hasAccess =
    roles.some(
      (role) =>
        routeRule.roles.includes(
          role,
        ),
    );

  if (!hasAccess) {
    const deniedUrl =
      new URL(
        '/access-denied',
        request.url,
      );

    deniedUrl
      .searchParams
      .set(
        'required',
        routeRule.roles.join(','),
      );

    deniedUrl
      .searchParams
      .set(
        'detected',
        roles.length
          ? roles.join(',')
          : 'NONE',
      );

    return NextResponse.redirect(
      deniedUrl,
    );
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