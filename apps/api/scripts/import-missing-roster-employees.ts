import {
  EmployeeStatus,
  PrismaClient,
} from '@prisma/client';

import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

function clean(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'text' in value
  ) {
    return String((value as any).text ?? '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return String(value)
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeHeader(value: unknown): string {
  return clean(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function nullableText(value: unknown): string | null {
  const result = clean(value);

  if (!result) {
    return null;
  }

  if (
    ['UNKNOWN', 'N/A', 'NA', 'NULL', '-'].includes(
      result.toUpperCase(),
    )
  ) {
    return null;
  }

  return result;
}

function dateValue(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : value;
  }

  return null;
}

function getArg(name: string): string | null {
  const prefix = `--${name}=`;

  const found = process.argv.find((arg) =>
    arg.startsWith(prefix),
  );

  return found
    ? found.slice(prefix.length)
    : null;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function splitName(fullName: string) {
  const parts = fullName
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

  if (parts.length < 2) {
    throw new Error(
      `Cannot reliably split employee name: "${fullName}"`,
    );
  }

  const firstName = parts[0];
  const lastName = parts[parts.length - 1];

  const middleName =
    parts.length > 2
      ? parts.slice(1, -1).join(' ')
      : null;

  return {
    firstName,
    middleName,
    lastName,
  };
}

async function main() {
  const apply = hasFlag('apply');

  const fileArg = getArg('file');

  if (!fileArg) {
    throw new Error(
      'Workbook is required using --file="..."',
    );
  }

  const filePath = path.resolve(
    process.cwd(),
    fileArg,
  );

  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Workbook not found: ${filePath}`,
    );
  }

  const workbook = new ExcelJS.Workbook();

  await workbook.xlsx.readFile(filePath);

  const worksheet =
    workbook.getWorksheet('ExportData') ??
    workbook.worksheets[0];

  if (!worksheet) {
    throw new Error(
      'ExportData worksheet was not found.',
    );
  }

  let headerRowNumber = 0;

  const columns: Record<string, number> = {};

  for (
    let rowNumber = 1;
    rowNumber <= Math.min(30, worksheet.rowCount);
    rowNumber++
  ) {
    const row = worksheet.getRow(rowNumber);

    const discovered: Record<string, number> = {};

    row.eachCell((cell, columnNumber) => {
      const header =
        normalizeHeader(cell.value);

      if (header) {
        discovered[header] = columnNumber;
      }
    });

    if (
      discovered.EMPNO &&
      discovered.FULLNAME
    ) {
      headerRowNumber = rowNumber;

      Object.assign(
        columns,
        discovered,
      );

      break;
    }
  }

  if (!headerRowNumber) {
    throw new Error(
      'Could not locate EMPNO/FULLNAME header row.',
    );
  }

  const rosterRows: Array<{
    employeeNumber: string;
    fullName: string;
    nrcNumber: string | null;
    startDate: Date | null;
    division: string | null;
    department: string | null;
    jobTitle: string | null;
  }> = [];

  for (
    let rowNumber = headerRowNumber + 1;
    rowNumber <= worksheet.rowCount;
    rowNumber++
  ) {
    const row = worksheet.getRow(rowNumber);

    const employeeNumber = clean(
      row.getCell(columns.EMPNO).value,
    ).toUpperCase();

    const fullName = clean(
      row.getCell(columns.FULLNAME).value,
    );

    if (
      !employeeNumber ||
      !fullName
    ) {
      continue;
    }

    rosterRows.push({
      employeeNumber,
      fullName,

      nrcNumber:
        columns.NRCNO
          ? nullableText(
              row.getCell(columns.NRCNO).value,
            )
          : null,

      startDate:
        columns.DATEOFENGAGEMENT
          ? dateValue(
              row.getCell(
                columns.DATEOFENGAGEMENT,
              ).value,
            )
          : null,

      division:
        columns.DIVISION
          ? nullableText(
              row.getCell(columns.DIVISION).value,
            )
          : null,

      department:
        columns.DEPARTMENT
          ? nullableText(
              row.getCell(columns.DEPARTMENT).value,
            )
          : null,

      jobTitle:
        columns.JOBTITLE
          ? nullableText(
              row.getCell(columns.JOBTITLE).value,
            )
          : null,
    });
  }

  const employeeNumbers =
    rosterRows.map(
      (row) => row.employeeNumber,
    );

  const existing =
    await prisma.employee.findMany({
      where: {
        employeeNumber: {
          in: employeeNumbers,
        },
      },

      select: {
        employeeNumber: true,
      },
    });

  const existingNumbers = new Set(
    existing.map((employee) =>
      employee.employeeNumber.toUpperCase(),
    ),
  );

  const missingRows =
    rosterRows.filter(
      (row) =>
        !existingNumbers.has(
          row.employeeNumber,
        ),
    );

  const preview = missingRows.map(
    (row) => {
      const name =
        splitName(row.fullName);

      return {
        employeeNumber:
          row.employeeNumber,

        firstName:
          name.firstName,

        middleName:
          name.middleName ?? '',

        lastName:
          name.lastName,

        nrcNumber:
          row.nrcNumber ?? '',

        startDate:
          row.startDate
            ? row.startDate
                .toISOString()
                .slice(0, 10)
            : '',

        department:
          row.department ?? '',

        jobTitle:
          row.jobTitle ?? '',

        division:
          row.division ?? '',
      };
    },
  );

  console.log('');
  console.log(
    apply
      ? 'MISSING ROSTER EMPLOYEE IMPORT - APPLY MODE'
      : 'MISSING ROSTER EMPLOYEE IMPORT - PREVIEW ONLY',
  );

  console.log('');

  console.table({
    rosterEmployees:
      rosterRows.length,

    existingEmployees:
      existing.length,

    employeesToCreate:
      missingRows.length,
  });

  console.log('');

  console.table(preview);

  if (!apply) {
    console.log('');
    console.log(
      'PREVIEW ONLY - no database records were changed.',
    );

    return;
  }

  if (missingRows.length === 0) {
    console.log(
      'No missing employees need to be created.',
    );

    return;
  }

  const result =
    await prisma.$transaction(
      async (tx) => {
        let created = 0;

        for (
          const row of missingRows
        ) {
          const {
            firstName,
            middleName,
            lastName,
          } = splitName(
            row.fullName,
          );

          const existingEmployee =
            await tx.employee.findUnique({
              where: {
                employeeNumber:
                  row.employeeNumber,
              },
            });

          if (existingEmployee) {
            continue;
          }

          await tx.employee.create({
            data: {
              employeeNumber:
                row.employeeNumber,

              firstName,

              middleName,

              lastName,

              nrcNumber:
                row.nrcNumber,

              startDate:
                row.startDate,

              status:
                EmployeeStatus.ACTIVE,

              bankDetailsStatus:
                'PENDING_VALIDATION',
            },
          });

          created++;
        }

        return {
          created,
        };
      },
      {
        maxWait: 10000,
        timeout: 60000,
      },
    );

  console.log('');
  console.log(
    'EMPLOYEE IMPORT COMPLETE',
  );

  console.table({
    requested:
      missingRows.length,

    created:
      result.created,
  });
}

main()
  .catch((error) => {
    console.error('');
    console.error(
      'Missing roster employee import failed:',
    );

    console.error(error);

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });