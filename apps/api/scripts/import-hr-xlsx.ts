import 'dotenv/config';

import * as bcrypt from 'bcryptjs';
import ExcelJS from 'exceljs';
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

type RowRecord = Record<string, unknown>;

type PortalAccess = {
  accessProfile: string;
  allowedModules: string[];
  reason: string;
};

type ImportReport = {
  mode: 'DRY_RUN' | 'COMMIT';
  sourceFile: string;
  generatedAt: string;
  resetPins: boolean;
  counts: Record<string, number>;
  historicalPlaceholders: string[];
  warnings: string[];
  errors: string[];
};

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const COMMIT = args.includes('--commit');
const RESET_PINS = args.includes('--reset-pins');

const fileArg = args.find((arg) => arg.startsWith('--file='));
const SOURCE_FILE = path.resolve(
  fileArg
    ? fileArg.slice('--file='.length)
    : path.resolve(process.cwd(), '../../southin peoplepay employee import filled.xlsx'),
);

const DEFAULT_PIN = String(process.env.EMPLOYEE_IMPORT_DEFAULT_PIN || '1234').trim();

const SHEETS = {
  employee: '01_Employee_Master',
  statutory: '02_Statutory_Details',
  bank: '03_Bank_Accounts',
  contracts: '04_Contracts',
  service: '05_Service_Conditions',
  portal: '06_Portal_Accounts',
} as const;

const EMPLOYEE_STATUSES = new Set([
  'DRAFT',
  'ACTIVE',
  'ON_PROBATION',
  'SUSPENDED',
  'ON_LEAVE',
  'CONTRACT_EXPIRING',
  'TERMINATED',
  'ARCHIVED',
]);

const PAY_BASES = new Set(['MONTHLY', 'DAILY', 'HOURLY']);
const APPROVAL_STATUSES = new Set(['PENDING', 'APPROVED', 'REJECTED']);

const report: ImportReport = {
  mode: COMMIT ? 'COMMIT' : 'DRY_RUN',
  sourceFile: SOURCE_FILE,
  generatedAt: new Date().toISOString(),
  resetPins: RESET_PINS,
  counts: {},
  historicalPlaceholders: [],
  warnings: [],
  errors: [],
};

function bump(name: string, amount = 1) {
  report.counts[name] = (report.counts[name] || 0) + amount;
}

function warn(message: string) {
  report.warnings.push(message);
  console.warn(`WARN: ${message}`);
}

function recordError(message: string) {
  report.errors.push(message);
  console.error(`ERROR: ${message}`);
}

function unwrapCellValue(value: unknown): unknown {
  if (value == null) return null;
  if (value instanceof Date) return value;

  if (typeof value === 'object') {
    const objectValue = value as Record<string, unknown>;

    if ('result' in objectValue && objectValue.result !== undefined) {
      return unwrapCellValue(objectValue.result);
    }

    if ('text' in objectValue && typeof objectValue.text === 'string') {
      return objectValue.text;
    }

    if (Array.isArray(objectValue.richText)) {
      return objectValue.richText
        .map((part) =>
          typeof part === 'object' && part && 'text' in part
            ? String((part as { text?: unknown }).text ?? '')
            : '',
        )
        .join('');
    }
  }

  return value;
}

function text(value: unknown): string | null {
  const unwrapped = unwrapCellValue(value);
  if (unwrapped == null) return null;

  const result = String(unwrapped).trim();
  if (!result) return null;
  return result;
}

function normalizedText(value: unknown): string {
  return String(text(value) || '').trim().toUpperCase();
}

function nullableText(value: unknown): string | null {
  const result = text(value);
  if (!result) return null;

  if (['N/A', 'NA', 'NULL', 'NONE', '-'].includes(result.toUpperCase())) {
    return null;
  }

  return result;
}

function meaningfulName(value: unknown): string | null {
  const result = nullableText(value);
  if (!result) return null;

  if (/^\?+$/.test(result)) {
    return null;
  }

  return result;
}

function boolValue(value: unknown, fallback: boolean): boolean {
  const unwrapped = unwrapCellValue(value);

  if (typeof unwrapped === 'boolean') return unwrapped;
  if (typeof unwrapped === 'number') return unwrapped !== 0;

  const result = String(unwrapped ?? '').trim().toUpperCase();
  if (!result) return fallback;

  if (['TRUE', 'YES', 'Y', '1'].includes(result)) return true;
  if (['FALSE', 'NO', 'N', '0'].includes(result)) return false;

  return fallback;
}

function numberValue(value: unknown): number | null {
  const unwrapped = unwrapCellValue(value);
  if (unwrapped == null || unwrapped === '') return null;

  const result =
    typeof unwrapped === 'number'
      ? unwrapped
      : Number(String(unwrapped).replace(/,/g, '').trim());

  return Number.isFinite(result) ? result : null;
}

function excelSerialToDate(serial: number): Date {
  const milliseconds = Math.round(serial * 86400 * 1000);
  return new Date(Date.UTC(1899, 11, 30) + milliseconds);
}

function dateValue(value: unknown): Date | null {
  const unwrapped = unwrapCellValue(value);
  if (unwrapped == null || unwrapped === '') return null;

  if (unwrapped instanceof Date) {
    return unwrapped;
  }

  if (typeof unwrapped === 'number' && Number.isFinite(unwrapped)) {
    return excelSerialToDate(unwrapped);
  }

  const raw = String(unwrapped).trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const parsed = new Date(`${raw}T00:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function employeeStatus(value: unknown, fallback = 'DRAFT'): string {
  const result = normalizedText(value) || fallback;
  if (EMPLOYEE_STATUSES.has(result)) return result;

  warn(`Unknown employee status "${result}". Using ${fallback}.`);
  return fallback;
}

function payBasis(value: unknown): string | null {
  const result = normalizedText(value);
  if (!result) return null;

  if (PAY_BASES.has(result)) return result;

  warn(`Unknown pay basis "${result}". Leaving it blank.`);
  return null;
}

function approvalStatus(value: unknown): string {
  const result = normalizedText(value) || 'PENDING';
  if (APPROVAL_STATUSES.has(result)) return result;

  warn(`Unknown approval status "${result}". Using PENDING.`);
  return 'PENDING';
}

function isDismissedStatus(status: unknown): boolean {
  return ['TERMINATED', 'ARCHIVED', 'SUSPENDED'].includes(normalizedText(status));
}

function combineAccountName(firstPart: unknown, lastPart: unknown): string | null {
  const first = nullableText(firstPart);
  const last = nullableText(lastPart);

  if (!first && !last) return null;
  if (!first) return last;
  if (!last) return first;

  if (first.toUpperCase().includes(last.toUpperCase())) {
    return first;
  }

  return `${first} ${last}`.replace(/\s+/g, ' ').trim();
}

function csvModules(value: unknown): string[] {
  const raw = nullableText(value);
  if (!raw) return [];

  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeSourceModules(value: unknown): string[] {
  const source = normalizedText(value);

  if (!source) return [];

  if (source === 'DRIVER') return ['FLEET'];
  if (source === 'T&L/ BRANCH MANAGER KMDC') return ['FLEET'];
  if (source === 'ACCOUNTS & FINANCE') return ['FINANCE'];
  if (source === 'IT/ ASSETS') return ['ASSETS'];
  if (source === 'HUMAN CAPITAL & DEV') return ['PEOPLE_OPS'];

  const modules = csvModules(value);
  return modules.length ? modules : [source];
}

function derivePortalAccess(
  employee: RowRecord | undefined,
  portal: RowRecord,
): PortalAccess {
  const jobTitle = normalizedText(employee?.jobTitleName);
  const department = normalizedText(employee?.departmentName);
  const sourceModules = normalizedText(portal.allowedModulesCsv);

  // Driver rule takes precedence over every department.
  if (
    jobTitle.includes('DRIVER') ||
    sourceModules === 'DRIVER'
  ) {
    return {
      accessProfile: 'DRIVER',
      allowedModules: ['FLEET'],
      reason: 'Driver rule',
    };
  }

  // Stores / procurement staff get the stores workflow even if the department
  // is the combined IT / Assets / Inventory department.
  if (
    jobTitle.includes('STORE') ||
    jobTitle.includes('PROCUREMENT') ||
    sourceModules === 'STORES'
  ) {
    return {
      accessProfile: 'STORES',
      allowedModules: ['STORES'],
      reason: 'Stores/procurement job rule',
    };
  }

  switch (department) {
    case 'TRANSPORT & LOGISTICS':
      return {
        accessProfile: 'FLEET_DISPATCH',
        allowedModules: ['FLEET'],
        reason: 'Transport & Logistics department',
      };

    case 'HEALTH & SAFETY':
      return {
        accessProfile: 'SAFETY',
        allowedModules: ['SAFETY'],
        reason: 'Health & Safety department',
      };

    case 'QUALITY & ADMIN':
      return {
        accessProfile: 'QAQC',
        allowedModules: ['QAQC'],
        reason: 'Quality & Admin department',
      };

    case 'IT/ ASSETS & INVENTORY':
      return {
        accessProfile: 'ASSETS',
        allowedModules: ['ASSETS'],
        reason: 'IT / Assets & Inventory department',
      };

    case 'ACCOUNTS & FINANCE':
      return {
        accessProfile: 'FINANCE',
        allowedModules: ['FINANCE'],
        reason: 'Accounts & Finance department',
      };

    case 'HUMAN CAPITAL DEVELOPMENT':
      return {
        accessProfile: 'EMPLOYEE',
        allowedModules: ['PEOPLE_OPS'],
        reason: 'Human Capital Development department',
      };

    case 'OPERATIONS':
    case 'PROJECTS':
      return {
        accessProfile: 'EMPLOYEE',
        allowedModules: ['OPERATIONS'],
        reason: `${department} department`,
      };

    case 'BUSINESS DEVELOPMENT':
      return {
        accessProfile: 'EMPLOYEE',
        allowedModules: [
          'EMPLOYEE_PROFILE',
          'EMPLOYEE_REQUESTS',
          'EMPLOYEE_PAYSLIPS',
        ],
        reason: 'Business Development department',
      };
  }

  // If HR has already supplied a useful module value, keep it as the fallback.
  const normalizedModules = normalizeSourceModules(portal.allowedModulesCsv);
  if (normalizedModules.length) {
    const sourceProfile = normalizedText(portal.accessProfile);

    let accessProfile = sourceProfile || 'EMPLOYEE';

    if (normalizedModules.includes('FLEET')) {
      accessProfile = sourceProfile || 'FLEET_DISPATCH';
    } else if (normalizedModules.includes('SAFETY')) {
      accessProfile = sourceProfile || 'SAFETY';
    } else if (normalizedModules.includes('QAQC')) {
      accessProfile = sourceProfile || 'QAQC';
    } else if (normalizedModules.includes('ASSETS')) {
      accessProfile = sourceProfile || 'ASSETS';
    } else if (normalizedModules.includes('STORES')) {
      accessProfile = sourceProfile || 'STORES';
    } else if (normalizedModules.includes('FINANCE')) {
      accessProfile = sourceProfile || 'FINANCE';
    }

    return {
      accessProfile,
      allowedModules: normalizedModules,
      reason: 'Workbook module fallback',
    };
  }

  return {
    accessProfile: 'EMPLOYEE',
    allowedModules: [
      'EMPLOYEE_PROFILE',
      'EMPLOYEE_REQUESTS',
      'EMPLOYEE_PAYSLIPS',
    ],
    reason: 'Generic employee fallback',
  };
}

function sheetRows(workbook: ExcelJS.Workbook, sheetName: string): RowRecord[] {
  const worksheet = workbook.getWorksheet(sheetName);

  if (!worksheet) {
    throw new Error(`Required worksheet "${sheetName}" was not found.`);
  }

  const headers: string[] = [];

  worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell: ExcelJS.Cell, colNumber: number) => {
    headers[colNumber] = String(unwrapCellValue(cell.value) ?? '').trim();
  });

  const rows: RowRecord[] = [];

  for (let rowNumber = 2; rowNumber <= worksheet.actualRowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const item: RowRecord = {};
    let hasValue = false;

    for (let colNumber = 1; colNumber < headers.length; colNumber += 1) {
      const header = headers[colNumber];
      if (!header) continue;

      const value = unwrapCellValue(row.getCell(colNumber).value);
      item[header] = value;

      if (value !== null && value !== undefined && String(value).trim() !== '') {
        hasValue = true;
      }
    }

    if (!hasValue) continue;

    const importAction = normalizedText(item.importAction);
    if (importAction.startsWith('SKIP')) {
      continue;
    }

    rows.push(item);
  }

  return rows;
}

function buildPortalRowsForAllEmployees(
  employeeRows: RowRecord[],
  portalRows: RowRecord[],
): RowRecord[] {
  const existingByEmployee = indexByEmployeeNumber(portalRows);
  const masterNumbers = new Set<string>();
  const result: RowRecord[] = [];

  // Build one portal-account row for every valid Employee Master row.
  // A simple loop avoids TypeScript inferring a union containing `null`.
  for (const employee of employeeRows) {
    const employeeNumber = nullableText(employee.employeeNumber);

    if (!employeeNumber) {
      continue;
    }

    const key = employeeNumber.toUpperCase();
    masterNumbers.add(key);

    const existing = existingByEmployee.get(key);

    if (existing) {
      result.push({
        ...existing,
        employeeNumber,
        createPortalAccount: true,
        mustChangePin: true,
        isActive: !isDismissedStatus(employee.status),
      });

      continue;
    }

    result.push({
      employeeNumber,
      createPortalAccount: true,
      accessProfile: null,
      allowedModulesCsv: null,
      mustChangePin: true,
      isActive: !isDismissedStatus(employee.status),
      initialPin: null,
      notes: 'Portal account generated from Employee Master by HR import',
    });
  }

  // Retain portal rows for historical employees who are not in Employee Master.
  // createHistoricalPlaceholders() creates their ARCHIVED Employee row first.
  for (const portal of portalRows) {
    const employeeNumber = nullableText(portal.employeeNumber);

    if (!employeeNumber) {
      continue;
    }

    if (!masterNumbers.has(employeeNumber.toUpperCase())) {
      result.push({
        ...portal,
        employeeNumber,
        mustChangePin: true,
      });
    }
  }

  return result;
}

function indexByEmployeeNumber(rows: RowRecord[]): Map<string, RowRecord> {
  const map = new Map<string, RowRecord>();

  for (const row of rows) {
    const employeeNumber = nullableText(row.employeeNumber);
    if (!employeeNumber) continue;

    map.set(employeeNumber.toUpperCase(), row);
  }

  return map;
}

function duplicateEmployeeNumbers(rows: RowRecord[], label: string) {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const employeeNumber = nullableText(row.employeeNumber);
    if (!employeeNumber) continue;

    const key = employeeNumber.toUpperCase();
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  for (const [employeeNumber, count] of counts.entries()) {
    if (count > 1) {
      warn(`${label}: ${employeeNumber} appears ${count} times.`);
    }
  }
}

function meaningfulSiteCode(value: unknown): string | null {
  const result = nullableText(value);
  if (!result) return null;

  if (['NON', 'N/A', 'NA'].includes(result.toUpperCase())) {
    return null;
  }

  return result;
}

async function ensureDepartment(name: string | null): Promise<string | null> {
  if (!name) return null;

  const found = await prisma.department.findUnique({ where: { name } });
  if (found) return found.id;

  const created = await prisma.department.create({
    data: {
      name,
      description: 'Created by HR workbook import',
    },
  });

  bump('lookupsCreated');
  return created.id;
}

async function ensureJobTitle(name: string | null): Promise<string | null> {
  if (!name) return null;

  const found = await prisma.jobTitle.findUnique({ where: { name } });
  if (found) return found.id;

  const created = await prisma.jobTitle.create({
    data: {
      name,
      description: 'Created by HR workbook import',
    },
  });

  bump('lookupsCreated');
  return created.id;
}

async function ensureEmploymentType(name: string | null): Promise<string | null> {
  if (!name) return null;

  const found = await prisma.employmentType.findUnique({ where: { name } });
  if (found) return found.id;

  const created = await prisma.employmentType.create({
    data: {
      name,
      description: 'Created by HR workbook import',
    },
  });

  bump('lookupsCreated');
  return created.id;
}

async function ensureSite(
  name: string | null,
  code: string | null,
): Promise<string | null> {
  if (!name) return null;

  const found = await prisma.site.findUnique({ where: { name } });

  if (found) {
    if (!found.code && code) {
      const codeOwner = await prisma.site.findUnique({ where: { code } });

      if (!codeOwner || codeOwner.id === found.id) {
        await prisma.site.update({
          where: { id: found.id },
          data: { code },
        });
      }
    }

    return found.id;
  }

  let safeCode = code;

  if (safeCode) {
    const codeOwner = await prisma.site.findUnique({ where: { code: safeCode } });

    if (codeOwner) {
      warn(
        `Site code "${safeCode}" already belongs to "${codeOwner.name}". ` +
          `Creating "${name}" without that code.`,
      );
      safeCode = null;
    }
  }

  const created = await prisma.site.create({
    data: {
      name,
      code: safeCode,
      description: 'Created by HR workbook import',
    },
  });

  bump('lookupsCreated');
  return created.id;
}

async function ensureContractType(name: string | null): Promise<string | null> {
  if (!name) return null;

  const found = await prisma.contractType.findUnique({ where: { name } });
  if (found) return found.id;

  const created = await prisma.contractType.create({
    data: {
      name,
      description: 'Created by HR workbook import',
    },
  });

  bump('lookupsCreated');
  return created.id;
}

async function ensureServiceConditionTemplate(
  name: string | null,
): Promise<string | null> {
  if (!name) return null;

  const found = await prisma.serviceConditionTemplate.findUnique({
    where: { name },
  });

  if (found) return found.id;

  const created = await prisma.serviceConditionTemplate.create({
    data: {
      name,
      description: 'Created by HR workbook import',
      isActive: true,
    },
  });

  bump('lookupsCreated');
  return created.id;
}

async function getEmployeeId(employeeNumber: string): Promise<string | null> {
  const employee = await prisma.employee.findUnique({
    where: { employeeNumber },
    select: { id: true },
  });

  return employee?.id || null;
}

async function importMasterEmployees(rows: RowRecord[]) {
  for (const row of rows) {
    const employeeNumber = nullableText(row.employeeNumber);
    const firstName = nullableText(row.firstName);
    const lastName = nullableText(row.lastName);

    if (!employeeNumber || !firstName || !lastName) {
      recordError(
        `Employee Master row skipped because employeeNumber/firstName/lastName is missing: ` +
          `${employeeNumber || '<blank>'}`,
      );
      continue;
    }

    try {
      const departmentName = meaningfulName(row.departmentName);
      const jobTitleName = meaningfulName(row.jobTitleName);
      const siteName = meaningfulName(row.siteName);
      const employmentTypeName = meaningfulName(row.employmentTypeName);

      const [departmentId, jobTitleId, siteId, employmentTypeId] =
        await Promise.all([
          ensureDepartment(departmentName),
          ensureJobTitle(jobTitleName),
          ensureSite(siteName, meaningfulSiteCode(row.siteCode)),
          ensureEmploymentType(employmentTypeName),
        ]);

      const data = {
        firstName,
        middleName: nullableText(row.middleName),
        lastName,
        gender: nullableText(row.gender),
        dateOfBirth: dateValue(row.dateOfBirth),
        nrcNumber: nullableText(row.nrcNumber),
        email: nullableText(row.email),
        phone: nullableText(row.phone),
        departmentId,
        jobTitleId,
        siteId,
        siteName,
        employmentTypeId,
        startDate: dateValue(row.startDate),
        endDate: dateValue(row.endDate),
        status: employeeStatus(row.status, 'DRAFT'),
        payBasis: payBasis(row.payBasis),
        hourlyRate: numberValue(row.hourlyRate),
        dailyRate: numberValue(row.dailyRate),
        monthlyRate: numberValue(row.monthlyRate),
        rateEffectiveFrom: dateValue(row.rateEffectiveFrom),
        bankName: nullableText(row.bankName),
        bankBranch: nullableText(row.bankBranch),
        bankAccountNumber: nullableText(row.bankAccountNumber),
        bankAccountName: nullableText(row.bankAccountName),
        bankSortCode: nullableText(row.bankSortCode),
        bankDetailsStatus:
          nullableText(row.bankDetailsStatus) || 'PENDING_VALIDATION',
      };

      await prisma.employee.upsert({
        where: { employeeNumber },
        create: {
          employeeNumber,
          ...(data as any),
        },
        update: data as any,
      });

      bump('employeesProcessed');
    } catch (error) {
      recordError(
        `Employee ${employeeNumber}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

async function linkSupervisors(rows: RowRecord[]) {
  for (const row of rows) {
    const employeeNumber = nullableText(row.employeeNumber);
    const supervisorEmployeeNumber = nullableText(row.supervisorEmployeeNumber);

    if (!employeeNumber || !supervisorEmployeeNumber) continue;

    if (
      employeeNumber.toUpperCase() === supervisorEmployeeNumber.toUpperCase()
    ) {
      warn(`${employeeNumber}: supervisor points to the same employee; skipped.`);
      continue;
    }

    const [employee, supervisor] = await Promise.all([
      prisma.employee.findUnique({
        where: { employeeNumber },
        select: { id: true },
      }),
      prisma.employee.findUnique({
        where: { employeeNumber: supervisorEmployeeNumber },
        select: { id: true },
      }),
    ]);

    if (!employee) {
      warn(`${employeeNumber}: employee not found while linking supervisor.`);
      continue;
    }

    if (!supervisor) {
      warn(
        `${employeeNumber}: supervisor ${supervisorEmployeeNumber} was not found.`,
      );
      continue;
    }

    await prisma.employee.update({
      where: { id: employee.id },
      data: { supervisorId: supervisor.id },
    });

    bump('supervisorsLinked');
  }
}

async function createHistoricalPlaceholders(
  orphanNumbers: string[],
  bankByEmployee: Map<string, RowRecord>,
) {
  for (const employeeNumber of orphanNumbers) {
    const existing = await prisma.employee.findUnique({
      where: { employeeNumber },
      select: { id: true },
    });

    if (existing) {
      bump('historicalAlreadyInDatabase');
      continue;
    }

    const bankRow = bankByEmployee.get(employeeNumber.toUpperCase());
    const firstName =
      nullableText(bankRow?.accountName) || 'Historical';
    const lastName =
      nullableText(bankRow?.lastName) || 'Record';

    await prisma.employee.create({
      data: {
        employeeNumber,
        firstName,
        lastName,
        status: 'ARCHIVED',
        bankDetailsStatus: 'PENDING_VALIDATION',
      } as any,
    });

    report.historicalPlaceholders.push(employeeNumber);
    bump('historicalPlaceholdersCreated');
  }
}

async function importStatutory(rows: RowRecord[]) {
  for (const row of rows) {
    const employeeNumber = nullableText(row.employeeNumber);
    if (!employeeNumber) continue;

    const employeeId = await getEmployeeId(employeeNumber);

    if (!employeeId) {
      recordError(`${employeeNumber}: employee missing for statutory details.`);
      continue;
    }

    try {
      const data = {
        tpin: nullableText(row.tpin),
        napsaNumber: nullableText(row.napsaNumber),
        nhimaNumber: nullableText(row.nhimaNumber),
        payeApplicable: boolValue(row.payeApplicable, true),
        napsaApplicable: boolValue(row.napsaApplicable, true),
        nhimaApplicable: boolValue(row.nhimaApplicable, true),
      };

      await prisma.employeeStatutoryDetails.upsert({
        where: { employeeId },
        create: {
          employeeId,
          ...data,
        },
        update: data,
      });

      bump('statutoryProcessed');
    } catch (error) {
      recordError(
        `${employeeNumber} statutory: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

async function importBankAccounts(rows: RowRecord[]) {
  for (const row of rows) {
    const employeeNumber = nullableText(row.employeeNumber);
    if (!employeeNumber) continue;

    const employeeId = await getEmployeeId(employeeNumber);

    if (!employeeId) {
      recordError(`${employeeNumber}: employee missing for bank account.`);
      continue;
    }

    const bankName = nullableText(row.bankName);
    const accountNumber = nullableText(row.accountNumber);
    const accountName = combineAccountName(row.accountName, row.lastName);

    if (!bankName || !accountNumber || !accountName) {
      warn(
        `${employeeNumber}: bank row skipped because bankName/accountNumber/accountName is incomplete.`,
      );
      continue;
    }

    try {
      const isPrimary = boolValue(row.isPrimary, false);

      if (isPrimary) {
        await prisma.employeeBankAccount.updateMany({
          where: {
            employeeId,
            accountNumber: { not: accountNumber },
          },
          data: { isPrimary: false },
        });
      }

      const existing = await prisma.employeeBankAccount.findFirst({
        where: {
          employeeId,
          accountNumber,
        },
      });

      const data = {
        bankName,
        branchName: nullableText(row.branchName),
        accountNumber,
        accountName,
        isPrimary,
        approvalStatus: approvalStatus(row.approvalStatus),
        effectiveFrom: dateValue(row.effectiveFrom),
      };

      if (existing) {
        await prisma.employeeBankAccount.update({
          where: { id: existing.id },
          data: data as any,
        });
      } else {
        await prisma.employeeBankAccount.create({
          data: {
            employeeId,
            ...(data as any),
          },
        });
      }

      bump('bankAccountsProcessed');
    } catch (error) {
      recordError(
        `${employeeNumber} bank account: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

function contractNumberFor(
  row: RowRecord,
  employeeNumber: string,
  duplicateRealContractNumbers: Set<string>,
): string {
  const raw = nullableText(row.contractNumber);

  if (
    !raw ||
    ['N/A', 'NA'].includes(raw.toUpperCase()) ||
    duplicateRealContractNumbers.has(raw.toUpperCase())
  ) {
    return `HRIMP-${employeeNumber}`;
  }

  return raw;
}

async function importContracts(
  rows: RowRecord[],
  masterByEmployee: Map<string, RowRecord>,
) {
  const realContractCounts = new Map<string, number>();

  for (const row of rows) {
    const raw = nullableText(row.contractNumber);
    if (!raw || ['N/A', 'NA'].includes(raw.toUpperCase())) continue;

    const key = raw.toUpperCase();
    realContractCounts.set(key, (realContractCounts.get(key) || 0) + 1);
  }

  const duplicateRealContractNumbers = new Set(
    [...realContractCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([key]) => key),
  );

  for (const row of rows) {
    const employeeNumber = nullableText(row.employeeNumber);
    if (!employeeNumber) continue;

    const employeeId = await getEmployeeId(employeeNumber);

    if (!employeeId) {
      recordError(`${employeeNumber}: employee missing for contract.`);
      continue;
    }

    const startDate =
      dateValue(row.startDate) ||
      dateValue(masterByEmployee.get(employeeNumber.toUpperCase())?.startDate);

    if (!startDate) {
      warn(`${employeeNumber}: contract skipped because startDate is missing.`);
      continue;
    }

    try {
      const contractTypeId = await ensureContractType(
        meaningfulName(row.contractTypeName),
      );

      const contractNumber = contractNumberFor(
        row,
        employeeNumber,
        duplicateRealContractNumbers,
      );

      const data = {
        employeeId,
        contractTypeId,
        startDate,
        endDate: dateValue(row.endDate),
        probationEnd: dateValue(row.probationEnd),
        noticePeriod: nullableText(row.noticePeriod),
        status: normalizedText(row.status) || 'ACTIVE',
      };

      await prisma.employeeContract.upsert({
        where: { contractNumber },
        create: {
          contractNumber,
          ...(data as any),
        },
        update: data as any,
      });

      bump('contractsProcessed');
    } catch (error) {
      recordError(
        `${employeeNumber} contract: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

async function importServiceConditions(
  rows: RowRecord[],
  masterByEmployee: Map<string, RowRecord>,
) {
  for (const row of rows) {
    const employeeNumber = nullableText(row.employeeNumber);
    if (!employeeNumber) continue;

    const employeeId = await getEmployeeId(employeeNumber);

    if (!employeeId) {
      recordError(
        `${employeeNumber}: employee missing for service conditions.`,
      );
      continue;
    }

    const templateName = meaningfulName(row.templateName);
    const effectiveFrom =
      dateValue(row.effectiveFrom) ||
      dateValue(masterByEmployee.get(employeeNumber.toUpperCase())?.startDate);

    if (!templateName || !effectiveFrom) {
      warn(
        `${employeeNumber}: service condition skipped because templateName/effectiveFrom is missing.`,
      );
      continue;
    }

    try {
      const templateId = await ensureServiceConditionTemplate(templateName);
      if (!templateId) continue;

      const existing = await prisma.employeeServiceCondition.findFirst({
        where: {
          employeeId,
          templateId,
          effectiveFrom,
        },
      });

      const data = {
        employeeId,
        templateId,
        effectiveFrom,
        effectiveTo: dateValue(row.effectiveTo),
        status: approvalStatus(row.status),
        assignedBy: nullableText(row.assignedBy),
        approvedBy: nullableText(row.approvedBy),
        approvedAt: dateValue(row.approvedAt),
      };

      if (existing) {
        await prisma.employeeServiceCondition.update({
          where: { id: existing.id },
          data: data as any,
        });
      } else {
        await prisma.employeeServiceCondition.create({
          data: data as any,
        });
      }

      bump('serviceConditionsProcessed');
    } catch (error) {
      recordError(
        `${employeeNumber} service condition: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

async function importPortalAccounts(
  rows: RowRecord[],
  masterByEmployee: Map<string, RowRecord>,
  historicalNumbers: Set<string>,
) {
  if (!DEFAULT_PIN) {
    throw new Error(
      'EMPLOYEE_IMPORT_DEFAULT_PIN is required when importing portal accounts.',
    );
  }

  if (DEFAULT_PIN.length < 4) {
    throw new Error(
      'EMPLOYEE_IMPORT_DEFAULT_PIN must contain at least 4 characters.',
    );
  }

  for (const row of rows) {
    const employeeNumber = nullableText(row.employeeNumber);
    if (!employeeNumber) continue;

    if (!boolValue(row.createPortalAccount, true)) {
      bump('portalAccountsSkipped');
      continue;
    }

    const employee = await prisma.employee.findUnique({
      where: { employeeNumber },
      include: {
        department: true,
        jobTitle: true,
      },
    });

    if (!employee) {
      recordError(`${employeeNumber}: employee missing for portal account.`);
      continue;
    }

    const masterRow = masterByEmployee.get(employeeNumber.toUpperCase());

    const accessSource: RowRecord = masterRow || {
      departmentName: employee.department?.name,
      jobTitleName: employee.jobTitle?.name,
      status: employee.status,
    };

    const access = derivePortalAccess(accessSource, row);

    const historical = historicalNumbers.has(employeeNumber.toUpperCase());
    const sourceActive = boolValue(row.isActive, true);

    const isActive =
      sourceActive &&
      !historical &&
      !isDismissedStatus(accessSource.status || employee.status);

    try {
      const existing = await prisma.employeePortalAccount.findUnique({
        where: { employeeNumber },
      });

      if (!existing) {
        const pinHash = await bcrypt.hash(DEFAULT_PIN, 10);

        await prisma.employeePortalAccount.create({
          data: {
            employeeId: employee.id,
            employeeNumber,
            pinHash,
            mustChangePin: true,
            isActive,
            accessProfile: access.accessProfile,
            allowedModules: access.allowedModules,
            failedAttempts: 0,
            lockedUntil: null,
          },
        });

        bump('portalAccountsCreated');
      } else {
        const updateData: Record<string, unknown> = {
          employeeId: employee.id,
          isActive,
          accessProfile: access.accessProfile,
          allowedModules: access.allowedModules,
        };

        if (RESET_PINS) {
          updateData.pinHash = await bcrypt.hash(DEFAULT_PIN, 10);
          updateData.mustChangePin = true;
          updateData.failedAttempts = 0;
          updateData.lockedUntil = null;
        }

        await prisma.employeePortalAccount.update({
          where: { id: existing.id },
          data: updateData as any,
        });

        bump('portalAccountsUpdated');
      }

      if (historical && sourceActive) {
        warn(
          `${employeeNumber}: portal row requested active access, but the employee ` +
            `is a historical placeholder, so the portal account was imported inactive.`,
        );
      }

      bump(`portalProfile_${access.accessProfile}`);
    } catch (error) {
      recordError(
        `${employeeNumber} portal account: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

function collectHistoricalOrphans(
  masterRows: RowRecord[],
  dependentSheets: RowRecord[][],
): string[] {
  const masterNumbers = new Set(
    masterRows
      .map((row) => nullableText(row.employeeNumber))
      .filter((value): value is string => Boolean(value))
      .map((value) => value.toUpperCase()),
  );

  const dependentNumbers = new Set<string>();

  for (const rows of dependentSheets) {
    for (const row of rows) {
      const employeeNumber = nullableText(row.employeeNumber);
      if (employeeNumber) {
        dependentNumbers.add(employeeNumber.toUpperCase());
      }
    }
  }

  return [...dependentNumbers]
    .filter((employeeNumber) => !masterNumbers.has(employeeNumber))
    .sort();
}

function validateWorkbook(
  employeeRows: RowRecord[],
  statutoryRows: RowRecord[],
  bankRows: RowRecord[],
  contractRows: RowRecord[],
  serviceRows: RowRecord[],
  portalRows: RowRecord[],
  historicalOrphans: string[],
) {
  duplicateEmployeeNumbers(employeeRows, 'Employee Master');

  const requiredEmployeeFailures = employeeRows.filter(
    (row) =>
      !nullableText(row.employeeNumber) ||
      !nullableText(row.firstName) ||
      !nullableText(row.lastName),
  );

  if (requiredEmployeeFailures.length) {
    warn(
      `${requiredEmployeeFailures.length} Employee Master rows are missing an employee number, first name, or last name.`,
    );
  }

  if (historicalOrphans.length) {
    warn(
      `${historicalOrphans.length} employee numbers exist only in dependent sheets. ` +
        `They will be retained as ARCHIVED historical placeholders until HR completes their master data.`,
    );
  }

  report.counts.employeeMasterRows = employeeRows.length;
  report.counts.statutoryRows = statutoryRows.length;
  report.counts.bankRows = bankRows.length;
  report.counts.contractRows = contractRows.length;
  report.counts.serviceConditionRows = serviceRows.length;
  report.counts.portalRows = portalRows.length;
  report.counts.historicalOrphans = historicalOrphans.length;
}

function writeReport() {
  const reportDirectory = path.resolve(process.cwd(), 'import-reports');
  mkdirSync(reportDirectory, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(
    reportDirectory,
    `hr-import-${report.mode.toLowerCase()}-${stamp}.json`,
  );

  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`Import report: ${reportPath}`);
}

async function main() {
  console.log(`Southin PeoplePay HR import`);
  console.log(`Mode: ${COMMIT ? 'COMMIT' : 'DRY RUN'}`);
  console.log(`Workbook: ${SOURCE_FILE}`);
  console.log(`Temporary PIN policy: one standard PIN for all portal accounts`);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(SOURCE_FILE);

  const employeeRows = sheetRows(workbook, SHEETS.employee);
  const statutoryRows = sheetRows(workbook, SHEETS.statutory);
  const bankRows = sheetRows(workbook, SHEETS.bank);
  const contractRows = sheetRows(workbook, SHEETS.contracts);
  const serviceRows = sheetRows(workbook, SHEETS.service);
  const sourcePortalRows = sheetRows(workbook, SHEETS.portal);
  const portalRows = buildPortalRowsForAllEmployees(
    employeeRows,
    sourcePortalRows,
  );

  const masterByEmployee = indexByEmployeeNumber(employeeRows);
  const bankByEmployee = indexByEmployeeNumber(bankRows);

  const historicalOrphans = collectHistoricalOrphans(employeeRows, [
    statutoryRows,
    bankRows,
    contractRows,
    serviceRows,
    portalRows,
  ]);

  validateWorkbook(
    employeeRows,
    statutoryRows,
    bankRows,
    contractRows,
    serviceRows,
    portalRows,
    historicalOrphans,
  );

  if (!COMMIT) {
    console.log('');
    console.log('Dry run complete. No database records were changed.');
    console.log(
      'Re-run with --commit after reviewing the generated report. ' +
        'Use --reset-pins if existing portal accounts must also receive the standard temporary PIN.',
    );

    report.historicalPlaceholders = historicalOrphans;
    return;
  }

  console.log('');
  console.log('1/7 Importing Employee Master...');
  await importMasterEmployees(employeeRows);

  console.log('2/7 Linking supervisors...');
  await linkSupervisors(employeeRows);

  console.log('3/7 Creating historical placeholder employees...');
  await createHistoricalPlaceholders(historicalOrphans, bankByEmployee);

  console.log('4/7 Importing statutory details...');
  await importStatutory(statutoryRows);

  console.log('5/7 Importing bank accounts and contracts...');
  await importBankAccounts(bankRows);
  await importContracts(contractRows, masterByEmployee);

  console.log('6/7 Importing service conditions...');
  await importServiceConditions(serviceRows, masterByEmployee);

  console.log('7/7 Importing portal accounts...');
  await importPortalAccounts(
    portalRows,
    masterByEmployee,
    new Set(historicalOrphans.map((value) => value.toUpperCase())),
  );

  console.log('');
  console.log('HR import finished.');
}

main()
  .catch((error) => {
    recordError(error instanceof Error ? error.stack || error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      writeReport();
    } finally {
      await prisma.$disconnect();
    }
  });